/**
 * Copyright 2026 Daniel Smith — Apache 2.0
 *
 * Maps an {@link ObsidianNote} to an {@link AlapLink}. Shared by core
 * and rest modes so both emit identical link shapes.
 */

import type { AlapLink } from '../../core/types';
import { expandTemplate } from '../shared';
import {
  OBSIDIAN_LINK_CSS_CLASS,
  OBSIDIAN_LINK_SOURCE,
  OBSIDIAN_LINK_TARGET_WINDOW,
  OBSIDIAN_URI_TEMPLATE,
} from './constants';
import { resolveThumbnail } from './mediaResolver';
import type { ObsidianNote } from './types';

export interface BuildLinkArgs {
  note: ObsidianNote;
  vault: string;
  linkTemplate?: string;
  thumbnailFields?: readonly string[];
  mediaBaseUrl?: string | null;
  /**
   * Reverse alias map from raw Obsidian tag string → Alap-canonical key.
   * When present, each emitted tag is looked up here and replaced with its
   * handle so Alap `.className` atoms can reach tags containing `-` or `/`.
   * Entries with no alias fall through verbatim — callers get raw tags by
   * default, aliased ones on request.
   */
  tagToKey?: Map<string, string>;
  /**
   * Author-supplied widening for the renderer's strict-tier URL sanitizer.
   * Stamped onto each emitted link so `obsidian://` URIs survive at the
   * `protocol:obsidian` tier. `validateConfig` strips `allowedSchemes`
   * from non-author tiers and the library-side `SCHEME_CEILING`
   * intersects the final list, so passing an unknown scheme is a no-op
   * rather than an escalation.
   */
  allowedSchemes?: readonly string[];
}

/**
 * Note → AlapLink. Always populates `url`; label/tags/description/thumbnail
 * depend on frontmatter presence.
 */
export const buildLink = (args: BuildLinkArgs): AlapLink => {
  const { note, vault } = args;
  const template = args.linkTemplate ?? OBSIDIAN_URI_TEMPLATE;

  const url = expandTemplate(template, { vault, path: note.relPath });
  const label = pickLabel(note);
  const tags = pickTags(note, args.tagToKey);
  const description = pickDescription(note);
  const thumbnail = resolveThumbnail({
    frontmatter: note.frontmatter,
    body: note.body,
    thumbnailFields: args.thumbnailFields,
    mediaBaseUrl: args.mediaBaseUrl,
  });

  const link: AlapLink = {
    url,
    label,
    cssClass: OBSIDIAN_LINK_CSS_CLASS,
    targetWindow: OBSIDIAN_LINK_TARGET_WINDOW,
    meta: {
      source: OBSIDIAN_LINK_SOURCE,
      path: note.relPath,
    },
  };
  if (tags.length > 0) link.tags = tags;
  if (description) link.description = description;
  if (thumbnail) link.thumbnail = thumbnail;
  if (args.allowedSchemes && args.allowedSchemes.length > 0) {
    link.allowedSchemes = [...args.allowedSchemes];
  }
  return link;
};

const pickLabel = (note: ObsidianNote): string => {
  const fm = note.frontmatter;
  if (typeof fm.title === 'string' && fm.title.trim()) return fm.title.trim();
  return note.basename;
};

/**
 * Collect a note's tags from both frontmatter and inline `#tags` in the
 * body, dedupe (first occurrence wins, frontmatter first), and optionally
 * rewrite through `tagToKey` so expression-unfriendly shapes (`this-tag`,
 * `work/project`) surface as their Alap handles.
 */
const pickTags = (note: ObsidianNote, tagToKey?: Map<string, string>): string[] => {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (tag: string): void => {
    if (tag.length === 0 || seen.has(tag)) return;
    seen.add(tag);
    out.push(tag);
  };

  for (const raw of fromFrontmatter(note.frontmatter)) push(raw);
  for (const raw of note.inlineTags) push(raw);

  if (!tagToKey || tagToKey.size === 0) return out;
  return out.map((tag) => tagToKey.get(tag) ?? tag);
};

const fromFrontmatter = (fm: Record<string, unknown>): string[] => {
  const raw = fm.tags;
  if (Array.isArray(raw)) {
    return raw.filter((t): t is string => typeof t === 'string' && t.length > 0);
  }
  if (typeof raw === 'string' && raw.trim()) {
    // "#a #b" or "a, b" — both common in Obsidian
    return raw
      .split(/[,\s]+/)
      .map((t) => t.replace(/^#/, '').trim())
      .filter((t) => t.length > 0);
  }
  return [];
};

const pickDescription = (note: ObsidianNote): string | undefined => {
  const fm = note.frontmatter;
  if (typeof fm.description === 'string' && fm.description.trim()) {
    return fm.description.trim();
  }
  const firstPara = note.body.split(/\r?\n\r?\n/).find((p) => p.trim().length > 0);
  if (!firstPara) return undefined;
  const cleaned = firstPara.replace(/\s+/g, ' ').trim();
  return cleaned.length > 0 ? cleaned : undefined;
};
