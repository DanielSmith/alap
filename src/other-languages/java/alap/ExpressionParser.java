// Copyright 2026 Daniel Smith
// Licensed under the Apache License, Version 2.0
// See https://www.apache.org/licenses/LICENSE-2.0

package alap;

import java.time.OffsetDateTime;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Collections;

import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;
import java.util.logging.Logger;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.regex.PatternSyntaxException;

/**
 * Alap expression parser — Java 21 port of src/core/ExpressionParser.ts.
 *
 * <p>Recursive descent parser for Alap's expression grammar:
 * <pre>
 *   query   = segment (',' segment)*
 *   segment = term (op term)* refiner*
 *   op      = '+' | '|' | '-'
 *   term    = '(' segment ')' | atom
 *   atom    = ITEM_ID | CLASS | DOM_REF | REGEX | PROTOCOL
 *   refiner = '*' name (':' arg)* '*'
 * </pre>
 *
 * <p>An ExpressionParser is <b>not</b> thread-safe. Create a new instance per
 * thread, or synchronize externally.
 */
public class ExpressionParser {

    private static final Logger LOG = Logger.getLogger(ExpressionParser.class.getName());

    // Limits (mirrors src/constants.ts)
    private static final int MAX_DEPTH = 32;
    private static final int MAX_TOKENS = 1024;
    private static final int MAX_MACRO_EXPANSIONS = 10;
    private static final int MAX_REGEX_QUERIES = 5;
    private static final int MAX_SEARCH_RESULTS = 100;
    private static final long REGEX_TIMEOUT_MS = 20;
    private static final int MAX_REFINERS = 10;

    private static final Pattern MACRO_RE = Pattern.compile("@(\\w*)");
    private static final Pattern AGE_RE = Pattern.compile("(?i)^(\\d+)\\s*([dhwm])$");

    private Map<String, Object> config;
    private int depth;
    private int regexCount;

    public ExpressionParser(Map<String, Object> config) {
        this.config = config;
    }

    public void updateConfig(Map<String, Object> config) {
        this.config = config;
    }

    // ------------------------------------------------------------------
    // Public API
    // ------------------------------------------------------------------

    /**
     * Parse an expression and return matching item IDs (deduplicated).
     */
    public List<String> query(String expression, String anchorId) {
        if (expression == null || expression.isBlank()) {
            return List.of();
        }
        String expr = expression.strip();
        if (expr.isEmpty()) {
            return List.of();
        }

        var allLinks = getAllLinks();
        if (allLinks == null || allLinks.isEmpty()) {
            return List.of();
        }

        String expanded = expandMacros(expr, anchorId);
        if (expanded.isEmpty()) {
            return List.of();
        }

        List<Token> tokens = tokenize(expanded);
        if (tokens.isEmpty() || tokens.size() > MAX_TOKENS) {
            return List.of();
        }

        depth = 0;
        regexCount = 0;
        int[] pos = {0};
        List<String> ids = parseQuery(tokens, pos);
        return dedupe(ids);
    }

    /** Convenience overload without anchorId. */
    public List<String> query(String expression) {
        return query(expression, null);
    }

    /**
     * Return all item IDs carrying the given tag.
     */
    public List<String> searchByClass(String className) {
        var allLinks = getAllLinks();
        if (allLinks == null || allLinks.isEmpty()) {
            return List.of();
        }
        List<String> result = new ArrayList<>();
        for (var entry : allLinks.entrySet()) {
            var link = asMap(entry.getValue());
            if (link == null) continue;
            var tags = asList(link.get("tags"));
            if (tags != null && tags.contains(className)) {
                result.add(entry.getKey());
            }
        }
        return result;
    }

