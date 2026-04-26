/**
 * Copyright 2026 Daniel Smith — Apache 2.0
 *
 * Field-restricted substring matching for Obsidian notes. Shared by
 * core (filesystem grep) and rest (post-filter after server search) so
 * both modes honour `fields=title;tags;body;path` with identical
 * semantics — a user's `fields=` narrow returns the same set whichever
 * sub-mode is running.
 */

import { OBSIDIAN_DEFAULT_SEARCH_FIELDS } from './constants';
import type { ObsidianNote, ObsidianSearchField } from './types';

/**
 * The expression tokenizer's character class excludes `,` from protocol
 * segments (see `PROTOCOL_RE` in `core/AlapEngine`), so in URL-style use
 * the list separator is `;`. We still accept `,` for programmatic callers
 * who bypass the tokenizer (tests, server-side resolution).
 */
const SEARCH_FIELDS_SEPARATOR = /[,;]/;

const ALLOWED_FIELDS: ObsidianSearchField[] = ['title', 'tags', 'body', 'path'];

/**
 * Parse a `fields=` argument — either a separator-delimited string
 * (`title;tags`, `title,tags`) or a string array — into a list of
 * {@link ObsidianSearchField}s. Unknown names are dropped; an empty
 * result falls back to the default set (all fields).
 */
export const resolveSearchFields = (raw: unknown): ObsidianSearchField[] => {
  const source = typeof raw === 'string'
    ? raw.split(SEARCH_FIELDS_SEPARATOR).map((s) => s.trim())
    : Array.isArray(raw) ? raw.map((s) => String(s).trim()) : null;

  if (!source || source.length === 0) return [...OBSIDIAN_DEFAULT_SEARCH_FIELDS];
  const filtered = source.filter((f): f is ObsidianSearchField => (ALLOWED_FIELDS as string[]).includes(f));
  return filtered.length > 0 ? filtered : [...OBSIDIAN_DEFAULT_SEARCH_FIELDS];
};

/**
 * Substring-match a note against `needle` within the given `fields`.
 * `needle` MUST already be lowercase — the caller controls normalization
 * so we don't re-lowercase on every comparison.
 *
 * `aliasedNeedle`, if present, is applied only within the `tags` field:
 * the caller precomputes it from `tagAliases` so we don't iterate the
 * alias map per note. This is the in-side of alias symmetry — tags emit
 * canonical on the way out (`tagToKey`), match via handle on the way in.
 *
 * Empty needle matches everything (the "no query" case, e.g.
 * `:obsidian:core::` → list all notes).
 */
export const matches = (
  note: ObsidianNote,
  needle: string,
  fields: ObsidianSearchField[],
  aliasedNeedle?: string,
): boolean => {
  if (needle === '') return true;

  for (const field of fields) {
    if (field === 'title') {
      const title = (typeof note.frontmatter.title === 'string' ? note.frontmatter.title : note.basename).toLowerCase();
      if (title.includes(needle)) return true;
    } else if (field === 'tags') {
      const raw = note.frontmatter.tags;
      const fmTags = Array.isArray(raw)
        ? raw.filter((t): t is string => typeof t === 'string')
        : typeof raw === 'string' ? [raw] : [];
      // Frontmatter + inline share the same semantic role as Obsidian tags.
      const pool = fmTags.length === 0 ? note.inlineTags
        : note.inlineTags.length === 0 ? fmTags
        : [...fmTags, ...note.inlineTags];
      for (const t of pool) {
        const lc = t.toLowerCase();
        if (lc.includes(needle)) return true;
        if (aliasedNeedle && lc.includes(aliasedNeedle)) return true;
      }
    } else if (field === 'body') {
      if (note.body.toLowerCase().includes(needle)) return true;
    } else if (field === 'path') {
      if (note.relPath.toLowerCase().includes(needle)) return true;
    }
  }
  return false;
};
