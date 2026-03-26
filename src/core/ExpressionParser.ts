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

import type { AlapConfig, AlapSearchPattern, AlapSearchOptions, AlapLink } from './types';
import {
  MAX_DEPTH, MAX_TOKENS, MAX_MACRO_EXPANSIONS,
  MAX_REGEX_QUERIES, MAX_SEARCH_RESULTS, REGEX_TIMEOUT_MS,
  MAX_REFINERS,
} from '../constants';
import { warn } from './logger';
import { validateRegex } from './validateRegex';
import { resolveProtocol } from '../protocols/resolve';
import { applyRefiners as runRefiners, parseRefinerStep } from '../refiners/RefinerPipeline';

type TokenType =
  | 'ITEM_ID'
  | 'CLASS'
  | 'MACRO'
  | 'DOM_REF'
  | 'REGEX'
  | 'PROTOCOL'
  | 'REFINER'
  | 'PLUS'
  | 'PIPE'
  | 'MINUS'
  | 'COMMA'
  | 'LPAREN'
  | 'RPAREN';

interface Token {
  type: TokenType;
  value: string;
}

interface ParseResult {
  ids: string[];
  pos: number;
}

export class ExpressionParser {
  private config: AlapConfig;
  private depth: number = 0;
  private regexCount: number = 0;
  private generatedIds: Map<string, string[]> = new Map();

  constructor(config: AlapConfig) {
    this.config = config;
  }

  updateConfig(config: AlapConfig): void {
    this.config = config;
  }

  /**
   * Set the pre-resolved generate protocol results.
   * Called by AlapEngine.preResolve() before query().
   */
  setGeneratedIds(ids: Map<string, string[]>): void {
    this.generatedIds = ids;
  }

  /**
   * Parse an expression and return matching item IDs.
   */
  query(expression: string, anchorId?: string): string[] {
    if (!expression || typeof expression !== 'string') return [];
    const input = expression.trim();
    if (!input) return [];
    if (!this.config.allLinks || typeof this.config.allLinks !== 'object') return [];

    const expanded = this.expandMacros(input, anchorId);
    if (!expanded) return [];

    const tokens = this.tokenize(expanded);
    if (tokens.length === 0) return [];
    if (tokens.length > MAX_TOKENS) {
      warn(`Expression has ${tokens.length} tokens (max ${MAX_TOKENS}). Ignoring: "${expression.slice(0, 60)}..."`);
      return [];
    }

    this.depth = 0;
    this.regexCount = 0;
    const ids = this.parseQuery(tokens);
    return [...new Set(ids)];
  }

  /**
   * Find all item IDs carrying a given class (tag).
   */
  searchByClass(className: string): string[] {
    const allLinks = this.config.allLinks;
    if (!allLinks || typeof allLinks !== 'object') return [];

    const result: string[] = [];
    for (const [id, link] of Object.entries(allLinks)) {
      if (!link || !Array.isArray(link.tags)) continue;
      if (link.tags.includes(className)) {
        result.push(id);
      }
    }
    return result;
  }

  /**
   * Search allLinks using a named regex pattern from config.searchPatterns.
   * @param patternKey - Key into config.searchPatterns
   * @param fieldOpts - Optional field override characters (l, u, t, d, k, a)
   */
  searchByRegex(patternKey: string, fieldOpts?: string): string[] {
    this.regexCount++;
    if (this.regexCount > MAX_REGEX_QUERIES) {
      warn(`Regex query limit exceeded (max ${MAX_REGEX_QUERIES} per expression). Skipping /${patternKey}/`);
      return [];
    }

    const patterns = this.config.searchPatterns;
    if (!patterns || !(patternKey in patterns)) {
      warn(`Search pattern "${patternKey}" not found in config.searchPatterns`);
      return [];
    }

    const entry = patterns[patternKey];
    const spec: AlapSearchPattern = typeof entry === 'string'
      ? { pattern: entry }
      : entry;

    const validation = validateRegex(spec.pattern);
    if (!validation.safe) {
      warn(`Unsafe regex pattern "${spec.pattern}" in searchPatterns["${patternKey}"]: ${validation.reason}`);
      return [];
    }

    let re: RegExp;
    try {
      re = new RegExp(spec.pattern, 'i');
    } catch {
      warn(`Invalid regex pattern "${spec.pattern}" in searchPatterns["${patternKey}"]`);
      return [];
    }

    const opts: AlapSearchOptions = spec.options ?? {};
    const fields = this.parseFieldCodes(fieldOpts || opts.fields || 'a');

    const allLinks = this.config.allLinks;
    if (!allLinks || typeof allLinks !== 'object') return [];

    const now = Date.now();
    const maxAge = opts.age ? this.parseAge(opts.age) : 0;
    const limit = opts.limit ?? MAX_SEARCH_RESULTS;
    const startTime = Date.now();

    const result: Array<{ id: string; createdAt: number }> = [];

    for (const [id, link] of Object.entries(allLinks)) {
      if (!link || typeof link !== 'object') continue;

      // Timeout guard
      if (Date.now() - startTime > REGEX_TIMEOUT_MS) {
        warn(`Regex search /${patternKey}/ timed out after ${REGEX_TIMEOUT_MS}ms — returning partial results`);
        break;
      }

      // Age filter
      if (maxAge > 0) {
        const ts = this.toTimestamp(link.createdAt);
        if (ts === 0 || (now - ts) > maxAge) continue;
      }

      // Field matching
      if (this.matchesFields(re, id, link, fields)) {
        const ts = link.createdAt ? this.toTimestamp(link.createdAt) : 0;
        result.push({ id, createdAt: ts });
        if (result.length >= MAX_SEARCH_RESULTS) {
          warn(`Regex search /${patternKey}/ hit ${MAX_SEARCH_RESULTS} result cap — truncating`);
          break;
        }
      }
    }

    // Sort
    if (opts.sort === 'alpha') {
      result.sort((a, b) => a.id.localeCompare(b.id));
    } else if (opts.sort === 'newest') {
      result.sort((a, b) => b.createdAt - a.createdAt);
    } else if (opts.sort === 'oldest') {
      result.sort((a, b) => a.createdAt - b.createdAt);
    }

    return result.slice(0, limit).map(r => r.id);
  }

