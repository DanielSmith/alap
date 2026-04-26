/**
 * Copyright 2026 Daniel Smith — Apache 2.0
 *
 * :hn: — type definitions.
 */

/**
 * Firebase item shape. See https://github.com/HackerNews/API.
 * All fields optional because the Firebase API may return partial or
 * `null` values; we narrow at mapping time.
 */
export interface HnItem {
  id: number;
  type?: 'story' | 'comment' | 'job' | 'poll' | 'pollopt' | 'ask';
  by?: string;
  time?: number; // Unix seconds
  title?: string;
  text?: string; // HTML for Ask HN / Show HN / job posts
  url?: string; // External URL for link-type stories
  score?: number;
  descendants?: number; // Comment count
  kids?: number[];
  dead?: boolean;
  deleted?: boolean;
}

/**
 * Firebase user shape.
 */
export interface HnUser {
  id: string;
  submitted?: number[];
  karma?: number;
  created?: number;
  about?: string;
}

/**
 * Algolia search result — the fields we consume from
 * https://hn.algolia.com/api/v1/search.
 */
export interface AlgoliaHit {
  objectID: string;
  title?: string;
  url?: string;
  story_text?: string;
  author?: string;
  points?: number;
  num_comments?: number;
  created_at_i?: number; // Unix seconds
  _tags?: string[];
}

/**
 * Optional shape for `config.protocols.hn`. Exported so consumers can
 * type their config cleanly; not required by the handler (which reads
 * fields defensively).
 */
export interface HnProtocolConfig {
  /** Named query aliases resolved via :hn:search:$name: */
  searches?: Record<string, string>;
  /** Per-protocol defaults. */
  defaults?: {
    limit?: number;
  };
}
