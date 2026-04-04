// Copyright 2026 Daniel Smith
// Licensed under the Apache License, Version 2.0
// See https://www.apache.org/licenses/LICENSE-2.0

//! Recursive descent expression parser for the Alap grammar.
//!
//! ```text
//! query   = segment (',' segment)*
//! segment = term (op term)* refiner*
//! op      = '+' | '|' | '-'
//! term    = '(' segment ')' | atom
//! atom    = ITEM_ID | CLASS | DOM_REF | REGEX | PROTOCOL
//! refiner = '*' name (':' arg)* '*'
//! ```

use std::collections::HashSet;
use std::sync::LazyLock;
use std::time::Instant;

use regex::Regex;

use crate::types::{Config, Token};
use crate::validate::validate_regex;

// Limits (mirrors src/constants.ts)
const MAX_DEPTH: usize = 32;
const MAX_TOKENS: usize = 1024;
const MAX_MACRO_EXPANSIONS: usize = 10;
const MAX_REGEX_QUERIES: usize = 5;
const MAX_SEARCH_RESULTS: usize = 100;
const REGEX_TIMEOUT_MS: u128 = 20;
const MAX_REFINERS: usize = 10;

static MACRO_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"@(\w*)").expect("MACRO_RE is a valid regex"));

/// Resolves Alap expressions against a [`Config`].
///
/// An `ExpressionParser` is **not** safe for concurrent use.  The `&mut self`
/// receiver on [`query`](Self::query) enforces this at compile time.
pub struct ExpressionParser<'a> {
    config: &'a Config,
    depth: usize,
    regex_count: usize,
}

impl<'a> ExpressionParser<'a> {
    #[must_use]
    pub fn new(config: &'a Config) -> Self {
        Self {
            config,
            depth: 0,
            regex_count: 0,
        }
    }

    /// Parses an expression and returns matching item IDs (deduplicated).
    #[must_use]
    pub fn query(&mut self, expression: &str, anchor_id: &str) -> Vec<String> {
        let expr = expression.trim();
        if expr.is_empty() || self.config.all_links.is_empty() {
            return Vec::new();
        }

        let expanded = self.expand_macros(expr, anchor_id);
        if expanded.is_empty() {
            return Vec::new();
        }

        let tokens = tokenize(&expanded);
        if tokens.is_empty() || tokens.len() > MAX_TOKENS {
            return Vec::new();
        }

        self.depth = 0;
        self.regex_count = 0;
        let mut pos = 0;
        let ids = self.parse_query(&tokens, &mut pos);
        dedupe(&ids)
    }

    /// Returns all item IDs carrying the given tag.
    #[must_use]
    pub fn search_by_class(&self, class_name: &str) -> Vec<String> {
        if self.config.all_links.is_empty() {
            return Vec::new();
        }
        self.config
            .all_links
            .iter()
            .filter(|(_, link)| link.tags.iter().any(|t| t == class_name))
            .map(|(id, _)| id.clone())
            .collect()
    }