  /**
   * Resolve a protocol expression. Delegates to protocols/resolve.ts.
   */
  private resolveProtocol(value: string): string[] {
    return resolveProtocol(value, this.config, this.generatedIds);
  }

  /**
   * Apply refiners to a set of IDs. Resolves IDs to link objects,
   * delegates to refiners/RefinerPipeline.ts, returns refined ID list.
   */
  private applyRefiners(ids: string[], refiners: Token[]): string[] {
    if (refiners.length === 0) return ids;

    const allLinks = this.config.allLinks;
    const links = ids
      .map(id => {
        const link = allLinks[id];
        return link ? { id, ...link } : null;
      })
      .filter((l): l is { id: string } & AlapLink => l !== null);

    const steps = refiners.map(t => parseRefinerStep(t.value));
    const refined = runRefiners(links, steps);
    return refined.map(l => l.id);
  }

  /** Parse field code string into a set of field names */
  private parseFieldCodes(codes: string): Set<string> {
    const fields = new Set<string>();
    const cleaned = codes.replace(/[\s,]/g, '');
    for (const ch of cleaned) {
      switch (ch) {
        case 'l': fields.add('label'); break;
        case 'u': fields.add('url'); break;
        case 't': fields.add('tags'); break;
        case 'd': fields.add('description'); break;
        case 'k': fields.add('id'); break;
        case 'a':
          fields.add('label');
          fields.add('url');
          fields.add('tags');
          fields.add('description');
          fields.add('id');
          break;
      }
    }
    return fields.size > 0 ? fields : new Set(['label', 'url', 'tags', 'description', 'id']);
  }

  /** Test whether a link matches the regex in any of the specified fields */
  private matchesFields(
    re: RegExp,
    id: string,
    link: { label?: string; url: string; tags?: string[]; description?: string },
    fields: Set<string>,
  ): boolean {
    if (fields.has('id') && re.test(id)) return true;
    if (fields.has('label') && link.label && re.test(link.label)) return true;
    if (fields.has('url') && re.test(link.url)) return true;
    if (fields.has('description') && link.description && re.test(link.description)) return true;
    if (fields.has('tags') && link.tags) {
      for (const tag of link.tags) {
        if (re.test(tag)) return true;
      }
    }
    return false;
  }

  /** Parse age string (e.g. "30d", "24h", "2w") to milliseconds */
  private parseAge(age: string): number {
    const match = age.match(/^(\d+)\s*([dhwm])$/i);
    if (!match) return 0;
    const n = parseInt(match[1], 10);
    switch (match[2].toLowerCase()) {
      case 'h': return n * 60 * 60 * 1000;
      case 'd': return n * 24 * 60 * 60 * 1000;
      case 'w': return n * 7 * 24 * 60 * 60 * 1000;
      case 'm': return n * 30 * 24 * 60 * 60 * 1000;
      default: return 0;
    }
  }

  /** Convert createdAt value to a Unix ms timestamp */
  private toTimestamp(value: string | number | undefined): number {
    if (value === undefined || value === null) return 0;
    if (typeof value === 'number') return value;
    const d = new Date(value);
    return isNaN(d.getTime()) ? 0 : d.getTime();
  }