    /**
     * Search allLinks using a named regex from config.searchPatterns.
     */
    public List<String> searchByRegex(String patternKey, String fieldOpts) {
        regexCount++;
        if (regexCount > MAX_REGEX_QUERIES) {
            return List.of();
        }

        var patterns = asMap(config.get("searchPatterns"));
        if (patterns == null || !patterns.containsKey(patternKey)) {
            return List.of();
        }

        Object entry = patterns.get(patternKey);
        String patternStr;
        Map<String, Object> opts = null;

        if (entry instanceof String s) {
            patternStr = s;
        } else {
            Map<String, Object> map = asMap(entry);
            if (map == null) return List.of();
            patternStr = map.get("pattern") instanceof String s ? s : "";
            opts = asMap(map.get("options"));
            return List.of();
        }

        var check = ValidateRegex.validate(patternStr);
        if (!check.safe()) {
            return List.of();
        }

        Pattern re;
        try {
            re = Pattern.compile(patternStr, Pattern.CASE_INSENSITIVE);
        } catch (PatternSyntaxException e) {
            return List.of();
        }

        // Field options
        String fo = (fieldOpts != null && !fieldOpts.isEmpty()) ? fieldOpts : "a";
        if (fo.equals("a") && opts != null && opts.get("fields") instanceof String f) {
            fo = f;
        }
        Set<String> fields = parseFieldCodes(fo);

        // Limit
        int limit = MAX_SEARCH_RESULTS;
        if (opts != null && opts.get("limit") instanceof Number n) {
            limit = Math.min(n.intValue(), MAX_SEARCH_RESULTS);
        }

        // Age filter
        double maxAge = 0;
        if (opts != null && opts.get("age") instanceof String a) {
            maxAge = parseAge(a);
        }
        double nowMs = System.currentTimeMillis();
        long startNanos = System.nanoTime();

        record Hit(String id, double createdAt) {}
        List<Hit> results = new ArrayList<>();

        var allLinks = getAllLinks();
        if (allLinks == null) return List.of();

        for (var e : allLinks.entrySet()) {
            // Timeout guard
            long elapsedMs = (System.nanoTime() - startNanos) / 1_000_000;
            if (elapsedMs > REGEX_TIMEOUT_MS) break;

            var link = asMap(e.getValue());
            if (link == null) continue;

            if (maxAge > 0) {
                double ts = toTimestamp(link.get("createdAt"));
                if (ts == 0 || (nowMs - ts) > maxAge) continue;
            }

            if (matchesFields(re, e.getKey(), link, fields)) {
                double ts = toTimestamp(link.get("createdAt"));
                results.add(new Hit(e.getKey(), ts));
                if (results.size() >= MAX_SEARCH_RESULTS) break;
            }
        }

        // Sort
        if (opts != null && opts.get("sort") instanceof String sort) {
            switch (sort) {
                case "alpha" -> results.sort((a, b) -> a.id().compareTo(b.id()));
                case "newest" -> results.sort((a, b) -> Double.compare(b.createdAt(), a.createdAt()));
                case "oldest" -> results.sort((a, b) -> Double.compare(a.createdAt(), b.createdAt()));
            }
        }

        return results.stream()
            .limit(limit)
            .map(Hit::id)
            .toList();
    }

    // ------------------------------------------------------------------
    // Protocol resolution
    // ------------------------------------------------------------------

    private List<String> resolveProtocol(String value) {
        String[] segments = value.split("\\|");
        String protocolName = segments[0];
        List<String> args = new ArrayList<>();
        for (int i = 1; i < segments.length; i++) {
            args.add(segments[i]);
        }

        var protocols = asMap(config.get("protocols"));
        if (protocols == null || !protocols.containsKey(protocolName)) {
            LOG.warning("Protocol \"" + protocolName + "\" not found in config.protocols");
            return List.of();
        }

        Object handlerEntry = protocols.get(protocolName);
        Config.ProtocolHandler handler;
        if (handlerEntry instanceof Config.ProtocolHandler h) {
            handler = h;
        } else {
            Map<String, Object> handlerMap = asMap(handlerEntry);
            if (handlerMap != null && handlerMap.get("handler") instanceof Config.ProtocolHandler ph) {
                handler = ph;
            } else {
                LOG.warning("Protocol \"" + protocolName + "\" has no handler");
                return List.of();
            }
        }

        var allLinks = getAllLinks();
        if (allLinks == null) return List.of();

        List<String> result = new ArrayList<>();
        for (var entry : allLinks.entrySet()) {
            var link = asMap(entry.getValue());
            if (link == null) continue;
            try {
                if (handler.test(args, link, entry.getKey())) {
                    result.add(entry.getKey());
                }
            } catch (Exception ex) {
                LOG.warning("Protocol \"" + protocolName + "\" handler threw for \""
                    + entry.getKey() + "\": " + ex.getMessage());
            }
        }
        return result;
    }

