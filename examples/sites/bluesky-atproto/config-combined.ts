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

import type { AlapConfig } from 'alap/core';
import { atprotoHandler, webHandler } from 'alap';

/**
 * Three sources, one menu.
 *
 * This config brings together all three data modes Alap supports:
 *
 *   1. allLinks    — static, hand-curated entries (no network)
 *   2. :web:       — JSON API fetch (Open Library)
 *   3. :atproto:   — AT Protocol network (Bluesky)
 *
 * A single expression can pull from all three and merge the results
 * into one menu.
 */
export const combinedConfig: AlapConfig = {
  settings: {
    listType: 'ul',
    menuTimeout: 5000,
  },

  macros: {
    curated_orgs: { linkItems: '.orgs' },
  },

  protocols: {
    web: {
      generate: webHandler,
      cache: 10,
      keys: {
        books: {
          url: 'https://openlibrary.org/search.json',
          linkBase: 'https://openlibrary.org',
          searches: {
            decentralization: { q: 'decentralization internet', limit: 3 },
            architecture:     { q: 'architecture urban design', limit: 3 },
            art:              { q: 'modern art movements', limit: 3 },
            bebop:            { q: 'bebop jazz history', limit: 3 },
            techno:           { q: 'techno electronic music detroit', limit: 3 },
            coffee:           { q: 'coffee roasting brewing', limit: 3 },
          },
          map: {
            label: 'title',
            url: 'key',
            meta: { author: 'author_name.0', year: 'first_publish_year' },
          },
        },
      },
    },
    atproto: {
      generate: atprotoHandler,
      cache: 5,
      accessJwt: null,
    },
  },

  allLinks: {
    eff_bsky: {
      label: 'EFF on Bluesky',
      url: 'https://bsky.app/profile/eff.org',
      tags: ['orgs'],
      description: 'Electronic Frontier Foundation',
    },
    archive_bsky: {
      label: 'Internet Archive on Bluesky',
      url: 'https://bsky.app/profile/archive.org',
      tags: ['orgs'],
      description: 'Preserving the web',
    },
    cc_bsky: {
      label: 'Creative Commons on Bluesky',
      url: 'https://bsky.app/profile/creativecommons.bsky.social',
      tags: ['orgs'],
      description: 'Open licenses for the world',
    },
    signal_bsky: {
      label: 'Signal on Bluesky',
      url: 'https://bsky.app/profile/signal.org',
      tags: ['orgs'],
      description: 'Encrypted communications',
    },
  },
};
