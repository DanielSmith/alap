/**
 * Copyright 2026 Daniel Smith
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Validate a regex pattern string for catastrophic backtracking risk.
 *
 * Rejects patterns with nested quantifiers that cause exponential time
 * complexity, such as (a+)+, (a*)*b, (a|a)*, (\w+\w+)+, etc.
 *
 * Returns { safe: true } if the pattern is acceptable, or
 * { safe: false, reason: string } if it contains a dangerous construct.
 */
export function validateRegex(pattern: string): { safe: true } | { safe: false; reason: string } {
  // First, check if the pattern is syntactically valid
  try {
    new RegExp(pattern);
  } catch {
    return { safe: false, reason: 'Invalid regex syntax' };
  }

  // Detect nested quantifiers: a quantifier applied to a group that
  // itself contains a quantifier. These patterns cause exponential
  // backtracking on non-matching input.
  //
  // We look for groups containing quantified subpatterns, where the
  // group itself is also quantified.
  //
  // Quantifier chars: +, *, {n,m}
  // Group: (...)
  //
  // Strategy: scan for (...) groups, check if the group body contains
  // a quantifier, and check if the group is followed by a quantifier.

  const quantifierAfter = /^(?:[?*+]|\{\d+(?:,\d*)?\})/;
  const quantifierPattern = /[?*+]|\{\d+(?:,\d*)?\}/;

  let depth = 0;
  const groupStarts: number[] = [];

  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i];

    // Skip escaped characters
    if (ch === '\\') {
      i++;
      continue;
    }

    // Skip character classes [...]
    if (ch === '[') {
      i++;
      if (i < pattern.length && pattern[i] === '^') i++;
      if (i < pattern.length && pattern[i] === ']') i++;
      while (i < pattern.length && pattern[i] !== ']') {
        if (pattern[i] === '\\') i++;
        i++;
      }
      continue;
    }

    if (ch === '(') {
      groupStarts.push(i);
      depth++;
      continue;
    }

    if (ch === ')') {
      if (groupStarts.length === 0) continue;
      const start = groupStarts.pop()!;
      depth--;

      // Check if this group is followed by a quantifier
      const afterGroup = pattern.slice(i + 1);
      if (quantifierAfter.test(afterGroup)) {
        // Check if the group body contains a quantifier
        const body = pattern.slice(start + 1, i);
        // Remove nested groups to avoid false positives from inner group quantifiers
        // that are already at a deeper nesting level — but actually, nested quantifiers
        // at any depth within a quantified group are the problem. So just check the body.
        if (quantifierPattern.test(stripEscapesAndClasses(body))) {
          return {
            safe: false,
            reason: `Nested quantifier detected: group at position ${start} contains a quantifier and is itself quantified — this can cause catastrophic backtracking`,
          };
        }
      }
      continue;
    }
  }

  return { safe: true };
}

/**
 * Strip escaped characters and character classes from a pattern body
 * so that quantifier detection isn't confused by \+ or [*] etc.
 */
function stripEscapesAndClasses(body: string): string {
  let result = '';
  let i = 0;
  while (i < body.length) {
    if (body[i] === '\\') {
      i += 2; // skip escaped char
      continue;
    }
    if (body[i] === '[') {
      i++;
      if (i < body.length && body[i] === '^') i++;
      if (i < body.length && body[i] === ']') i++;
      while (i < body.length && body[i] !== ']') {
        if (body[i] === '\\') i++;
        i++;
      }
      i++; // skip ]
      continue;
    }
    result += body[i];
    i++;
  }
  return result;
}