    // ------------------------------------------------------------------
    // Refiner pipeline
    // ------------------------------------------------------------------

    private List<String> applyRefiners(List<String> ids, List<Token> refiners) {
        if (refiners.isEmpty()) return ids;

        var allLinks = getAllLinks();
        if (allLinks == null) return ids;

        // Resolve IDs to mutable list of (id, link) pairs
        List<Map.Entry<String, Map<String, Object>>> links = new ArrayList<>();
        for (String id : ids) {
            var link = asMap(allLinks.get(id));
            if (link != null) {
                links.add(Map.entry(id, link));
            }
        }

        for (Token tok : refiners) {
            if (!(tok instanceof Token.Refiner(var val))) continue;

            String[] parts = val.split(":", 2);
            String name = parts[0];
            String arg = parts.length > 1 ? parts[1] : "";

            switch (name) {
                case "sort" -> {
                    String field = arg.isEmpty() ? "label" : arg;
                    links.sort((a, b) -> {
                        String av = getLinkField(a.getKey(), a.getValue(), field);
                        String bv = getLinkField(b.getKey(), b.getValue(), field);
                        return av.compareToIgnoreCase(bv);
                    });
                }
                case "reverse" -> Collections.reverse(links);
                case "limit" -> {
                    try {
                        int n = Math.max(0, Integer.parseInt(arg));
                        if (n < links.size()) {
                            links = new ArrayList<>(links.subList(0, n));
                        }
                    } catch (NumberFormatException e) {
                        LOG.warning("Refiner *limit:" + arg + "* has invalid argument");
                    }
                }
                case "skip" -> {
                    try {
                        int n = Math.max(0, Integer.parseInt(arg));
                        if (n >= links.size()) {
                            links = new ArrayList<>();
                        } else {
                            links = new ArrayList<>(links.subList(n, links.size()));
                        }
                    } catch (NumberFormatException e) {
                        LOG.warning("Refiner *skip:" + arg + "* has invalid argument");
                    }
                }
                case "shuffle" -> {
                    var rng = new Random();
                    Collections.shuffle(links, rng);
                }
                case "unique" -> {
                    String field = arg.isEmpty() ? "url" : arg;
                    Set<String> seen = new HashSet<>();
                    links = links.stream()
                        .filter(e -> seen.add(getLinkField(e.getKey(), e.getValue(), field)))
                        .collect(ArrayList::new, ArrayList::add, ArrayList::addAll);
                }
                default -> LOG.warning("Unknown refiner \"" + name + "\" — skipping");
            }
        }

        return links.stream().map(Map.Entry::getKey).toList();
    }

    // ------------------------------------------------------------------
    // Macro expansion
    // ------------------------------------------------------------------

    private String expandMacros(String expr, String anchorId) {
        String result = expr;
        for (int round = 0; round < MAX_MACRO_EXPANSIONS; round++) {
            if (!result.contains("@")) break;

            String before = result;
            var matcher = MACRO_RE.matcher(before);
            var sb = new StringBuilder();
            while (matcher.find()) {
                String name = matcher.group(1);
                String macroName = (name == null || name.isEmpty())
                    ? (anchorId != null ? anchorId : "")
                    : name;
                if (macroName.isEmpty()) {
                    matcher.appendReplacement(sb, "");
                    continue;
                }
                var macros = asMap(config.get("macros"));
                if (macros == null || !macros.containsKey(macroName)) {
                    matcher.appendReplacement(sb, "");
                    continue;
                }
                var macro = asMap(macros.get(macroName));
                if (macro == null) {
                    matcher.appendReplacement(sb, "");
                    continue;
                }
                Object linkItems = macro.get("linkItems");
                if (linkItems instanceof String li && !li.isEmpty()) {
                    matcher.appendReplacement(sb, Matcher.quoteReplacement(li));
                } else {
                    matcher.appendReplacement(sb, "");
                }
            }
            matcher.appendTail(sb);
            result = sb.toString();

            if (result.equals(before)) break;
        }
        return result;
    }

