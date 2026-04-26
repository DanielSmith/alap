/**
 * Copyright 2026 Daniel Smith — Apache 2.0
 *
 * :hn: — response → AlapLink mappers.
 *
 * Pure functions. No I/O, no config, no logger. Testable in isolation
 * with fixture data. The handler orchestrates fetches and calls these
 * to shape the final link set.
 */

import type { AlapLink } from '../../core/types';
import { stripHtml } from '../shared';
import type { AlgoliaHit, HnItem } from './types';

const HN_WEB = 'https://news.ycombinator.com';
const LABEL_MAX_LENGTH = 80;
const HTTP_URL_RE = /^https?:\/\//;

/** Truncate text to `max` characters, appending a single-character ellipsis. */
export const truncate = (text: string, max: number): string =>
  text.length <= max ? text : text.slice(0, max - 1) + '\u2026';

/** Build the canonical HN discussion URL for an item id. */
export const hnItemUrl = (id: number | string): string =>
  `${HN_WEB}/item?id=${id}`;

/**
 * Map a Firebase item to an AlapLink. Returns `null` for items that
 * don't have a user-facing destination — comments, poll options,
 * dead/deleted items, or anything missing a numeric id.
 *
 * Link URL strategy:
 *   - If the item has an external URL (story/job with a link), use it.
 *   - Otherwise (Ask/Show/self-posts), use the HN discussion URL.
 *   - `meta.hnUrl` always carries the discussion URL so renderers can
 *     surface both destinations (lens "option of choice" pattern).
 *
 * `createdAt` is returned in Unix milliseconds — HN's API returns
 * seconds, which would be silently ignored by the `:time:` filter.
 */
export const mapItem = (item: HnItem | null | undefined): AlapLink | null => {
  if (!item || typeof item.id !== 'number') return null;
  if (item.dead || item.deleted) return null;
  if (item.type === 'comment' || item.type === 'pollopt') return null;
  // Skip items without a title — nothing meaningful to display in a menu.
  // Catches edge cases (API glitches, unknown types, partial records).
  if (!item.title || typeof item.title !== 'string') return null;

  const title = item.title;
  const discussionUrl = hnItemUrl(item.id);
  const url = item.url && HTTP_URL_RE.test(item.url) ? item.url : discussionUrl;

  const link: AlapLink = {
    label: truncate(title, LABEL_MAX_LENGTH),
    url,
    tags: ['hn', item.type ?? 'story'],
    meta: {
      id: item.id,
      author: item.by,
      score: item.score,
      comments: item.descendants,
      hnUrl: discussionUrl,
    },
  };

  if (item.text) {
    link.description = stripHtml(item.text);
  }

  if (typeof item.time === 'number') {
    link.createdAt = item.time * 1000;
  }

  return link;
};

/**
 * Map an Algolia search hit to an AlapLink. Returns `null` for hits
 * missing an `objectID`. Same two-URL strategy as `mapItem`.
 */
export const mapAlgoliaHit = (hit: AlgoliaHit | null | undefined): AlapLink | null => {
  if (!hit || !hit.objectID) return null;
  // objectID is user-facing URL material. HN's Algolia always returns
  // numeric item IDs as strings; reject anything else so a hostile or
  // malformed response can't inject characters into the URL template.
  if (!/^\d+$/.test(hit.objectID)) return null;
  // Skip hits without a title — nothing meaningful to display.
  if (!hit.title || typeof hit.title !== 'string') return null;

  const id = hit.objectID;
  const discussionUrl = hnItemUrl(id);
  const url = hit.url && HTTP_URL_RE.test(hit.url) ? hit.url : discussionUrl;

  const link: AlapLink = {
    label: truncate(hit.title, LABEL_MAX_LENGTH),
    url,
    tags: ['hn', 'search'],
    meta: {
      id,
      author: hit.author,
      score: hit.points,
      comments: hit.num_comments,
      hnUrl: discussionUrl,
    },
  };

  if (hit.story_text) {
    link.description = stripHtml(hit.story_text);
  }

  if (typeof hit.created_at_i === 'number') {
    link.createdAt = hit.created_at_i * 1000;
  }

  return link;
};
