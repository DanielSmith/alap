# Copyright 2026 Daniel Smith
# Licensed under the Apache License, Version 2.0
# See https://www.apache.org/licenses/LICENSE-2.0

"""
Alap expression parser — Python port of src/core/ExpressionParser.ts.

Recursive descent parser for Alap's expression grammar:

  query   = segment (',' segment)*
  segment = term (op term)* refiner*
  op      = '+' | '|' | '-'
  term    = '(' segment ')' | atom
  atom    = ITEM_ID | CLASS | DOM_REF | REGEX | PROTOCOL
  refiner = '*' name (':' arg)* '*'

Supports: item IDs, .tag queries, @macro expansion, /regex/ search,
:protocol:args: expressions, *refiner:args* post-processing,
parenthesized grouping, + (AND/intersection), | (OR/union), - (WITHOUT/subtraction).
"""

from __future__ import annotations

import random
import re
import time
import warnings
from dataclasses import dataclass, field
from typing import Any

try:
    from .sanitize_url import sanitize_url
    from .validate_regex import validate_regex
except ImportError:
    # Flat-file usage (e.g. servers/shared/ copies)
    from sanitize_url import sanitize_url
    from validate_regex import validate_regex

# ---------------------------------------------------------------------------
# Constants (mirrors src/constants.ts)
# ---------------------------------------------------------------------------

MAX_DEPTH = 32
MAX_TOKENS = 1024
MAX_MACRO_EXPANSIONS = 10
MAX_REGEX_QUERIES = 5
MAX_SEARCH_RESULTS = 100
REGEX_TIMEOUT_MS = 20
MAX_REFINERS = 10


# ---------------------------------------------------------------------------
# Token types
# ---------------------------------------------------------------------------

@dataclass
class Token:
    type: str   # ITEM_ID | CLASS | MACRO | DOM_REF | REGEX | PROTOCOL | REFINER | PLUS | PIPE | MINUS | COMMA | LPAREN | RPAREN
    value: str


@dataclass
class ParseResult:
    ids: list[str]
    pos: int


# ---------------------------------------------------------------------------
# Expression parser
# ---------------------------------------------------------------------------

