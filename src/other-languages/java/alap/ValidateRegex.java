// Copyright 2026 Daniel Smith
// Licensed under the Apache License, Version 2.0
// See https://www.apache.org/licenses/LICENSE-2.0

package alap;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;
import java.util.regex.PatternSyntaxException;

/**
 * Lightweight ReDoS guard for server-side regex parameters.
 *
 * <p>Rejects patterns with nested quantifiers that cause catastrophic
 * backtracking: {@code (a+)+}, {@code (a*)*b}, {@code (\w+\w+)+}, etc.
 */
public final class ValidateRegex {

    private static final Pattern QUANTIFIER_AFTER =
        Pattern.compile("^(?:[?*+]|\\{\\d+(?:,\\d*)?\\})");

    private static final Pattern QUANTIFIER_IN_BODY =
        Pattern.compile("[?*+]|\\{\\d+(?:,\\d*)?\\}");

    private ValidateRegex() {}

    /**
     * Returns a validation result: safe or unsafe with reason.
     */
    public static Config.RegexValidation validate(String pattern) {
        // First: can it even compile?
        try {
            Pattern.compile(pattern);
        } catch (PatternSyntaxException e) {
            return Config.RegexValidation.fail("Invalid regex syntax");
        }

        // Check for nested quantifiers
        List<Integer> groupStarts = new ArrayList<>();
        int i = 0;
        int len = pattern.length();

        while (i < len) {
            char ch = pattern.charAt(i);

            // Skip escaped characters
            if (ch == '\\') {
                i += 2;
                continue;
            }

            // Skip character classes [...]
            if (ch == '[') {
                i++;
                if (i < len && pattern.charAt(i) == '^') i++;
                if (i < len && pattern.charAt(i) == ']') i++;
                while (i < len && pattern.charAt(i) != ']') {
                    if (pattern.charAt(i) == '\\') i++;
                    i++;
                }
                i++;
                continue;
            }

            if (ch == '(') {
                groupStarts.add(i);
                i++;
                continue;
            }

            if (ch == ')') {
                if (groupStarts.isEmpty()) {
                    i++;
                    continue;
                }
                int start = groupStarts.removeLast();
                String afterGroup = pattern.substring(i + 1);
                if (QUANTIFIER_AFTER.matcher(afterGroup).find()) {
                    String body = pattern.substring(start + 1, i);
                    String stripped = stripEscapesAndClasses(body);
                    if (QUANTIFIER_IN_BODY.matcher(stripped).find()) {
                        return Config.RegexValidation.fail(
                            "Nested quantifier detected — potential ReDoS");
                    }
                }
                i++;
                continue;
            }

            i++;
        }

        return Config.RegexValidation.ok();
    }

    private static String stripEscapesAndClasses(String body) {
        var sb = new StringBuilder();
        int i = 0;
        int len = body.length();

        while (i < len) {
            if (body.charAt(i) == '\\') {
                i += 2;
                continue;
            }
            if (body.charAt(i) == '[') {
                i++;
                if (i < len && body.charAt(i) == '^') i++;
                if (i < len && body.charAt(i) == ']') i++;
                while (i < len && body.charAt(i) != ']') {
                    if (body.charAt(i) == '\\') i++;
                    i++;
                }
                i++;
                continue;
            }
            sb.append(body.charAt(i));
            i++;
        }

        return sb.toString();
    }
}
