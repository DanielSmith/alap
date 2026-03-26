/**
 * Lightweight ReDoS guard for server-side regex parameters.
 *
 * Rejects patterns with nested quantifiers that cause catastrophic
 * backtracking: (a+)+, (a*)*b, (\w+\w+)+, etc.
 *
 * Same logic as alap/core's validateRegex, but standalone (no alap dependency).
 */

const QUANTIFIER_AFTER = /^(?:[?*+]|\{\d+(?:,\d*)?\})/;
const QUANTIFIER_IN_BODY = /[?*+]|\{\d+(?:,\d*)?\}/;

function stripEscapesAndClasses(body) {
  let result = '';
  let i = 0;
  while (i < body.length) {
    if (body[i] === '\\') { i += 2; continue; }
    if (body[i] === '[') {
      i++;
      if (i < body.length && body[i] === '^') i++;
      if (i < body.length && body[i] === ']') i++;
      while (i < body.length && body[i] !== ']') {
        if (body[i] === '\\') i++;
        i++;
      }
      i++;
      continue;
    }
    result += body[i];
    i++;
  }
  return result;
}

/**
 * @param {string} pattern
 * @returns {{ safe: true } | { safe: false, reason: string }}
 */
export function validateRegex(pattern) {
  try { new RegExp(pattern); } catch {
    return { safe: false, reason: 'Invalid regex syntax' };
  }

  const groupStarts = [];
  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i];
    if (ch === '\\') { i++; continue; }
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
    if (ch === '(') { groupStarts.push(i); continue; }
    if (ch === ')') {
      if (groupStarts.length === 0) continue;
      const start = groupStarts.pop();
      const afterGroup = pattern.slice(i + 1);
      if (QUANTIFIER_AFTER.test(afterGroup)) {
        const body = pattern.slice(start + 1, i);
        if (QUANTIFIER_IN_BODY.test(stripEscapesAndClasses(body))) {
          return { safe: false, reason: 'Nested quantifier detected — potential ReDoS' };
        }
      }
    }
  }
  return { safe: true };
}