class ExpressionParser:
    """Parse Alap expressions and resolve them against a config's allLinks."""

    def __init__(self, config: dict[str, Any]) -> None:
        self._config = config
        self._depth = 0
        self._regex_count = 0

    def update_config(self, config: dict[str, Any]) -> None:
        self._config = config

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def query(self, expression: str, anchor_id: str | None = None) -> list[str]:
        """Parse *expression* and return matching item IDs (deduplicated)."""
        if not expression or not isinstance(expression, str):
            return []
        expr = expression.strip()
        if not expr:
            return []

        all_links = self._config.get("allLinks")
        if not all_links or not isinstance(all_links, dict):
            return []

        expanded = self._expand_macros(expr, anchor_id)
        if not expanded:
            return []

        tokens = self._tokenize(expanded)
        if not tokens:
            return []
        if len(tokens) > MAX_TOKENS:
            warnings.warn(
                f"Expression has {len(tokens)} tokens (max {MAX_TOKENS}). "
                f'Ignoring: "{expression[:60]}..."'
            )
            return []

        self._depth = 0
        self._regex_count = 0
        ids = self._parse_query(tokens)
        return list(dict.fromkeys(ids))  # deduplicate, preserve order

    def search_by_class(self, class_name: str) -> list[str]:
        """Return all item IDs carrying *class_name* as a tag."""
        all_links = self._config.get("allLinks")
        if not all_links or not isinstance(all_links, dict):
            return []

        result: list[str] = []
        for item_id, link in all_links.items():
            if not link or not isinstance(link, dict):
                continue
            tags = link.get("tags")
            if isinstance(tags, list) and class_name in tags:
                result.append(item_id)
        return result

    def search_by_regex(self, pattern_key: str, field_opts: str | None = None) -> list[str]:
        """Search allLinks using a named regex from config.searchPatterns."""
        self._regex_count += 1
        if self._regex_count > MAX_REGEX_QUERIES:
            warnings.warn(f"Regex query limit exceeded (max {MAX_REGEX_QUERIES}). Skipping /{pattern_key}/")
            return []

        patterns = self._config.get("searchPatterns")
        if not patterns or pattern_key not in patterns:
            warnings.warn(f'Search pattern "{pattern_key}" not found in config.searchPatterns')
            return []

        entry = patterns[pattern_key]
        if isinstance(entry, str):
            spec: dict[str, Any] = {"pattern": entry}
        else:
            spec = entry

        pattern_str = spec.get("pattern", "")
        validation = validate_regex(pattern_str)
        if not validation["safe"]:
            warnings.warn(f'Unsafe regex "{pattern_str}" in searchPatterns["{pattern_key}"]: {validation["reason"]}')
            return []

        try:
            compiled = re.compile(pattern_str, re.IGNORECASE)
        except re.error:
            warnings.warn(f'Invalid regex "{pattern_str}" in searchPatterns["{pattern_key}"]')
            return []

        opts = spec.get("options", {}) or {}
        fields = self._parse_field_codes(field_opts or opts.get("fields", "a") or "a")

        all_links = self._config.get("allLinks")
        if not all_links or not isinstance(all_links, dict):
            return []

        now_ms = time.time() * 1000
        max_age = self._parse_age(opts.get("age", "")) if opts.get("age") else 0
        limit = min(opts.get("limit", MAX_SEARCH_RESULTS), MAX_SEARCH_RESULTS)
        start = time.monotonic()

        result: list[dict[str, Any]] = []

        for item_id, link in all_links.items():
            if not link or not isinstance(link, dict):
                continue

            # Timeout guard
            elapsed_ms = (time.monotonic() - start) * 1000
            if elapsed_ms > REGEX_TIMEOUT_MS:
                warnings.warn(f"Regex search /{pattern_key}/ timed out after {REGEX_TIMEOUT_MS}ms")
                break

            # Age filter
            if max_age > 0:
                ts = self._to_timestamp(link.get("createdAt"))
                if ts == 0 or (now_ms - ts) > max_age:
                    continue

            # Field matching
            if self._matches_fields(compiled, item_id, link, fields):
                ts = self._to_timestamp(link.get("createdAt")) if link.get("createdAt") else 0
                result.append({"id": item_id, "createdAt": ts})
                if len(result) >= MAX_SEARCH_RESULTS:
                    warnings.warn(f"Regex search /{pattern_key}/ hit {MAX_SEARCH_RESULTS} result cap")
                    break

        # Sort
        sort_mode = opts.get("sort")
        if sort_mode == "alpha":
            result.sort(key=lambda r: r["id"])
        elif sort_mode == "newest":
            result.sort(key=lambda r: r["createdAt"], reverse=True)
        elif sort_mode == "oldest":
            result.sort(key=lambda r: r["createdAt"])

        return [r["id"] for r in result[:limit]]

    # ------------------------------------------------------------------
    # Protocol resolution
    # ------------------------------------------------------------------

    def _resolve_protocol(self, value: str) -> list[str]:
        """Resolve a protocol expression. Value is 'name|arg1|arg2|...'."""
        parts = value.split("|")
        name = parts[0]
        segments = parts[1:]

        protocols = self._config.get("protocols", {})
        if not protocols or name not in protocols:
            warnings.warn(f'Unknown protocol ":{name}:" — skipping')
            return []

        handler_entry = protocols[name]
        handler = handler_entry.get("handler") if isinstance(handler_entry, dict) else handler_entry

        if not callable(handler):
            warnings.warn(f'Protocol ":{name}:" has no callable handler — skipping')
            return []

        all_links = self._config.get("allLinks", {})
        result: list[str] = []
        for item_id, link in all_links.items():
            if not link or not isinstance(link, dict):
                continue
            try:
                if handler(segments, link, item_id):
                    result.append(item_id)
            except Exception as exc:
                warnings.warn(f'Protocol ":{name}:" handler threw for "{item_id}": {exc}')
        return result

    # ------------------------------------------------------------------
    # Refiner application
    # ------------------------------------------------------------------

    def _apply_refiners(self, ids: list[str], refiners: list[Token]) -> list[str]:
        """Apply a sequence of refiner tokens to a list of IDs."""
        if not refiners:
            return ids

        all_links = self._config.get("allLinks", {})
        links = []
        for item_id in ids:
            link = all_links.get(item_id)
            if link and isinstance(link, dict):
                links.append({"id": item_id, **link})

        for refiner_token in refiners:
            name, arg = self._parse_refiner_step(refiner_token.value)

            if name == "sort":
                field_name = arg or "label"
                links.sort(key=lambda lnk: str(lnk.get(field_name, "") or "").lower())
            elif name == "reverse":
                links.reverse()
            elif name == "limit":
                try:
                    n = max(0, int(arg)) if arg else 0
                    links = links[:n]
                except (ValueError, TypeError):
                    warnings.warn(f'Refiner *limit:{arg}* has invalid argument — skipping')
            elif name == "skip":
                try:
                    n = max(0, int(arg)) if arg else 0
                    links = links[n:]
                except (ValueError, TypeError):
                    warnings.warn(f'Refiner *skip:{arg}* has invalid argument — skipping')
            elif name == "shuffle":
                random.shuffle(links)
            elif name == "unique":
                field_name = arg or "url"
                seen: set[str] = set()
                unique_links: list[dict[str, Any]] = []
                for lnk in links:
                    val = str(lnk.get(field_name, "") or "")
                    if val not in seen:
                        seen.add(val)
                        unique_links.append(lnk)
                links = unique_links
            else:
                warnings.warn(f'Unknown refiner "*{name}*" — skipping')

        return [lnk["id"] for lnk in links]

    @staticmethod
    def _parse_refiner_step(value: str) -> tuple[str, str]:
        """Parse a refiner value like 'sort:label' into (name, arg)."""
        if ":" in value:
            name, arg = value.split(":", 1)
            return name, arg
        return value, ""

    # ------------------------------------------------------------------
    # Field helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _parse_field_codes(codes: str) -> set[str]:
        codes = re.sub(r"[\s,]", "", codes)
        fields: set[str] = set()
        for ch in codes:
            if ch == "l":
                fields.add("label")
            elif ch == "u":
                fields.add("url")
            elif ch == "t":
                fields.add("tags")
            elif ch == "d":
                fields.add("description")
            elif ch == "k":
                fields.add("id")
            elif ch == "a":
                fields.update(("label", "url", "tags", "description", "id"))
        return fields if fields else {"label", "url", "tags", "description", "id"}

    @staticmethod
    def _matches_fields(
        compiled: re.Pattern[str],
        item_id: str,
        link: dict[str, Any],
        fields: set[str],
    ) -> bool:
        if "id" in fields and compiled.search(item_id):
            return True
        if "label" in fields and compiled.search(link.get("label", "") or ""):
            return True
        if "url" in fields and compiled.search(link.get("url", "") or ""):
            return True
        if "description" in fields and compiled.search(link.get("description", "") or ""):
            return True
        if "tags" in fields:
            for tag in link.get("tags", []) or []:
                if compiled.search(tag):
                    return True
        return False

    @staticmethod
    def _parse_age(age: str) -> int:
        """Parse an age string like '30d', '24h', '2w', '1m' to milliseconds."""
        if not age:
            return 0
        m = re.match(r"^(\d+)\s*([dhwm])$", age, re.IGNORECASE)
        if not m:
            return 0
        n = int(m.group(1))
        unit = m.group(2).lower()
        if unit == "h":
            return n * 60 * 60 * 1000
        if unit == "d":
            return n * 24 * 60 * 60 * 1000
        if unit == "w":
            return n * 7 * 24 * 60 * 60 * 1000
        if unit == "m":
            return n * 30 * 24 * 60 * 60 * 1000
        return 0

    @staticmethod
    def _to_timestamp(value: Any) -> int:
        """Convert a createdAt value to Unix milliseconds."""
        if value is None:
            return 0
        if isinstance(value, (int, float)):
            return int(value)
        try:
            from datetime import datetime, timezone
            dt = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
            return int(dt.timestamp() * 1000)
        except (ValueError, TypeError):
            return 0

    # ------------------------------------------------------------------
    # Macro expansion
    # ------------------------------------------------------------------

    def _expand_macros(self, expr: str, anchor_id: str | None) -> str:
        result = expr
        for _ in range(MAX_MACRO_EXPANSIONS):
            if "@" not in result:
                break
            before = result

            def replacer(m: re.Match[str]) -> str:
                name = m.group(1)
                macro_name = name or anchor_id or ""
                if not macro_name:
                    return ""
                macros = self._config.get("macros")
                if not macros or macro_name not in macros:
                    warnings.warn(f'Macro "@{macro_name}" not found in config.macros')
                    return ""
                macro = macros[macro_name]
                if not isinstance(macro, dict) or not isinstance(macro.get("linkItems"), str):
                    warnings.warn(f'Macro "@{macro_name}" not found in config.macros')
                    return ""
                return macro["linkItems"]

            result = re.sub(r"@(\w*)", replacer, result)
            if result == before:
                break
        else:
            if "@" in result:
                warnings.warn(
                    f"Macro expansion hit {MAX_MACRO_EXPANSIONS}-round limit — "
                    f'possible circular reference in "{expr[:60]}"'
                )
        return result

    # ------------------------------------------------------------------
    # Tokenizer
    # ------------------------------------------------------------------

    @staticmethod
    def _tokenize(expr: str) -> list[Token]:
        tokens: list[Token] = []
        i = 0
        n = len(expr)

        while i < n:
            ch = expr[i]

            if ch.isspace():
                i += 1
                continue

            if ch == "+":
                tokens.append(Token("PLUS", "+"))
                i += 1
                continue
            if ch == "|":
                tokens.append(Token("PIPE", "|"))
                i += 1
                continue
            if ch == "-":
                tokens.append(Token("MINUS", "-"))
                i += 1
                continue
            if ch == ",":
                tokens.append(Token("COMMA", ","))
                i += 1
                continue
            if ch == "(":
                tokens.append(Token("LPAREN", "("))
                i += 1
                continue
            if ch == ")":
                tokens.append(Token("RPAREN", ")"))
                i += 1
                continue

            # Class: .word
            if ch == ".":
                i += 1
                word = ""
                while i < n and (expr[i].isalnum() or expr[i] == "_"):
                    word += expr[i]
                    i += 1
                if word:
                    tokens.append(Token("CLASS", word))
                continue

            # DOM ref: #word
            if ch == "#":
                i += 1
                word = ""
                while i < n and (expr[i].isalnum() or expr[i] == "_"):
                    word += expr[i]
                    i += 1
                if word:
                    tokens.append(Token("DOM_REF", word))
                continue

            # Regex search: /patternKey/options
            if ch == "/":
                i += 1  # skip opening /
                key = ""
                while i < n and expr[i] != "/":
                    key += expr[i]
                    i += 1
                opts = ""
                if i < n and expr[i] == "/":
                    i += 1  # skip closing /
                    while i < n and expr[i] in "lutdka":
                        opts += expr[i]
                        i += 1
                if key:
                    value = f"{key}|{opts}" if opts else key
                    tokens.append(Token("REGEX", value))
                continue

            # Protocol: :name:arg1:arg2:
            if ch == ":":
                i += 1  # skip opening :
                segments = ""
                while i < n and expr[i] != ":":
                    segments += expr[i]
                    i += 1
                # Collect remaining segments
                while i < n and expr[i] == ":":
                    i += 1  # skip :
                    if i >= n or expr[i] in " \t\n\r+|,()*/":
                        break  # trailing : ends the protocol
                    segments += "|"
                    while i < n and expr[i] != ":":
                        segments += expr[i]
                        i += 1
                if segments:
                    tokens.append(Token("PROTOCOL", segments))
                continue

            # Refiner: *name* or *name:arg*
            if ch == "*":
                i += 1  # skip opening *
                content = ""
                while i < n and expr[i] != "*":
                    content += expr[i]
                    i += 1
                if i < n and expr[i] == "*":
                    i += 1  # skip closing *
                if content:
                    tokens.append(Token("REFINER", content))
                continue

            # Bare word: item ID
            if ch.isalnum() or ch == "_":
                word = ""
                while i < n and (expr[i].isalnum() or expr[i] == "_"):
                    word += expr[i]
                    i += 1
                tokens.append(Token("ITEM_ID", word))
                continue

            # Unknown character — skip
            i += 1

        return tokens

    # ------------------------------------------------------------------
    # Parser
    # ------------------------------------------------------------------

    def _parse_query(self, tokens: list[Token]) -> list[str]:
        result: list[str] = []
        pos = 0

        first = self._parse_segment(tokens, pos)
        result = first.ids
        pos = first.pos

        while pos < len(tokens) and tokens[pos].type == "COMMA":
            pos += 1  # skip comma
            if pos >= len(tokens):
                break
            nxt = self._parse_segment(tokens, pos)
            result = result + nxt.ids
            pos = nxt.pos

        return result

    def _parse_segment(self, tokens: list[Token], pos: int) -> ParseResult:
        if pos >= len(tokens):
            return ParseResult([], pos)

        start_pos = pos
        first = self._parse_term(tokens, pos)
        result = first.ids
        pos = first.pos

        has_initial_term = pos > start_pos

        while pos < len(tokens):
            tok = tokens[pos]
            if tok.type not in ("PLUS", "PIPE", "MINUS"):
                break

            op = tok.type
            pos += 1  # skip operator

            if pos >= len(tokens):
                break

            right = self._parse_term(tokens, pos)
            pos = right.pos

            if not has_initial_term:
                result = right.ids
                has_initial_term = True
            elif op == "PLUS":
                right_set = set(right.ids)
                result = [x for x in result if x in right_set]
            elif op == "PIPE":
                seen = set(result)
                for x in right.ids:
                    if x not in seen:
                        result.append(x)
                        seen.add(x)
            elif op == "MINUS":
                right_set = set(right.ids)
                result = [x for x in result if x not in right_set]

        # Collect trailing refiners
        refiners: list[Token] = []
        while pos < len(tokens) and tokens[pos].type == "REFINER":
            if len(refiners) >= MAX_REFINERS:
                warnings.warn(
                    f"Refiner limit exceeded (max {MAX_REFINERS} per expression). "
                    "Skipping remaining refiners."
                )
                pos += 1
                continue
            refiners.append(tokens[pos])
            pos += 1

        if refiners:
            result = self._apply_refiners(result, refiners)

        return ParseResult(result, pos)

    def _parse_term(self, tokens: list[Token], pos: int) -> ParseResult:
        if pos >= len(tokens):
            return ParseResult([], pos)

        # Parenthesized group
        if tokens[pos].type == "LPAREN":
            self._depth += 1
            if self._depth > MAX_DEPTH:
                warnings.warn(f"Parentheses nesting exceeds max depth ({MAX_DEPTH}).")
                return ParseResult([], len(tokens))
            pos += 1  # skip (
            inner = self._parse_segment(tokens, pos)
            pos = inner.pos
            if pos < len(tokens) and tokens[pos].type == "RPAREN":
                pos += 1  # skip )
            self._depth -= 1
            return ParseResult(inner.ids, pos)

        return self._parse_atom(tokens, pos)

    def _parse_atom(self, tokens: list[Token], pos: int) -> ParseResult:
        if pos >= len(tokens):
            return ParseResult([], pos)

        token = tokens[pos]

        if token.type == "ITEM_ID":
            all_links = self._config.get("allLinks", {})
            link = all_links.get(token.value)
            ids = [token.value] if link and isinstance(link, dict) else []
            if not ids:
                warnings.warn(f'Item ID "{token.value}" not found in config.allLinks')
            return ParseResult(ids, pos + 1)

        if token.type == "CLASS":
            return ParseResult(self.search_by_class(token.value), pos + 1)

        if token.type == "REGEX":
            if "|" in token.value:
                pattern_key, field_opts = token.value.split("|", 1)
            else:
                pattern_key, field_opts = token.value, None
            return ParseResult(self.search_by_regex(pattern_key, field_opts), pos + 1)

        if token.type == "PROTOCOL":
            return ParseResult(self._resolve_protocol(token.value), pos + 1)

        if token.type == "DOM_REF":
            # Reserved for future use
            return ParseResult([], pos + 1)

        # Not a recognized atom — don't consume
        return ParseResult([], pos)