    /// Searches `allLinks` using a named pattern from `config.searchPatterns`.
    #[must_use]
    pub fn search_by_regex(&mut self, pattern_key: &str, field_opts: &str) -> Vec<String> {
        self.regex_count += 1;
        if self.regex_count > MAX_REGEX_QUERIES {
            return Vec::new();
        }

        let entry = match self.config.search_patterns.get(pattern_key) {
            Some(e) => e,
            None => return Vec::new(),
        };

        let (pattern_str, opts) = match entry {
            serde_json::Value::String(s) => (s.as_str(), None),
            serde_json::Value::Object(map) => {
                let pat = map
                    .get("pattern")
                    .and_then(|v| v.as_str())
                    .unwrap_or_default();
                let options = map
                    .get("options")
                    .and_then(|v| v.as_object());
                (pat, options)
            }
            _ => return Vec::new(),
        };

        let check = validate_regex(pattern_str);
        if !check.safe {
            return Vec::new();
        }

        let re = match Regex::new(&format!("(?i){pattern_str}")) {
            Ok(r) => r,
            Err(_) => return Vec::new(),
        };

        // Field options
        let fo = if field_opts.is_empty() {
            opts.and_then(|o| o.get("fields"))
                .and_then(|v| v.as_str())
                .unwrap_or("a")
        } else {
            field_opts
        };
        let fields = parse_field_codes(fo);

        // Limit
        let limit = opts
            .and_then(|o| o.get("limit"))
            .and_then(|v| v.as_f64())
            .map_or(MAX_SEARCH_RESULTS, |l| (l as usize).min(MAX_SEARCH_RESULTS));

        // Age filter
        let max_age = opts
            .and_then(|o| o.get("age"))
            .and_then(|v| v.as_str())
            .map_or(0.0, parse_age);

        let now_ms = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as f64;
        let start = Instant::now();

        struct Hit {
            id: String,
            created_at: f64,
        }
        let mut results: Vec<Hit> = Vec::new();

        for (id, link) in &self.config.all_links {
            if start.elapsed().as_millis() > REGEX_TIMEOUT_MS {
                break;
            }
            if max_age > 0.0 {
                let ts = to_timestamp(link.created_at.as_ref());
                if ts == 0.0 || (now_ms - ts) > max_age {
                    continue;
                }
            }
            if matches_fields(&re, id, link, &fields) {
                let ts = to_timestamp(link.created_at.as_ref());
                results.push(Hit {
                    id: id.clone(),
                    created_at: ts,
                });
                if results.len() >= MAX_SEARCH_RESULTS {
                    break;
                }
            }
        }

        // Sort
        if let Some(sort) = opts.and_then(|o| o.get("sort")).and_then(|v| v.as_str()) {
            match sort {
                "alpha" => results.sort_by(|a, b| a.id.cmp(&b.id)),
                "newest" => results.sort_by(|a, b| b.created_at.total_cmp(&a.created_at)),
                "oldest" => results.sort_by(|a, b| a.created_at.total_cmp(&b.created_at)),
                _ => {}
            }
        }

        results.truncate(limit);
        results.into_iter().map(|h| h.id).collect()
    }

    // ---- Protocol resolution ----