    // ------------------------------------------------------------------
    // Tokenizer
    // ------------------------------------------------------------------

    public static List<Token> tokenize(String expr) {
        List<Token> tokens = new ArrayList<>();
        int n = expr.length();
        int i = 0;

        while (i < n) {
            char ch = expr.charAt(i);

            if (Character.isWhitespace(ch)) { i++; continue; }

            switch (ch) {
                case '+' -> { tokens.add(new Token.Plus());   i++; continue; }
                case '|' -> { tokens.add(new Token.Pipe());   i++; continue; }
                case '-' -> { tokens.add(new Token.Minus());  i++; continue; }
                case ',' -> { tokens.add(new Token.Comma());  i++; continue; }
                case '(' -> { tokens.add(new Token.LParen()); i++; continue; }
                case ')' -> { tokens.add(new Token.RParen()); i++; continue; }
            }

            // Class: .word
            if (ch == '.') {
                i++;
                String word = readWord(expr, i);
                i += word.length();
                if (!word.isEmpty()) {
                    tokens.add(new Token.Class(word));
                }
                continue;
            }

            // DOM ref: #word
            if (ch == '#') {
                i++;
                String word = readWord(expr, i);
                i += word.length();
                if (!word.isEmpty()) {
                    tokens.add(new Token.DomRef(word));
                }
                continue;
            }

            // Regex: /patternKey/options
            if (ch == '/') {
                i++; // skip opening /
                var key = new StringBuilder();
                while (i < n && expr.charAt(i) != '/') {
                    key.append(expr.charAt(i));
                    i++;
                }
                var opts = new StringBuilder();
                if (i < n && expr.charAt(i) == '/') {
                    i++; // skip closing /
                    while (i < n && "lutdka".indexOf(expr.charAt(i)) >= 0) {
                        opts.append(expr.charAt(i));
                        i++;
                    }
                }
                if (!key.isEmpty()) {
                    String val = opts.isEmpty() ? key.toString()
                        : key.toString() + "|" + opts.toString();
                    tokens.add(new Token.Regex(val));
                }
                continue;
            }

            // Protocol: :name:arg1:arg2:
            if (ch == ':') {
                i++; // skip opening :
                var segments = new StringBuilder();
                while (i < n && expr.charAt(i) != ':') {
                    segments.append(expr.charAt(i));
                    i++;
                }
                while (i < n && expr.charAt(i) == ':') {
                    i++; // skip :
                    if (i >= n || " \t\n\r+|,()*/".indexOf(expr.charAt(i)) >= 0) {
                        break;
                    }
                    segments.append('|');
                    while (i < n && expr.charAt(i) != ':') {
                        segments.append(expr.charAt(i));
                        i++;
                    }
                }
                if (!segments.isEmpty()) {
                    tokens.add(new Token.Protocol(segments.toString()));
                }
                continue;
            }

            // Refiner: *name* or *name:arg*
            if (ch == '*') {
                i++; // skip opening *
                var content = new StringBuilder();
                while (i < n && expr.charAt(i) != '*') {
                    content.append(expr.charAt(i));
                    i++;
                }
                if (i < n && expr.charAt(i) == '*') {
                    i++; // skip closing *
                }
                if (!content.isEmpty()) {
                    tokens.add(new Token.Refiner(content.toString()));
                }
                continue;
            }

            // Bare word: item ID
            if (isWordChar(ch)) {
                String word = readWord(expr, i);
                i += word.length();
                tokens.add(new Token.ItemId(word));
                continue;
            }

            // Unknown — skip
            i++;
        }

        return tokens;
    }