# ---------------------------------------------------------------------------
# Convenience: resolve expression → full link objects (mirrors AlapEngine)
# ---------------------------------------------------------------------------

def _sanitize_link(link: dict[str, Any]) -> dict[str, Any]:
    """Return a copy of *link* with its URL sanitized."""
    url = link.get("url")
    if url and isinstance(url, str):
        safe = sanitize_url(url)
        if safe != url:
            return {**link, "url": safe}
    return link


def resolve_expression(config: dict[str, Any], expression: str, anchor_id: str | None = None) -> list[dict[str, Any]]:
    """Resolve an expression against a config and return matching link objects with IDs."""
    parser = ExpressionParser(config)
    ids = parser.query(expression, anchor_id)
    all_links = config.get("allLinks", {})
    results = []
    for item_id in ids:
        link = all_links.get(item_id)
        if link and isinstance(link, dict):
            results.append({"id": item_id, **_sanitize_link(link)})
    return results


def cherry_pick_links(config: dict[str, Any], expression: str) -> dict[str, Any]:
    """Resolve an expression and return { allLinks: { id: link, ... } }."""
    parser = ExpressionParser(config)
    ids = parser.query(expression)
    all_links = config.get("allLinks", {})
    result: dict[str, Any] = {}
    for item_id in ids:
        link = all_links.get(item_id)
        if link and isinstance(link, dict):
            result[item_id] = _sanitize_link(link)
    return result