  // --- Macro expansion ---

  private expandMacros(expr: string, anchorId?: string): string {
    let result = expr;
    let rounds = 0;

    // Expand iteratively — a macro's linkItems may contain other @macros
    while (result.includes('@') && rounds < MAX_MACRO_EXPANSIONS) {
      const before = result;
      result = result.replace(/@(\w*)/g, (_match, name: string) => {
        const macroName = name || anchorId || '';
        if (!macroName) return '';

        const macro = this.config.macros?.[macroName];
        if (!macro || typeof macro.linkItems !== 'string') {
          warn(`Macro "@${macroName}" not found in config.macros`);
          return '';
        }
        return macro.linkItems;
      });

      // No change means no more macros to expand (or all were invalid)
      if (result === before) break;
      rounds++;
    }

    if (rounds >= MAX_MACRO_EXPANSIONS && result.includes('@')) {
      warn(`Macro expansion hit ${MAX_MACRO_EXPANSIONS}-round limit — possible circular reference in "${expr.slice(0, 60)}"`);
    }

    return result;
  }

  // --- Tokenizer ---

  private tokenize(expr: string): Token[] {
    const tokens: Token[] = [];
    let i = 0;

    while (i < expr.length) {
      const ch = expr[i];

      if (/\s/.test(ch)) { i++; continue; }

      if (ch === '+') { tokens.push({ type: 'PLUS', value: '+' }); i++; continue; }
      if (ch === '|') { tokens.push({ type: 'PIPE', value: '|' }); i++; continue; }
      if (ch === '-') { tokens.push({ type: 'MINUS', value: '-' }); i++; continue; }
      if (ch === ',') { tokens.push({ type: 'COMMA', value: ',' }); i++; continue; }
      if (ch === '(') { tokens.push({ type: 'LPAREN', value: '(' }); i++; continue; }
      if (ch === ')') { tokens.push({ type: 'RPAREN', value: ')' }); i++; continue; }

      // Class: .word
      if (ch === '.') {
        i++;
        let word = '';
        while (i < expr.length && /\w/.test(expr[i])) {
          word += expr[i];
          i++;
        }
        if (word) tokens.push({ type: 'CLASS', value: word });
        continue;
      }

      // DOM ref: #word
      if (ch === '#') {
        i++;
        let word = '';
        while (i < expr.length && /\w/.test(expr[i])) {
          word += expr[i];
          i++;
        }
        if (word) tokens.push({ type: 'DOM_REF', value: word });
        continue;
      }

      // Regex search: /patternKey/options
      if (ch === '/') {
        i++; // skip opening /
        let key = '';
        while (i < expr.length && expr[i] !== '/') {
          key += expr[i];
          i++;
        }
        let opts = '';
        if (i < expr.length && expr[i] === '/') {
          i++; // skip closing /
          while (i < expr.length && /[lutdka]/.test(expr[i])) {
            opts += expr[i];
            i++;
          }
        }
        if (key) {
          // value encodes "key|opts" so parseAtom can split them
          tokens.push({ type: 'REGEX', value: opts ? `${key}|${opts}` : key });
        }
        continue;
      }

      // Protocol: :name:arg1:arg2:
      if (ch === ':') {
        i++; // skip opening :
        let segments = '';
        while (i < expr.length && expr[i] !== ':') {
          segments += expr[i];
          i++;
        }
        // Collect remaining segments
        while (i < expr.length && expr[i] === ':') {
          i++; // skip :
          if (i >= expr.length || /[\s+|,()*/]/.test(expr[i])) break; // trailing : ends the protocol
          segments += '|';
          while (i < expr.length && expr[i] !== ':') {
            segments += expr[i];
            i++;
          }
        }
        if (segments) {
          tokens.push({ type: 'PROTOCOL', value: segments });
        }
        continue;
      }

      // Refiner: *name* or *name:arg*
      if (ch === '*') {
        i++; // skip opening *
        let content = '';
        while (i < expr.length && expr[i] !== '*') {
          content += expr[i];
          i++;
        }
        if (i < expr.length && expr[i] === '*') {
          i++; // skip closing *
        }
        if (content) {
          tokens.push({ type: 'REFINER', value: content });
        }
        continue;
      }

      // Bare word: item ID
      if (/\w/.test(ch)) {
        let word = '';
        while (i < expr.length && /\w/.test(expr[i])) {
          word += expr[i];
          i++;
        }
        tokens.push({ type: 'ITEM_ID', value: word });
        continue;
      }

      // Unknown character — skip
      i++;
    }

    return tokens;
  }