    private static boolean isWordChar(char ch) {
        return Character.isLetterOrDigit(ch) || ch == '_';
    }

    private static String readWord(String s, int start) {
        int i = start;
        while (i < s.length() && isWordChar(s.charAt(i))) {
            i++;
        }
        return s.substring(start, i);
    }

    // ------------------------------------------------------------------
    // Parser
    // ------------------------------------------------------------------

    private List<String> parseQuery(List<Token> tokens, int[] pos) {
        List<String> result = new ArrayList<>(parseSegment(tokens, pos));

        while (pos[0] < tokens.size() && tokens.get(pos[0]) instanceof Token.Comma) {
            pos[0]++; // skip comma
            if (pos[0] >= tokens.size()) break;
            result.addAll(parseSegment(tokens, pos));
        }

        return result;
    }

    private List<String> parseSegment(List<Token> tokens, int[] pos) {
        if (pos[0] >= tokens.size()) return List.of();

        int startPos = pos[0];
        List<String> result = new ArrayList<>(parseTerm(tokens, pos));
        boolean hasInitialTerm = pos[0] > startPos;

        while (pos[0] < tokens.size()) {
            Token tok = tokens.get(pos[0]);
            if (!(tok instanceof Token.Plus || tok instanceof Token.Pipe || tok instanceof Token.Minus)) {
                break;
            }

            Token op = tok;
            pos[0]++; // skip operator
            if (pos[0] >= tokens.size()) break;

            List<String> right = parseTerm(tokens, pos);

            if (!hasInitialTerm) {
                result = new ArrayList<>(right);
                hasInitialTerm = true;
            } else {
                switch (op) {
                    case Token.Plus plus -> {
                        Set<String> rightSet = new HashSet<>(right);
                        result = result.stream().filter(rightSet::contains)
                            .collect(ArrayList::new, ArrayList::add, ArrayList::addAll);
                    }
                    case Token.Pipe pipe -> {
                        Set<String> seen = new LinkedHashSet<>(result);
                        for (String id : right) {
                            if (seen.add(id)) {
                                result.add(id);
                            }
                        }
                    }
                    case Token.Minus minus -> {
                        Set<String> rightSet = new HashSet<>(right);
                        result = result.stream().filter(id -> !rightSet.contains(id))
                            .collect(ArrayList::new, ArrayList::add, ArrayList::addAll);
                    }
                    default -> {}
                }
            }
        }

        // Collect trailing refiners
        List<Token> refiners = new ArrayList<>();
        while (pos[0] < tokens.size() && tokens.get(pos[0]) instanceof Token.Refiner) {
            if (refiners.size() >= MAX_REFINERS) {
                LOG.warning("Refiner limit exceeded (max " + MAX_REFINERS
                    + " per segment). Skipping remaining refiners.");
                pos[0]++;
                continue;
            }
            refiners.add(tokens.get(pos[0]));
            pos[0]++;
        }

        if (!refiners.isEmpty()) {
            result = applyRefiners(result, refiners);
        }

        return result;
    }

    private List<String> parseTerm(List<Token> tokens, int[] pos) {
        if (pos[0] >= tokens.size()) return List.of();

        if (tokens.get(pos[0]) instanceof Token.LParen) {
            depth++;
            if (depth > MAX_DEPTH) {
                pos[0] = tokens.size();
                return List.of();
            }
            pos[0]++; // skip (
            List<String> inner = parseSegment(tokens, pos);
            if (pos[0] < tokens.size() && tokens.get(pos[0]) instanceof Token.RParen) {
                pos[0]++; // skip )
            }
            depth--;
            return inner;
        }

        return parseAtom(tokens, pos);
    }

