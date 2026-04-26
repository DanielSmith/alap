/**
 * Copyright 2026 Daniel Smith — Apache 2.0
 *
 * Thumbnail extraction + tier-1/2/3 URL rewriting for vault media.
 * The handler never serves media itself — it only decides what string
 * to put in `AlapLink.thumbnail`.
 */

import {
  OBSIDIAN_DEFAULT_THUMBNAIL_FIELDS,
  OBSIDIAN_MEDIA_ROUTE_PREFIX,
} from './constants';

/**
 * Inline image regex for both `![[wikilink]]` and `![alt](path)` forms.
 * We extract the *first* match only — frontmatter fields win over body
 * content, so this is the fallback path.
 */
const WIKILINK_IMG_RE = /!\[\[([^\]]+?)\]\]/;
const MD_IMG_RE = /!\[[^\]]*\]\(([^)]+?)\)/;

export interface ResolveThumbnailArgs {
  /** Parsed frontmatter. */
  frontmatter: Record<string, unknown>;
  /** Note body (possibly truncated). */
  body: string;
  /** Frontmatter keys consulted in order. Defaults baked into the handler. */
  thumbnailFields?: readonly string[];
  /** Tier-3 base URL. If set, the returned URL is prefixed with it. */
  mediaBaseUrl?: string | null;
}

/**
 * Pick a thumbnail for a note. Returns undefined when no image is
 * referenced. The returned URL is always a string ready for
 * `AlapLink.thumbnail`:
 *
 *  - Already-absolute URLs in frontmatter/body pass through unchanged.
 *  - Vault-relative attachments get prefixed with `mediaBaseUrl` if set,
 *    or {@link OBSIDIAN_MEDIA_ROUTE_PREFIX} otherwise (tier 2 reference).
 */
export const resolveThumbnail = (args: ResolveThumbnailArgs): string | undefined => {
  const fields = args.thumbnailFields ?? OBSIDIAN_DEFAULT_THUMBNAIL_FIELDS;

  const fromFrontmatter = pickFrontmatterImage(args.frontmatter, fields);
  const raw = fromFrontmatter ?? pickBodyImage(args.body);
  if (!raw) return undefined;

  return prefixMediaUrl(raw.trim(), args.mediaBaseUrl);
};

const pickFrontmatterImage = (
  fm: Record<string, unknown>,
  fields: readonly string[],
): string | undefined => {
  for (const field of fields) {
    const val = fm[field];
    if (typeof val === 'string' && val.trim()) return val;
    if (Array.isArray(val) && typeof val[0] === 'string' && val[0].trim()) return val[0];
  }
  return undefined;
};

const pickBodyImage = (body: string): string | undefined => {
  const wiki = body.match(WIKILINK_IMG_RE);
  if (wiki) {
    // Wikilinks can carry a display alias after `|`; strip it.
    const pipeIdx = wiki[1].indexOf('|');
    return pipeIdx === -1 ? wiki[1] : wiki[1].slice(0, pipeIdx);
  }
  const md = body.match(MD_IMG_RE);
  if (md) return md[1];
  return undefined;
};

const prefixMediaUrl = (raw: string, mediaBaseUrl: string | null | undefined): string => {
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw) || raw.startsWith('//')) {
    return raw;
  }

  const prefix = mediaBaseUrl && mediaBaseUrl.length > 0
    ? (mediaBaseUrl.endsWith('/') ? mediaBaseUrl : `${mediaBaseUrl}/`)
    : OBSIDIAN_MEDIA_ROUTE_PREFIX;

  const path = raw.startsWith('/') ? raw.slice(1) : raw;
  return `${prefix}${encodeMediaPath(path)}`;
};

const encodeMediaPath = (path: string): string =>
  path.split('/').map((seg) => encodeURIComponent(seg)).join('/');