    fn resolve_protocol(&self, value: &str) -> Vec<String> {
        let segments: Vec<&str> = value.split('|').collect();
        let protocol_name = segments[0];
        let args: Vec<String> = segments[1..].iter().map(|s| s.to_string()).collect();

        let protocols = match &self.config.protocols {
            Some(p) => p,
            None => {
                eprintln!("Protocol \"{protocol_name}\" not found in config.protocols");
                return Vec::new();
            }
        };

        let protocol = match protocols.get(protocol_name) {
            Some(p) => p,
            None => {
                eprintln!("Protocol \"{protocol_name}\" not found in config.protocols");
                return Vec::new();
            }
        };

        let mut result = Vec::new();
        for (id, link) in &self.config.all_links {
            let handler = protocol.handler;
            let matched = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
                handler(&args, link, id)
            }));
            match matched {
                Ok(true) => result.push(id.clone()),
                Ok(false) => {}
                Err(_) => {
                    eprintln!("Protocol \"{protocol_name}\" handler panicked for item \"{id}\" — skipping");
                }
            }
        }
        result
    }

    // ---- Refiner application ----

    fn apply_refiners(&self, ids: &[String], refiners: &[Token]) -> Vec<String> {
        if refiners.is_empty() {
            return ids.to_vec();
        }

        // Resolve IDs to (id, &Link) pairs
        let mut links: Vec<(&str, &crate::types::Link)> = ids
            .iter()
            .filter_map(|id| {
                self.config.all_links.get(id).map(|link| (id.as_str(), link))
            })
            .collect();

        for token in refiners {
            let value = match token {
                Token::Refiner(v) => v,
                _ => continue,
            };
            let parts: Vec<&str> = value.split(':').collect();
            let name = parts[0];
            let args: Vec<&str> = if parts.len() > 1 { parts[1..].to_vec() } else { Vec::new() };

            match name {
                "sort" => {
                    let field = args.first().copied().unwrap_or("label");
                    links.sort_by(|a, b| {
                        let a_val = get_link_field(a.0, a.1, field);
                        let b_val = get_link_field(b.0, b.1, field);
                        a_val.cmp(&b_val)
                    });
                }
                "reverse" => {
                    links.reverse();
                }
                "limit" => {
                    if let Some(n_str) = args.first() {
                        if let Ok(n) = n_str.parse::<usize>() {
                            links.truncate(n);
                        }
                    }
                }
                "skip" => {
                    if let Some(n_str) = args.first() {
                        if let Ok(n) = n_str.parse::<usize>() {
                            if n < links.len() {
                                links = links[n..].to_vec();
                            } else {
                                links.clear();
                            }
                        }
                    }
                }
                "shuffle" => {
                    // Simple Fisher-Yates using a basic LCG (no rand crate)
                    let mut seed: u64 = links.len() as u64;
                    // Mix in a bit of entropy from the first id hash
                    if let Some((id, _)) = links.first() {
                        for b in id.bytes() {
                            seed = seed.wrapping_mul(31).wrapping_add(b as u64);
                        }
                    }
                    for i in (1..links.len()).rev() {
                        seed = seed.wrapping_mul(6364136223846793005).wrapping_add(1442695040888963407);
                        let j = (seed >> 33) as usize % (i + 1);
                        links.swap(i, j);
                    }
                }
                "unique" => {
                    let field = args.first().copied().unwrap_or("url");
                    let mut seen = HashSet::new();
                    links.retain(|(id, link)| {
                        let val = get_link_field(id, link, field);
                        seen.insert(val)
                    });
                }
                _ => {
                    eprintln!("Unknown refiner \"{name}\" — skipping");
                }
            }
        }

        links.iter().map(|(id, _)| id.to_string()).collect()
    }

    // ---- Macro expansion ----

    fn expand_macros(&self, expr: &str, anchor_id: &str) -> String {
        let mut result = expr.to_owned();
        for _ in 0..MAX_MACRO_EXPANSIONS {
            if !result.contains('@') {
                break;
            }
            let before = result.clone();
            result = MACRO_RE
                .replace_all(&before, |caps: &regex::Captures| {
                    let name = &caps[1];
                    let name = if name.is_empty() { anchor_id } else { name };
                    if name.is_empty() {
                        return String::new();
                    }
                    self.config
                        .macros
                        .get(name)
                        .filter(|m| !m.link_items.is_empty())
                        .map_or(String::new(), |m| m.link_items.clone())
                })
                .into_owned();
            if result == before {
                break;
            }
        }
        result
    }

    // ---- Recursive descent parser ----

    fn parse_query(&mut self, tokens: &[Token], pos: &mut usize) -> Vec<String> {
        let mut result = self.parse_segment(tokens, pos);

        while *pos < tokens.len() && tokens[*pos] == Token::Comma {
            *pos += 1; // skip comma
            if *pos >= tokens.len() {
                break;
            }
            let next = self.parse_segment(tokens, pos);
            result.extend(next);
        }

        result
    }

    fn parse_segment(&mut self, tokens: &[Token], pos: &mut usize) -> Vec<String> {
        if *pos >= tokens.len() {
            return Vec::new();
        }

        let start_pos = *pos;
        let mut result = self.parse_term(tokens, pos);
        let mut has_initial_term = *pos > start_pos;

        while *pos < tokens.len() {
            let op = match &tokens[*pos] {
                Token::Plus | Token::Pipe | Token::Minus => tokens[*pos].clone(),
                _ => break,
            };

            *pos += 1; // skip operator
            if *pos >= tokens.len() {
                break;
            }

            let right = self.parse_term(tokens, pos);

            if !has_initial_term {
                result = right;
                has_initial_term = true;
            } else {
                match op {
                    Token::Plus => {
                        let right_set: HashSet<&str> =
                            right.iter().map(String::as_str).collect();
                        result.retain(|id| right_set.contains(id.as_str()));
                    }
                    Token::Pipe => {
                        let seen: HashSet<String> =
                            result.iter().cloned().collect();
                        for id in right {
                            if !seen.contains(&id) {
                                result.push(id);
                            }
                        }
                    }
                    Token::Minus => {
                        let right_set: HashSet<&str> =
                            right.iter().map(String::as_str).collect();
                        result.retain(|id| !right_set.contains(id.as_str()));
                    }
                    _ => unreachable!(),
                }
            }
        }

        // Collect trailing refiners
        let mut refiners: Vec<Token> = Vec::new();
        while *pos < tokens.len() {
            if let Token::Refiner(_) = &tokens[*pos] {
                if refiners.len() >= MAX_REFINERS {
                    eprintln!("Refiner limit exceeded (max {MAX_REFINERS} per segment). Skipping remaining refiners.");
                    *pos += 1;
                    continue;
                }
                refiners.push(tokens[*pos].clone());
                *pos += 1;
            } else {
                break;
            }
        }

        if !refiners.is_empty() {
            result = self.apply_refiners(&result, &refiners);
        }

        result
    }

    fn parse_term(&mut self, tokens: &[Token], pos: &mut usize) -> Vec<String> {
        if *pos >= tokens.len() {
            return Vec::new();
        }

        if tokens[*pos] == Token::LParen {
            self.depth += 1;
            if self.depth > MAX_DEPTH {
                *pos = tokens.len();
                return Vec::new();
            }
            *pos += 1; // skip (
            let inner = self.parse_segment(tokens, pos);
            if *pos < tokens.len() && tokens[*pos] == Token::RParen {
                *pos += 1; // skip )
            }
            self.depth -= 1;
            return inner;
        }

        self.parse_atom(tokens, pos)
    }

    fn parse_atom(&mut self, tokens: &[Token], pos: &mut usize) -> Vec<String> {
        if *pos >= tokens.len() {
            return Vec::new();
        }

        match &tokens[*pos] {
            Token::ItemId(value) => {
                let value = value.clone();
                *pos += 1;
                if self.config.all_links.contains_key(&value) {
                    vec![value]
                } else {
                    Vec::new()
                }
            }
            Token::Class(value) => {
                let value = value.clone();
                *pos += 1;
                self.search_by_class(&value)
            }
            Token::Regex(value) => {
                let value = value.clone();
                *pos += 1;
                let (pattern_key, field_opts) = value
                    .split_once('|')
                    .map_or((value.as_str(), ""), |(k, o)| (k, o));
                self.search_by_regex(pattern_key, field_opts)
            }
            Token::Protocol(value) => {
                let value = value.clone();
                *pos += 1;
                self.resolve_protocol(&value)
            }
            Token::DomRef(_) => {
                *pos += 1;
                Vec::new() // reserved
            }
            _ => Vec::new(), // don't consume
        }
    }
}