  // --- Parser ---
  //
  // Grammar:
  //   query   = segment (',' segment)*
  //   segment = term (op term)* refiner*
  //   op      = '+' | '|' | '-'
  //   term    = '(' segment ')' | atom
  //   atom    = ITEM_ID | CLASS | DOM_REF | REGEX | PROTOCOL
  //   refiner = '*' name (':' arg)* '*'

  private parseQuery(tokens: Token[]): string[] {
    let result: string[] = [];
    let pos = 0;

    const first = this.parseSegment(tokens, pos);
    result = first.ids;
    pos = first.pos;

    while (pos < tokens.length && tokens[pos].type === 'COMMA') {
      pos++; // skip comma
      if (pos >= tokens.length) break;
      const next = this.parseSegment(tokens, pos);
      result = [...result, ...next.ids];
      pos = next.pos;
    }

    return result;
  }

  private parseSegment(tokens: Token[], pos: number): ParseResult {
    if (pos >= tokens.length) return { ids: [], pos };

    const startPos = pos;
    const first = this.parseTerm(tokens, pos);
    let result = first.ids;
    pos = first.pos;

    // Track whether a real term was consumed (vs. a leading operator)
    let hasInitialTerm = pos > startPos;

    while (pos < tokens.length) {
      const token = tokens[pos];
      if (token.type !== 'PLUS' && token.type !== 'PIPE' && token.type !== 'MINUS') {
        break;
      }

      const op = token.type;
      pos++; // skip operator

      if (pos >= tokens.length) break;

      const right = this.parseTerm(tokens, pos);
      pos = right.pos;

      if (!hasInitialTerm) {
        // Leading operator with no preceding operand — use right side as initial set
        result = right.ids;
        hasInitialTerm = true;
      } else if (op === 'PLUS') {
        const rightSet = new Set(right.ids);
        result = result.filter(id => rightSet.has(id));
      } else if (op === 'PIPE') {
        result = [...new Set([...result, ...right.ids])];
      } else if (op === 'MINUS') {
        const rightSet = new Set(right.ids);
        result = result.filter(id => !rightSet.has(id));
      }
    }

    // Collect trailing refiners
    const refiners: Token[] = [];
    while (pos < tokens.length && tokens[pos].type === 'REFINER') {
      if (refiners.length >= MAX_REFINERS) {
        warn(`Refiner limit exceeded (max ${MAX_REFINERS} per expression). Skipping remaining refiners.`);
        pos++;
        continue;
      }
      refiners.push(tokens[pos]);
      pos++;
    }

    if (refiners.length > 0) {
      result = this.applyRefiners(result, refiners);
    }

    return { ids: result, pos };
  }

  private parseTerm(tokens: Token[], pos: number): ParseResult {
    if (pos >= tokens.length) return { ids: [], pos };

    // Parenthesized group
    if (tokens[pos].type === 'LPAREN') {
      this.depth++;
      if (this.depth > MAX_DEPTH) {
        warn(`Parentheses nesting exceeds max depth (${MAX_DEPTH}). Ignoring nested group.`);
        return { ids: [], pos: tokens.length };
      }
      pos++; // skip (
      const inner = this.parseSegment(tokens, pos);
      pos = inner.pos;
      if (pos < tokens.length && tokens[pos].type === 'RPAREN') {
        pos++; // skip )
      }
      this.depth--;
      return { ids: inner.ids, pos };
    }

    return this.parseAtom(tokens, pos);
  }

  private parseAtom(tokens: Token[], pos: number): ParseResult {
    if (pos >= tokens.length) return { ids: [], pos };

    const token = tokens[pos];

    switch (token.type) {
      case 'ITEM_ID': {
        const link = this.config.allLinks[token.value];
        if (!link || typeof link !== 'object') {
          warn(`Item ID "${token.value}" not found in config.allLinks`);
        }
        const ids = (link && typeof link === 'object') ? [token.value] : [];
        return { ids, pos: pos + 1 };
      }
      case 'CLASS': {
        return { ids: this.searchByClass(token.value), pos: pos + 1 };
      }
      case 'REGEX': {
        const [patternKey, fieldOpts] = token.value.includes('|')
          ? token.value.split('|', 2)
          : [token.value, undefined];
        return { ids: this.searchByRegex(patternKey, fieldOpts), pos: pos + 1 };
      }
      case 'PROTOCOL': {
        return { ids: this.resolveProtocol(token.value), pos: pos + 1 };
      }
      case 'DOM_REF': {
        // Future: resolve from DOM element's data-alap-linkitems
        return { ids: [], pos: pos + 1 };
      }
      default:
        // Not a recognized atom — don't consume it
        return { ids: [], pos };
    }
  }
}
