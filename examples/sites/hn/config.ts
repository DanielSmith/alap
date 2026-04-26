/**
 * Copyright 2026 Daniel Smith — Apache 2.0
 */

import type { AlapConfig } from 'alap/core';

/**
 * Hacker News example config.
 *
 * Two data modes in one page:
 *   1. allLinks — static, hand-curated entries (for composition demos).
 *   2. protocols.hn — dynamic, live data from Firebase + Algolia.
 *
 * Zero auth. Zero CORS workarounds. The page runs in-browser and hits
 * the public APIs directly.
 *
 * Sub-modes demonstrated on the index page:
 *   :hn:top:       :hn:new:       :hn:best:
 *   :hn:ask:       :hn:show:      :hn:job:
 *   :hn:user:pg:   :hn:search:$ai_papers:
 *   :hn:item:8863:
 */
export const demoConfig: AlapConfig = {
  settings: {
    listType: 'ul',
    menuTimeout: 5000,
  },

  macros: {
    my_reads: { linkItems: '.hn_curated + .read' },
  },

  // ═══════════════════════════════════════════════════════════════
  // protocols — live data from HN's APIs, plus :time: for composition.
  // ═══════════════════════════════════════════════════════════════
  protocols: {
    hn: {
      cache: 10,              // minutes — HN front page doesn't change fast

      // Named search aliases for multi-word queries.
      // Multi-word strings can't appear inline in expressions (the
      // tokenizer splits on spaces), so they're aliased here and
      // referenced as $preset in the expression.
      searches: {
        ai_papers:     'artificial intelligence papers',
        rust_release:  'rust release',
        typescript:    'typescript strict mode',
      },

      // Default limit across all sub-modes when no limit= named arg
      // and no refiner *limit:N* is provided.
      defaults: {
        limit: 10,
      },
    },
    // :time: is a filter protocol with no data — its handler lives in the
    // engine's registry (see main.ts), not here.
  },

  // ═══════════════════════════════════════════════════════════════
  // allLinks — a few static entries so the composition demos have
  // something to intersect / union with the live HN data.
  // ═══════════════════════════════════════════════════════════════
  allLinks: {
    pg_essays: {
      label: 'Paul Graham — Essays',
      url: 'https://paulgraham.com/articles.html',
      tags: ['hn_curated', 'read', 'essays'],
      description: 'Archive of PG essays',
    },
    hn_guidelines: {
      label: 'HN Guidelines',
      url: 'https://news.ycombinator.com/newsguidelines.html',
      tags: ['hn_curated', 'reference'],
      description: 'How the community self-governs',
    },
    hn_api_docs: {
      label: 'HN Firebase API docs',
      url: 'https://github.com/HackerNews/API',
      tags: ['hn_curated', 'reference', 'dev'],
      description: 'The API powering this demo',
    },
    algolia_api: {
      label: 'Algolia HN Search API',
      url: 'https://hn.algolia.com/api',
      tags: ['hn_curated', 'reference', 'dev'],
      description: 'The search backend for :hn:search:',
    },
  },
};