// ---------------------------------------------------------------------------
// Tokenizer
// ---------------------------------------------------------------------------

fn tokenize(expr: &str) -> Vec<Token> {
    let mut tokens = Vec::new();
    let chars: Vec<char> = expr.chars().collect();
    let n = chars.len();
    let mut i = 0;

    while i < n {
        let ch = chars[i];

        if ch.is_whitespace() {
            i += 1;
            continue;
        }

        match ch {
            '+' => { tokens.push(Token::Plus); i += 1; continue; }
            '|' => { tokens.push(Token::Pipe); i += 1; continue; }
            '-' => { tokens.push(Token::Minus); i += 1; continue; }
            ',' => { tokens.push(Token::Comma); i += 1; continue; }
            '(' => { tokens.push(Token::LParen); i += 1; continue; }
            ')' => { tokens.push(Token::RParen); i += 1; continue; }
            _ => {}
        }

        // Class: .word
        if ch == '.' {
            i += 1;
            let word = read_word(&chars, &mut i);
            if !word.is_empty() {
                tokens.push(Token::Class(word));
            }
            continue;
        }

        // DOM ref: #word
        if ch == '#' {
            i += 1;
            let word = read_word(&chars, &mut i);
            if !word.is_empty() {
                tokens.push(Token::DomRef(word));
            }
            continue;
        }

        // Regex: /patternKey/options
        if ch == '/' {
            i += 1; // skip opening /
            let mut key = String::new();
            while i < n && chars[i] != '/' {
                key.push(chars[i]);
                i += 1;
            }
            let mut opts = String::new();
            if i < n && chars[i] == '/' {
                i += 1; // skip closing /
                while i < n && "lutdka".contains(chars[i]) {
                    opts.push(chars[i]);
                    i += 1;
                }
            }
            if !key.is_empty() {
                let val = if opts.is_empty() {
                    key
                } else {
                    format!("{key}|{opts}")
                };
                tokens.push(Token::Regex(val));
            }
            continue;
        }

        // Protocol: :name:arg1:arg2:
        if ch == ':' {
            i += 1; // skip opening :
            let mut segments = String::new();
            // Read first segment
            while i < n && chars[i] != ':' {
                segments.push(chars[i]);
                i += 1;
            }
            // Collect remaining colon-separated segments
            while i < n && chars[i] == ':' {
                i += 1; // skip :
                if i >= n || " \t\n\r+|,()*/".contains(chars[i]) {
                    break; // trailing : ends the protocol
                }
                segments.push('|');
                while i < n && chars[i] != ':' {
                    segments.push(chars[i]);
                    i += 1;
                }
            }
            if !segments.is_empty() {
                tokens.push(Token::Protocol(segments));
            }
            continue;
        }

        // Refiner: *name* or *name:arg*
        if ch == '*' {
            i += 1; // skip opening *
            let mut content = String::new();
            while i < n && chars[i] != '*' {
                content.push(chars[i]);
                i += 1;
            }
            if i < n && chars[i] == '*' {
                i += 1; // skip closing *
            }
            if !content.is_empty() {
                tokens.push(Token::Refiner(content));
            }
            continue;
        }

        // Bare word: item ID
        if is_word_char(ch) {
            let word = read_word(&chars, &mut i);
            tokens.push(Token::ItemId(word));
            continue;
        }

        // Unknown — skip
        i += 1;
    }

    tokens
}

