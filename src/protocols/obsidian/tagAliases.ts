/**
 * Copyright 2026 Daniel Smith — Apache 2.0
 *
 * Normalization + lookup helpers for `protocols.obsidian.tagAliases`.
 *
 * User config is a loose `Record<string, string>`; downstream code wants
 * two focused maps:
 *   - `keyToTag` — forward, used by the matcher to resolve `.key` atoms
 *     against the real Obsidian tag string.
 *   - `tagToKey` — reverse, used by the link builder to rewrite an
 *     emitted note's tags into their Alap-canonical handles.
 *
 * Invalid entries are dropped with a `warn()` so typos surface at startup
 * rather than manifesting as mysteriously unmatched selectors.
 */

import { warn } from '../../core/logger';

/** Alap CLASS-atom shape — same rule the tokenizer enforces for `.x`. */
const ALIAS_KEY_RE = /^[A-Za-z_]\w*$/;

/** Legal Obsidian tag body (after the leading `#` is stripped). */
const ALIAS_VALUE_RE = /^[A-Za-z_][\w/-]*$/;

export interface ResolvedTagAliases {
  /** `.key` → raw Obsidian tag string (e.g. `this-tag`, `work/project`). */
  keyToTag: Map<string, string>;
  /**
   * Raw Obsidian tag string → Alap-canonical key. When two aliases share a
   * value, first-declared wins — the other keys remain in `keyToTag` and
   * still work as match atoms, but only the first is the reverse handle
   * used when rewriting a link's tags.
   */
  tagToKey: Map<string, string>;
}

const EMPTY: ResolvedTagAliases = {
  keyToTag: new Map(),
  tagToKey: new Map(),
};

/**
 * Normalise raw user config into the two lookup maps. Tolerant: unknown
 * shapes (non-object, null, arrays) return empty maps. Invalid entries
 * within a valid object are dropped individually with a warn().
 */
export const resolveTagAliases = (raw: unknown): ResolvedTagAliases => {
  if (raw === undefined || raw === null) return EMPTY;
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    warn(':obsidian: tagAliases must be an object (key → tag-string)');
    return EMPTY;
  }

  const keyToTag = new Map<string, string>();
  const tagToKey = new Map<string, string>();

  for (const [rawKey, rawValue] of Object.entries(raw as Record<string, unknown>)) {
    if (!ALIAS_KEY_RE.test(rawKey)) {
      warn(`:obsidian: tagAliases key "${rawKey}" must match [A-Za-z_]\\w* — skipping`);
      continue;
    }
    if (typeof rawValue !== 'string') {
      warn(`:obsidian: tagAliases["${rawKey}"] must be a string — skipping`);
      continue;
    }
    const normalized = rawValue.trim().replace(/^#/, '');
    if (!normalized || !ALIAS_VALUE_RE.test(normalized)) {
      warn(`:obsidian: tagAliases["${rawKey}"] value "${rawValue}" is not a valid Obsidian tag — skipping`);
      continue;
    }

    keyToTag.set(rawKey, normalized);
    if (!tagToKey.has(normalized)) tagToKey.set(normalized, rawKey);
  }

  return { keyToTag, tagToKey };
};

/**
 * If `needle` exactly matches a declared alias key (case-insensitively —
 * the matcher lowercases the user's query), return the raw Obsidian tag
 * string as a lowercased additional needle. This is the symmetric twin of
 * `tagToKey` reverse-rewrite at emit time: `work_project` as a query term
 * reaches `#work/project` notes the same way the emitted link surfaces as
 * `.work_project` in expressions.
 *
 * Exact key match only — `:obsidian:core:work_proj:` does NOT alias-expand
 * to `work/project`; substring-matching the key would make the alias map
 * leak into surprising places.
 */
export const findAliasedNeedle = (
  needle: string,
  keyToTag: Map<string, string>,
): string | undefined => {
  if (needle === '' || keyToTag.size === 0) return undefined;
  for (const [key, value] of keyToTag) {
    if (key.toLowerCase() === needle) return value.toLowerCase();
  }
  return undefined;
};