    private List<String> parseAtom(List<Token> tokens, int[] pos) {
        if (pos[0] >= tokens.size()) return List.of();

        return switch (tokens.get(pos[0])) {
            case Token.ItemId(var id) -> {
                pos[0]++;
                var allLinks = getAllLinks();
                yield (allLinks != null && allLinks.containsKey(id))
                    ? new ArrayList<>(List.of(id))
                    : List.of();
            }
            case Token.Class(var tag) -> {
                pos[0]++;
                yield searchByClass(tag);
            }
            case Token.Regex(var val) -> {
                pos[0]++;
                String[] parts = val.split("\\|", 2);
                yield searchByRegex(parts[0], parts.length > 1 ? parts[1] : "");
            }
            case Token.Protocol(var val) -> {
                pos[0]++;
                yield resolveProtocol(val);
            }
            case Token.DomRef domRef -> {
                pos[0]++;
                yield List.of(); // reserved
            }
            default -> List.of(); // don't consume
        };
    }

    // ------------------------------------------------------------------
    // Field helpers
    // ------------------------------------------------------------------

    private static Set<String> parseFieldCodes(String codes) {
        Set<String> fields = new HashSet<>();
        for (char ch : codes.toCharArray()) {
            switch (ch) {
                case 'l' -> fields.add("label");
                case 'u' -> fields.add("url");
                case 't' -> fields.add("tags");
                case 'd' -> fields.add("description");
                case 'k' -> fields.add("id");
                case 'a' -> fields.addAll(Set.of("label", "url", "tags", "description", "id"));
            }
        }
        if (fields.isEmpty()) {
            fields.addAll(Set.of("label", "url", "tags", "description", "id"));
        }
        return fields;
    }

    private static boolean matchesFields(Pattern re, String id, Map<String, Object> link, Set<String> fields) {
        if (fields.contains("id") && re.matcher(id).find()) return true;
        if (fields.contains("label")) {
            Object label = link.get("label");
            if (label instanceof String s && !s.isEmpty() && re.matcher(s).find()) return true;
        }
        if (fields.contains("url")) {
            Object url = link.get("url");
            if (url instanceof String s && !s.isEmpty() && re.matcher(s).find()) return true;
        }
        if (fields.contains("description")) {
            Object desc = link.get("description");
            if (desc instanceof String s && !s.isEmpty() && re.matcher(s).find()) return true;
        }
        if (fields.contains("tags")) {
            var tags = asList(link.get("tags"));
            if (tags != null) {
                for (Object tag : tags) {
                    if (tag instanceof String s && re.matcher(s).find()) return true;
                }
            }
        }
        return false;
    }

    private static String getLinkField(String id, Map<String, Object> link, String field) {
        return switch (field) {
            case "id" -> id;
            case "label" -> link.get("label") instanceof String s ? s : "";
            case "url" -> link.get("url") instanceof String s ? s : "";
            case "description" -> link.get("description") instanceof String s ? s : "";
            default -> "";
        };
    }

    private static double parseAge(String age) {
        if (age == null || age.isEmpty()) return 0;
        Matcher m = AGE_RE.matcher(age);
        if (!m.matches()) return 0;
        double n = Double.parseDouble(m.group(1));
        return switch (m.group(2).toLowerCase()) {
            case "h" -> n * 3_600_000;
            case "d" -> n * 86_400_000;
            case "w" -> n * 604_800_000;
            case "m" -> n * 2_592_000_000.0;
            default -> 0;
        };
    }

    private static double toTimestamp(Object value) {
        if (value == null) return 0;
        if (value instanceof Number n) return n.doubleValue();
        if (value instanceof String s) {
            try {
                String normalized = s.strip();
                if (normalized.endsWith("Z") || normalized.endsWith("z")) {
                    normalized = normalized.substring(0, normalized.length() - 1) + "+00:00";
                }
                return OffsetDateTime.parse(normalized).toInstant().toEpochMilli();
            } catch (DateTimeParseException e) {
                return 0;
            }
        }
        return 0;
    }

    // ------------------------------------------------------------------
    // Static utilities
    // ------------------------------------------------------------------