fn is_word_char(ch: char) -> bool {
    ch.is_alphanumeric() || ch == '_'
}

fn read_word(chars: &[char], i: &mut usize) -> String {
    let mut word = String::new();
    while *i < chars.len() && is_word_char(chars[*i]) {
        word.push(chars[*i]);
        *i += 1;
    }
    word
}

// ---------------------------------------------------------------------------
// Field helpers
// ---------------------------------------------------------------------------

fn parse_field_codes(codes: &str) -> HashSet<&'static str> {
    let mut fields = HashSet::new();
    for ch in codes.chars() {
        match ch {
            'l' => { fields.insert("label"); }
            'u' => { fields.insert("url"); }
            't' => { fields.insert("tags"); }
            'd' => { fields.insert("description"); }
            'k' => { fields.insert("id"); }
            'a' => {
                fields.insert("label");
                fields.insert("url");
                fields.insert("tags");
                fields.insert("description");
                fields.insert("id");
            }
            _ => {}
        }
    }
    if fields.is_empty() {
        fields.insert("label");
        fields.insert("url");
        fields.insert("tags");
        fields.insert("description");
        fields.insert("id");
    }
    fields
}

fn matches_fields(
    re: &Regex,
    id: &str,
    link: &crate::types::Link,
    fields: &HashSet<&str>,
) -> bool {
    if fields.contains("id") && re.is_match(id) {
        return true;
    }
    if fields.contains("label") {
        if let Some(label) = &link.label {
            if !label.is_empty() && re.is_match(label) {
                return true;
            }
        }
    }
    if fields.contains("url") && !link.url.is_empty() && re.is_match(&link.url) {
        return true;
    }
    if fields.contains("description") {
        if let Some(desc) = &link.description {
            if !desc.is_empty() && re.is_match(desc) {
                return true;
            }
        }
    }
    if fields.contains("tags") {
        for tag in &link.tags {
            if re.is_match(tag) {
                return true;
            }
        }
    }
    false
}

static AGE_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?i)^(\d+)\s*([dhwm])$").expect("AGE_RE is a valid regex"));

