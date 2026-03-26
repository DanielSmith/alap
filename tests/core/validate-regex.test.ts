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

import { describe, it, expect } from 'vitest';
import { validateRegex } from '../../src/core/validateRegex';
import { AlapEngine } from '../../src/core/AlapEngine';
import type { AlapConfig } from '../../src/core/types';

describe('validateRegex', () => {
  // --- Safe patterns ---

  it('accepts simple literal patterns', () => {
    expect(validateRegex('bridge')).toEqual({ safe: true });
  });

  it('accepts escaped dot patterns', () => {
    expect(validateRegex('wikipedia\\.org')).toEqual({ safe: true });
  });

  it('accepts alternation', () => {
    expect(validateRegex('bridge|tunnel')).toEqual({ safe: true });
  });

  it('accepts anchored patterns', () => {
    expect(validateRegex('^https')).toEqual({ safe: true });
  });

  it('accepts character classes with quantifiers', () => {
    expect(validateRegex('[a-z]+')).toEqual({ safe: true });
  });

  it('accepts non-capturing groups without nested quantifiers', () => {
    expect(validateRegex('(?:foo|bar)')).toEqual({ safe: true });
  });

  it('accepts groups with quantifier but no inner quantifier', () => {
    expect(validateRegex('(abc)+')).toEqual({ safe: true });
  });

  it('accepts quantified group with quantifier only in character class', () => {
    // [+*] inside a character class is a literal, not a quantifier
    expect(validateRegex('([+*])+')).toEqual({ safe: true });
  });

  it('accepts escaped quantifiers inside quantified groups', () => {
    // \\+ is a literal +, not a quantifier
    expect(validateRegex('(a\\+b)+')).toEqual({ safe: true });
  });

  it('accepts dot-star (linear backtracking)', () => {
    expect(validateRegex('.*foo')).toEqual({ safe: true });
  });

  it('accepts word boundary patterns', () => {
    expect(validateRegex('\\bbridge\\b')).toEqual({ safe: true });
  });

  // --- Dangerous patterns (nested quantifiers) ---

  it('rejects (a+)+', () => {
    const result = validateRegex('(a+)+');
    expect(result.safe).toBe(false);
  });

  it('rejects (a*)*', () => {
    const result = validateRegex('(a*)*');
    expect(result.safe).toBe(false);
  });

  it('rejects (a+)*', () => {
    const result = validateRegex('(a+)*');
    expect(result.safe).toBe(false);
  });

  it('rejects (a*)+', () => {
    const result = validateRegex('(a*)+');
    expect(result.safe).toBe(false);
  });

  it('rejects (a+){2,}', () => {
    const result = validateRegex('(a+){2,}');
    expect(result.safe).toBe(false);
  });

  it('rejects (\\w+\\w+)+', () => {
    const result = validateRegex('(\\w+\\w+)+');
    expect(result.safe).toBe(false);
  });

  it('accepts (a|a)*$ (no nested quantifier — alternation ambiguity is linear)', () => {
    // (a|a)* has no quantifier inside the group, just alternation.
    // The real ReDoS danger requires nested quantifiers like (a+|b)+.
    const result = validateRegex('(a|a)*$');
    expect(result.safe).toBe(true);
  });

  it('rejects (a+|b)+', () => {
    const result = validateRegex('(a+|b)+');
    expect(result.safe).toBe(false);
  });

  it('rejects ([a-z]+)+ (character class quantifier inside quantified group)', () => {
    const result = validateRegex('([a-z]+)+');
    expect(result.safe).toBe(false);
  });

  // --- Invalid syntax ---

  it('rejects invalid regex syntax', () => {
    const result = validateRegex('[invalid');
    expect(result.safe).toBe(false);
    expect(result.reason).toBe('Invalid regex syntax');
  });

  // --- Integration: dangerous pattern is blocked by ExpressionParser ---

  it('ExpressionParser returns empty for dangerous pattern', () => {
    const config: AlapConfig = {
      searchPatterns: {
        evil: { pattern: '(a+)+$' },
      },
      allLinks: {
        target: { url: 'https://example.com', label: 'aaaaaaaaaaaaaaaaaa!' },
      },
    };
    const engine = new AlapEngine(config);
    // Should return empty because the pattern is rejected, NOT hang
    expect(engine.query('/evil/')).toEqual([]);
  });

  it('ExpressionParser still works with safe patterns', () => {
    const config: AlapConfig = {
      searchPatterns: {
        safe: { pattern: 'bridge' },
      },
      allLinks: {
        brooklyn: { url: 'https://example.com', label: 'Brooklyn Bridge' },
        coffee: { url: 'https://example.com', label: 'Coffee Shop' },
      },
    };
    const engine = new AlapEngine(config);
    expect(engine.query('/safe/')).toEqual(['brooklyn']);
  });
});