def merge_configs(*configs: dict[str, Any]) -> dict[str, Any]:
    """Shallow-merge multiple Alap configs. Later configs win on collision."""
    blocked = {"__proto__", "constructor", "prototype"}
    merged: dict[str, Any] = {}

    settings: dict[str, Any] = {}
    macros: dict[str, Any] = {}
    all_links: dict[str, Any] = {}
    search_patterns: dict[str, Any] = {}
    protocols: dict[str, Any] = {}

    for cfg in configs:
        if not isinstance(cfg, dict):
            continue
        for k, v in (cfg.get("settings") or {}).items():
            if k not in blocked:
                settings[k] = v
        for k, v in (cfg.get("macros") or {}).items():
            if k not in blocked:
                macros[k] = v
        for k, v in (cfg.get("allLinks") or {}).items():
            if k not in blocked:
                all_links[k] = v
        for k, v in (cfg.get("searchPatterns") or {}).items():
            if k not in blocked:
                search_patterns[k] = v
        for k, v in (cfg.get("protocols") or {}).items():
            if k not in blocked:
                protocols[k] = v

    if settings:
        merged["settings"] = settings
    if macros:
        merged["macros"] = macros
    merged["allLinks"] = all_links
    if search_patterns:
        merged["searchPatterns"] = search_patterns
    if protocols:
        merged["protocols"] = protocols

    return merged