    /**
     * Resolve an expression and return matching links with sanitized URLs.
     */
    public static List<Map<String, Object>> resolve(Map<String, Object> config, String expression) {
        var parser = new ExpressionParser(config);
        List<String> ids = parser.query(expression);
        var allLinks = asMap(config.get("allLinks"));
        if (allLinks == null) return List.of();

        List<Map<String, Object>> results = new ArrayList<>();
        for (String id : ids) {
            var link = asMap(allLinks.get(id));
            if (link == null) continue;
            var result = new LinkedHashMap<>(link);
            result.put("id", id);
            if (result.get("url") instanceof String url) {
                result.put("url", SanitizeUrl.sanitize(url));
            }
            results.add(result);
        }
        return results;
    }

    /**
     * Resolve an expression and return a map of id to sanitized link.
     */
    public static Map<String, Object> cherryPick(Map<String, Object> config, String expression) {
        var parser = new ExpressionParser(config);
        List<String> ids = parser.query(expression);
        var allLinks = asMap(config.get("allLinks"));
        if (allLinks == null) return Map.of();

        Map<String, Object> result = new LinkedHashMap<>();
        for (String id : ids) {
            var link = asMap(allLinks.get(id));
            if (link == null) continue;
            var sanitized = new LinkedHashMap<>(link);
            if (sanitized.get("url") instanceof String url) {
                sanitized.put("url", SanitizeUrl.sanitize(url));
            }
            result.put(id, sanitized);
        }
        return result;
    }

    /**
     * Shallow-merge multiple Alap configs. Later configs win on collision.
     */
    @SafeVarargs
    public static Map<String, Object> mergeConfigs(Map<String, Object>... configs) {
        Set<String> blocked = Set.of("__proto__", "constructor", "prototype");

        Map<String, Object> settings = new LinkedHashMap<>();
        Map<String, Object> macros = new LinkedHashMap<>();
        Map<String, Object> allLinks = new LinkedHashMap<>();
        Map<String, Object> searchPatterns = new LinkedHashMap<>();
        Map<String, Object> protocols = new LinkedHashMap<>();

        for (var cfg : configs) {
            if (cfg == null) continue;
            mergeSection(asMap(cfg.get("settings")), settings, blocked);
            mergeSection(asMap(cfg.get("macros")), macros, blocked);
            mergeSection(asMap(cfg.get("allLinks")), allLinks, blocked);
            mergeSection(asMap(cfg.get("searchPatterns")), searchPatterns, blocked);
            mergeSection(asMap(cfg.get("protocols")), protocols, blocked);
        }

        Map<String, Object> merged = new LinkedHashMap<>();
        if (!settings.isEmpty()) merged.put("settings", settings);
        if (!macros.isEmpty()) merged.put("macros", macros);
        merged.put("allLinks", allLinks);
        if (!searchPatterns.isEmpty()) merged.put("searchPatterns", searchPatterns);
        if (!protocols.isEmpty()) merged.put("protocols", protocols);
        return merged;
    }

    private static void mergeSection(Map<String, Object> source, Map<String, Object> target, Set<String> blocked) {
        if (source == null) return;
        for (var e : source.entrySet()) {
            if (!blocked.contains(e.getKey())) {
                target.put(e.getKey(), e.getValue());
            }
        }
    }

    // ------------------------------------------------------------------
    // Internal helpers
    // ------------------------------------------------------------------

    @SuppressWarnings("unchecked")
    private Map<String, Object> getAllLinks() {
        return asMap(config.get("allLinks"));
    }

    @SuppressWarnings("unchecked")
    public static Map<String, Object> asMap(Object obj) {
        if (obj instanceof Map<?, ?> m) {
            return (Map<String, Object>) m;
        }
        return null;
    }

    @SuppressWarnings("unchecked")
    private static List<Object> asList(Object obj) {
        if (obj instanceof List<?> l) {
            return (List<Object>) l;
        }
        return null;
    }

    private static List<String> dedupe(List<String> ids) {
        if (ids.isEmpty()) return ids;
        Set<String> seen = new LinkedHashSet<>();
        List<String> result = new ArrayList<>();
        for (String id : ids) {
            if (seen.add(id)) {
                result.add(id);
            }
        }
        return result;
    }
}