fn parse_age(age: &str) -> f64 {
    let caps = match AGE_RE.captures(age) {
        Some(c) => c,
        None => return 0.0,
    };
    let n: f64 = match caps[1].parse() {
        Ok(v) => v,
        Err(_) => return 0.0,
    };
    match caps[2].to_ascii_lowercase().as_str() {
        "h" => n * 3_600_000.0,
        "d" => n * 86_400_000.0,
        "w" => n * 604_800_000.0,
        "m" => n * 2_592_000_000.0,
        _ => 0.0,
    }
}

fn to_timestamp(value: Option<&serde_json::Value>) -> f64 {
    match value {
        None | Some(serde_json::Value::Null) => 0.0,
        Some(serde_json::Value::Number(n)) => n.as_f64().unwrap_or(0.0),
        Some(serde_json::Value::String(s)) => parse_rfc3339_ms(s),
        _ => 0.0,
    }
}

/// Parses a subset of RFC 3339 timestamps into milliseconds since epoch.
/// Handles `YYYY-MM-DDThh:mm:ssZ` and `YYYY-MM-DDThh:mm:ss±hh:mm`.
fn parse_rfc3339_ms(s: &str) -> f64 {
    // std::time doesn't have calendar parsing; use a minimal manual approach.
    // Accept: "2026-03-19T10:00:00Z" or "2026-03-19T10:00:00+00:00"
    let s = s.trim();
    if s.len() < 19 {
        return 0.0;
    }

    let year: i64 = s[0..4].parse().unwrap_or(0);
    let month: i64 = s[5..7].parse().unwrap_or(0);
    let day: i64 = s[8..10].parse().unwrap_or(0);
    let hour: i64 = s[11..13].parse().unwrap_or(0);
    let min: i64 = s[14..16].parse().unwrap_or(0);
    let sec: i64 = s[17..19].parse().unwrap_or(0);

    if year == 0 || month == 0 || day == 0 {
        return 0.0;
    }

    // Days from year 1970 to this date (simplified, no leap second handling)
    let days = days_from_epoch(year, month, day);
    let secs = days * 86400 + hour * 3600 + min * 60 + sec;

    // Timezone offset
    let tz_offset_secs = if s.len() > 19 {
        let tz = &s[19..];
        if tz.starts_with('Z') || tz.starts_with('z') {
            0i64
        } else if (tz.starts_with('+') || tz.starts_with('-')) && tz.len() >= 6 {
            let sign: i64 = if tz.starts_with('-') { -1 } else { 1 };
            let th: i64 = tz[1..3].parse().unwrap_or(0);
            let tm: i64 = tz[4..6].parse().unwrap_or(0);
            sign * (th * 3600 + tm * 60)
        } else {
            0i64
        }
    } else {
        0i64
    };

    ((secs - tz_offset_secs) * 1000) as f64
}

/// Days from Unix epoch (1970-01-01) to the given date.
fn days_from_epoch(year: i64, month: i64, day: i64) -> i64 {
    // Algorithm from Howard Hinnant's date library
    let y = if month <= 2 { year - 1 } else { year };
    let era = y.div_euclid(400);
    let yoe = y.rem_euclid(400);
    let m = if month > 2 { month - 3 } else { month + 9 };
    let doy = (153 * m + 2) / 5 + day - 1;
    let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    era * 146097 + doe - 719468
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

fn get_link_field(id: &str, link: &crate::types::Link, field: &str) -> String {
    match field {
        "id" => id.to_string(),
        "label" => link.label.clone().unwrap_or_default(),
        "url" => link.url.clone(),
        "description" => link.description.clone().unwrap_or_default(),
        _ => String::new(),
    }
}

fn dedupe(ids: &[String]) -> Vec<String> {
    if ids.is_empty() {
        return Vec::new();
    }
    let mut seen = HashSet::with_capacity(ids.len());
    let mut result = Vec::with_capacity(ids.len());
    for id in ids {
        if seen.insert(id.as_str()) {
            result.push(id.clone());
        }
    }
    result
}
