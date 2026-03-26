"""
Lightweight ReDoS guard for server-side regex parameters.

Rejects patterns with nested quantifiers that cause catastrophic
backtracking: (a+)+, (a*)*b, (\\w+\\w+)+, etc.

Same logic as alap/core's validateRegex, but standalone Python.
"""

import re


def validate_regex(pattern: str) -> dict:
    """
    Returns {"safe": True} or {"safe": False, "reason": "..."}.
    """
    try:
        re.compile(pattern)
    except re.error:
        return {"safe": False, "reason": "Invalid regex syntax"}

    quantifier_after = re.compile(r'^(?:[?*+]|\{\d+(?:,\d*)?\})')
    quantifier_in_body = re.compile(r'[?*+]|\{\d+(?:,\d*)?\}')

    group_starts = []
    i = 0
    while i < len(pattern):
        ch = pattern[i]

        # Skip escaped characters
        if ch == '\\':
            i += 2
            continue

        # Skip character classes [...]
        if ch == '[':
            i += 1
            if i < len(pattern) and pattern[i] == '^':
                i += 1
            if i < len(pattern) and pattern[i] == ']':
                i += 1
            while i < len(pattern) and pattern[i] != ']':
                if pattern[i] == '\\':
                    i += 1
                i += 1
            i += 1
            continue

        if ch == '(':
            group_starts.append(i)
            i += 1
            continue

        if ch == ')':
            if not group_starts:
                i += 1
                continue
            start = group_starts.pop()
            after_group = pattern[i + 1:]
            if quantifier_after.match(after_group):
                body = pattern[start + 1:i]
                stripped = _strip_escapes_and_classes(body)
                if quantifier_in_body.search(stripped):
                    return {
                        "safe": False,
                        "reason": "Nested quantifier detected — potential ReDoS",
                    }
            i += 1
            continue

        i += 1

    return {"safe": True}


def _strip_escapes_and_classes(body: str) -> str:
    result = []
    i = 0
    while i < len(body):
        if body[i] == '\\':
            i += 2
            continue
        if body[i] == '[':
            i += 1
            if i < len(body) and body[i] == '^':
                i += 1
            if i < len(body) and body[i] == ']':
                i += 1
            while i < len(body) and body[i] != ']':
                if body[i] == '\\':
                    i += 1
                i += 1
            i += 1
            continue
        result.append(body[i])
        i += 1
    return ''.join(result)