# ---------------------------------------------------------------------------
# Config validation (port of src/core/validateConfig.ts)
# ---------------------------------------------------------------------------

# Keys whitelisted on individual link objects
_LINK_FIELD_WHITELIST = frozenset({
    "url", "label", "tags", "cssClass", "image", "altText",
    "targetWindow", "description", "thumbnail", "hooks", "guid", "createdAt",
})

# Keys that must never appear in any config dict (prototype-pollution in JS,
# plus Python-specific dunder attributes that could be abused).
_BLOCKED_KEYS = frozenset({
    "__proto__", "constructor", "prototype",
    "__class__", "__bases__", "__mro__", "__subclasses__",
})


def _is_blocked(key: str) -> bool:
    """Return True if *key* is in the blocked set."""
    return key in _BLOCKED_KEYS


def _has_hyphen(name: str) -> bool:
    return "-" in name


def validate_config(config: Any) -> dict:
    """Validate and sanitize an Alap config dict from an untrusted source.

    * Verifies structural shape (``allLinks`` is a dict, links have ``url``
      strings).
    * Sanitises all URLs (``url``, ``image``) via :func:`sanitize_url`.
    * Validates and removes dangerous regex search patterns via
      :func:`validate_regex`.
    * Filters prototype-pollution / dunder keys.
    * Rejects hyphens in item IDs, macro names, tag names, and search-pattern
      keys (``-`` is the WITHOUT operator in expressions).
    * Whitelists link fields so unexpected keys are silently dropped.

    Returns a *sanitized copy* — the input is never mutated.

    Raises :class:`ValueError` when the config is structurally invalid
    (e.g. missing ``allLinks``).
    """
    import copy

    if not isinstance(config, dict):
        raise ValueError("Invalid config: expected a dict")

    raw: dict = config

    # --- allLinks (required) ------------------------------------------------
    raw_links = raw.get("allLinks")
    if raw_links is None or not isinstance(raw_links, dict):
        raise ValueError("Invalid config: allLinks must be a non-null dict")

    sanitized_links: dict[str, dict] = {}

    for key in list(raw_links.keys()):
        if _is_blocked(key):
            continue

        if _has_hyphen(key):
            warnings.warn(
                f'validate_config: skipping allLinks["{key}"] — hyphens are '
                "not allowed in item IDs. Use underscores instead. The \"-\" "
                "character is the WITHOUT operator in expressions."
            )
            continue

        link = raw_links[key]
        if not isinstance(link, dict):
            warnings.warn(
                f'validate_config: skipping allLinks["{key}"] — not a valid '
                "link object"
            )
            continue

        raw_link: dict = link

        # url is required and must be a string
        if not isinstance(raw_link.get("url"), str):
            warnings.warn(
                f'validate_config: skipping allLinks["{key}"] — missing or '
                "invalid url"
            )
            continue

        # Sanitize URLs
        sanitized_url = sanitize_url(raw_link["url"])
        sanitized_image = (
            sanitize_url(raw_link["image"])
            if isinstance(raw_link.get("image"), str)
            else None
        )

        # tags must be a list of strings if present
        tags: list[str] | None = None
        if "tags" in raw_link:
            if isinstance(raw_link["tags"], list):
                clean_tags: list[str] = []
                for t in raw_link["tags"]:
                    if not isinstance(t, str):
                        continue
                    if _has_hyphen(t):
                        warnings.warn(
                            f'validate_config: allLinks["{key}"] — stripping '
                            f'tag "{t}" (hyphens not allowed in tags). Use '
                            "underscores instead."
                        )
                        continue
                    clean_tags.append(t)
                tags = clean_tags
            else:
                warnings.warn(
                    f'validate_config: allLinks["{key}"].tags is not a list '
                    "— ignoring"
                )

        # Build sanitized link using whitelist
        sanitized: dict[str, Any] = {"url": sanitized_url}
        if isinstance(raw_link.get("label"), str):
            sanitized["label"] = raw_link["label"]
        if tags is not None:
            sanitized["tags"] = tags
        if isinstance(raw_link.get("cssClass"), str):
            sanitized["cssClass"] = raw_link["cssClass"]
        if sanitized_image is not None:
            sanitized["image"] = sanitized_image
        if isinstance(raw_link.get("altText"), str):
            sanitized["altText"] = raw_link["altText"]
        if isinstance(raw_link.get("targetWindow"), str):
            sanitized["targetWindow"] = raw_link["targetWindow"]
        if isinstance(raw_link.get("description"), str):
            sanitized["description"] = raw_link["description"]
        if isinstance(raw_link.get("thumbnail"), str):
            sanitized["thumbnail"] = raw_link["thumbnail"]
        if isinstance(raw_link.get("hooks"), list):
            sanitized["hooks"] = [
                h for h in raw_link["hooks"] if isinstance(h, str)
            ]
        if isinstance(raw_link.get("guid"), str):
            sanitized["guid"] = raw_link["guid"]
        if "createdAt" in raw_link:
            sanitized["createdAt"] = raw_link["createdAt"]

        sanitized_links[key] = sanitized

    # --- settings (optional) ------------------------------------------------
    settings: dict | None = None
    raw_settings = raw.get("settings")
    if isinstance(raw_settings, dict):
        settings = {
            k: copy.deepcopy(v)
            for k, v in raw_settings.items()
            if not _is_blocked(k)
        }

    # --- macros (optional) --------------------------------------------------
    macros: dict | None = None
    raw_macros = raw.get("macros")
    if isinstance(raw_macros, dict):
        macros = {}
        for key in list(raw_macros.keys()):
            if _is_blocked(key):
                continue
            if _has_hyphen(key):
                warnings.warn(
                    f'validate_config: skipping macro "{key}" — hyphens are '
                    "not allowed in macro names. Use underscores instead. "
                    'The "-" character is the WITHOUT operator in expressions.'
                )
                continue
            macro = raw_macros[key]
            if (
                isinstance(macro, dict)
                and isinstance(macro.get("linkItems"), str)
            ):
                macros[key] = copy.deepcopy(macro)
            else:
                warnings.warn(
                    f'validate_config: skipping macro "{key}" — invalid shape'
                )

    # --- searchPatterns (optional) ------------------------------------------
    search_patterns: dict | None = None
    raw_patterns = raw.get("searchPatterns")
    if isinstance(raw_patterns, dict):
        search_patterns = {}
        for key in list(raw_patterns.keys()):
            if _is_blocked(key):
                continue
            if _has_hyphen(key):
                warnings.warn(
                    f'validate_config: skipping searchPattern "{key}" — '
                    "hyphens are not allowed in pattern keys. Use underscores "
                    'instead. The "-" character is the WITHOUT operator in '
                    "expressions."
                )
                continue
            entry = raw_patterns[key]

            # String shorthand
            if isinstance(entry, str):
                validation = validate_regex(entry)
                if validation["safe"]:
                    search_patterns[key] = entry
                else:
                    warnings.warn(
                        f'validate_config: removing searchPattern "{key}" — '
                        f'{validation["reason"]}'
                    )
                continue

            # Object (dict) form
            if isinstance(entry, dict) and isinstance(
                entry.get("pattern"), str
            ):
                pattern = entry["pattern"]
                validation = validate_regex(pattern)
                if validation["safe"]:
                    search_patterns[key] = copy.deepcopy(entry)
                else:
                    warnings.warn(
                        f'validate_config: removing searchPattern "{key}" — '
                        f'{validation["reason"]}'
                    )
                continue

            warnings.warn(
                f'validate_config: skipping searchPattern "{key}" — '
                "invalid shape"
            )

    # --- assemble result ----------------------------------------------------
    result: dict[str, Any] = {"allLinks": sanitized_links}
    if settings:
        result["settings"] = settings
    if macros:
        result["macros"] = macros
    if search_patterns:
        result["searchPatterns"] = search_patterns

    return result
