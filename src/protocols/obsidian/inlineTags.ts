/**
 * Copyright 2026 Daniel Smith — Apache 2.0
 *
 * Inline `#tag` body scanner for the `:obsidian:` protocol. Real Obsidian
 * vaults tag primarily in note bodies, not frontmatter, so a vault with
 * only inline tags would look untagged without this pass.
 *
 * Captures the full Obsidian-side tag token faithfully (including `/` for
 * nested tags) — Alap never decomposes hierarchies. What the expression
 * engine can address with `.tag` atoms is handled one layer up by the
 * optional `tagAliases` map; this module is only about faithful discovery.
 */

/** Max inline tags captured per note. Defensive upper bound. */
export const INLINE_TAGS_MAX_PER_NOTE = 500;

/**
 * Tag-body pattern — first char is letter or underscore (Obsidian rejects
 * all-digit tags and tags whose first char is a digit), rest is word
 * chars plus `-` and `/`. Non-backtracking.
 */
const TAG_BODY_RE = /(?:^|\s)#([A-Za-z_][\w/-]*)/g;

/**
 * Strip fenced code blocks (``` … ```) and inline code (`…`) from body
 * before tag scanning. Replaces each code region with a single space so
 * boundary context (the "preceded by whitespace" gate) still fires
 * correctly on text immediately before and after the region.
 *
 * Unterminated fences/spans are treated as closing at EOF — common in
 * notes mid-edit; better to under-tag than to throw.
 */
const stripCodeRegions = (body: string): string => {
  let out = '';
  let i = 0;
  const n = body.length;
  while (i < n) {
    if (body[i] === '`' && body[i + 1] === '`' && body[i + 2] === '`') {
      const close = body.indexOf('```', i + 3);
      out += ' ';
      if (close === -1) break;
      i = close + 3;
      continue;
    }
    if (body[i] === '`') {
      const close = body.indexOf('`', i + 1);
      if (close === -1) {
        out += body[i];
        i++;
        continue;
      }
      out += ' ';
      i = close + 1;
      continue;
    }
    out += body[i];
    i++;
  }
  return out;
};

/**
 * Scan a note body for inline `#tags`. Returns unique tag strings (without
 * the leading `#`), in first-occurrence order, preserving original case.
 *
 * Rules:
 * - `#` must be at line start or preceded by whitespace.
 * - First char after `#` must be a letter or `_` (rejects `#123`, `#-foo`).
 * - Body chars are letters, digits, `_`, `-`, `/` — `/` preserved for
 *   Obsidian's nested-tag syntax. Alap does nothing hierarchical with it;
 *   the raw string is just faithful metadata.
 * - Markdown headings (`#`, `##`, … followed by space) never match because
 *   the first-char class excludes `#` and whitespace.
 * - Code fences and inline code are stripped before matching.
 * - URL fragments (`example.com/#section`) and wikilink section refs
 *   (`[[note#heading]]`) never match — the `#` is preceded by a non-
 *   whitespace character.
 */
export const scanInlineTags = (body: string): string[] => {
  const cleaned = stripCodeRegions(body);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of cleaned.matchAll(TAG_BODY_RE)) {
    const name = m[1];
    if (seen.has(name)) continue;
    seen.add(name);
    out.push(name);
    if (out.length >= INLINE_TAGS_MAX_PER_NOTE) break;
  }
  return out;
};
