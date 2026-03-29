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
import { atprotoHandler } from 'alap';

/**
 * Bluesky / AT Protocol example config.
 *
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  This file has TWO distinct sections:                       ║
 * ║                                                              ║
 * ║  1. allLinks — STATIC, hand-curated entries.                ║
 * ║     These are local data, no API calls. They show           ║
 * ║     "Option of Choice": one AT URI, many destinations.      ║
 * ║                                                              ║
 * ║  2. protocols — DYNAMIC, fetched from the network.          ║
 * ║     The :atproto: handler calls the public API at runtime   ║
 * ║     and turns the results into AlapLink objects on the fly. ║
 * ║     (Added in Step 5 — starts as empty protocol config.)    ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * The example page blends both: static curated links alongside
 * live protocol results, all in the same expression grammar.
 */
export const demoConfig: AlapConfig = {
  settings: {
    listType: 'ul',
    menuTimeout: 5000,
  },

  macros: {
    all_clients:     { linkItems: '.atproto_post + .client' },
    all_profiles:    { linkItems: '.atproto_profile + .client' },
    all_devtools:    { linkItems: '.devtool' },
    org_profiles:    { linkItems: '.orgs + .client' },
    news_profiles:   { linkItems: '.news + .client' },
    tech_profiles:   { linkItems: '.tech + .client' },
  },

  // ═══════════════════════════════════════════════════════════════
  // protocols — dynamic data from the AT Protocol network.
  //
  // This is where :atproto: expressions get their data.
  // Compare with the :web: protocol in external-data/config.ts —
  // same generate handler pattern, different source.
  //
  // Commands:
  //   :atproto:profile:eff.org:          → fetch a profile
  //   :atproto:feed:archive.org:limit=5: → fetch recent posts
  //   :atproto:people:open source:       → search for accounts
  //   :atproto:search:cats:              → search posts (auth required)
  // ═══════════════════════════════════════════════════════════════
  protocols: {
    atproto: {
      generate: atprotoHandler,
      cache: 5,           // 5-minute TTL for all results
      accessJwt: null,    // set at runtime after optional login

      // Named search aliases for multi-word queries.
      // Single-word queries work directly in expressions (:atproto:people:atproto:).
      // Multi-word queries need an alias because the tokenizer splits on spaces.
      searches: {
        open_source:        'open source',
        creative_commons:   'creative commons',
        open_web:           'open web',
        decentralized_web:  'decentralized web',
      },
    },
  },

  // ═══════════════════════════════════════════════════════════════
  // allLinks — static, hand-curated entries.
  //
  // These are LOCAL data — no API calls, no network.
  // Each group shows the same AT Protocol content viewable through
  // different clients and tools (Option of Choice pattern).
  //
  // Tags:
  //   .atproto_post     — a post entry
  //   .atproto_profile  — a profile entry
  //   .client           — a user-facing client (bsky.app, etc.)
  //   .devtool          — a developer inspection tool
  //   .raw              — raw API/JSON response
  //   .orgs             — organizations / nonprofits
  //   .news             — news publications
  //   .tech             — tech platforms / projects
  // ═══════════════════════════════════════════════════════════════
  allLinks: {

    // ===========================================================
    // POSTS — Option of Choice: same post, multiple destinations
    // ===========================================================

    // --- EFF post ---
    // at://did:plc:lr36xv2l64jwtnyoaqem6z2z/app.bsky.feed.post/3mi5gadra6r25
    eff_post_bsky: {
      label: 'EFF post — Bluesky',
      url: 'https://bsky.app/profile/eff.org/post/3mi5gadra6r25',
      tags: ['eff_post', 'atproto_post', 'client', 'orgs'],
      description: 'EFF post on the Bluesky web client',
    },
    eff_post_pdsls: {
      label: 'EFF post — pdsls.dev inspector',
      url: 'https://pdsls.dev/at/did:plc:lr36xv2l64jwtnyoaqem6z2z/app.bsky.feed.post/3mi5gadra6r25',
      tags: ['eff_post', 'atproto_post', 'devtool'],
      description: 'AT Proto record inspector',
    },
    eff_post_json: {
      label: 'EFF post — raw JSON',
      url: 'https://public.api.bsky.app/xrpc/app.bsky.feed.getPostThread?uri=at://did:plc:lr36xv2l64jwtnyoaqem6z2z/app.bsky.feed.post/3mi5gadra6r25&depth=0',
      tags: ['eff_post', 'atproto_post', 'raw'],
      description: 'Raw XRPC API response',
    },

    // --- Paul Frazee post ---
    // at://did:plc:ragtjsm2j2vknwkz3zp4oxrd/app.bsky.feed.post/3mi5vzaknmk23
    pfrazee_post_bsky: {
      label: 'Paul Frazee post — Bluesky',
      url: 'https://bsky.app/profile/pfrazee.com/post/3mi5vzaknmk23',
      tags: ['pfrazee_post', 'atproto_post', 'client'],
      description: 'Paul Frazee post on Bluesky web client',
    },
    pfrazee_post_pdsls: {
      label: 'Paul Frazee post — pdsls.dev inspector',
      url: 'https://pdsls.dev/at/did:plc:ragtjsm2j2vknwkz3zp4oxrd/app.bsky.feed.post/3mi5vzaknmk23',
      tags: ['pfrazee_post', 'atproto_post', 'devtool'],
      description: 'AT Proto record inspector',
    },
    pfrazee_post_json: {
      label: 'Paul Frazee post — raw JSON',
      url: 'https://public.api.bsky.app/xrpc/app.bsky.feed.getPostThread?uri=at://did:plc:ragtjsm2j2vknwkz3zp4oxrd/app.bsky.feed.post/3mi5vzaknmk23&depth=0',
      tags: ['pfrazee_post', 'atproto_post', 'raw'],
      description: 'Raw XRPC API response',
    },

    // ===========================================================
    // PROFILES — Option of Choice: same identity, multiple views
    // ===========================================================

    // --- Protocol / Platform ---

    atproto_bsky: {
      label: 'AT Protocol on Bluesky',
      url: 'https://bsky.app/profile/atproto.com',
      tags: ['atproto_profile', 'client', 'tech'],
      description: 'The AT Protocol developers',
    },
    atproto_pdsls: {
      label: 'AT Protocol on pdsls.dev',
      url: 'https://pdsls.dev/at/did:plc:ewvi7nxzyoun6zhxrhs64oiz',
      tags: ['atproto_profile', 'devtool', 'tech'],
    },

    bsky_bsky: {
      label: 'Bluesky on Bluesky',
      url: 'https://bsky.app/profile/bsky.app',
      tags: ['atproto_profile', 'client', 'tech'],
      description: 'Official Bluesky account',
    },
    bsky_pdsls: {
      label: 'Bluesky on pdsls.dev',
      url: 'https://pdsls.dev/at/did:plc:z72i7hdynmk6r22z27h6tvur',
      tags: ['atproto_profile', 'devtool', 'tech'],
    },

    github_bsky: {
      label: 'GitHub on Bluesky',
      url: 'https://bsky.app/profile/github.com',
      tags: ['atproto_profile', 'client', 'tech'],
      description: 'Developer platform',
    },
    github_pdsls: {
      label: 'GitHub on pdsls.dev',
      url: 'https://pdsls.dev/at/did:plc:sydgpvanh46u766n536r33oa',
      tags: ['atproto_profile', 'devtool', 'tech'],
    },

    nodejs_bsky: {
      label: 'Node.js on Bluesky',
      url: 'https://bsky.app/profile/nodejs.org',
      tags: ['atproto_profile', 'client', 'tech'],
      description: 'The Node.js JavaScript Runtime',
    },
    nodejs_pdsls: {
      label: 'Node.js on pdsls.dev',
      url: 'https://pdsls.dev/at/did:plc:abbt45q3u3bttqfs7nepehhu',
      tags: ['atproto_profile', 'devtool', 'tech'],
    },

    wordpress_bsky: {
      label: 'WordPress on Bluesky',
      url: 'https://bsky.app/profile/wordpress.org',
      tags: ['atproto_profile', 'client', 'tech'],
      description: 'Open source publishing platform',
    },
    wordpress_pdsls: {
      label: 'WordPress on pdsls.dev',
      url: 'https://pdsls.dev/at/did:plc:r2no5dzwjjkp4cysp43tqzxa',
      tags: ['atproto_profile', 'devtool', 'tech'],
    },

    linux_bsky: {
      label: 'Linux Foundation on Bluesky',
      url: 'https://bsky.app/profile/linuxfoundation.org',
      tags: ['atproto_profile', 'client', 'tech'],
      description: 'Enabling mass innovation through open source',
    },
    linux_pdsls: {
      label: 'Linux Foundation on pdsls.dev',
      url: 'https://pdsls.dev/at/did:plc:h5hpocfxr26lrha2d6qwd2b7',
      tags: ['atproto_profile', 'devtool', 'tech'],
    },

    // --- Organizations / Nonprofits ---

    eff_bsky: {
      label: 'EFF on Bluesky',
      url: 'https://bsky.app/profile/eff.org',
      tags: ['atproto_profile', 'client', 'orgs'],
      description: 'Electronic Frontier Foundation',
    },
    eff_pdsls: {
      label: 'EFF on pdsls.dev',
      url: 'https://pdsls.dev/at/did:plc:lr36xv2l64jwtnyoaqem6z2z',
      tags: ['atproto_profile', 'devtool', 'orgs'],
    },

    archive_bsky: {
      label: 'Internet Archive on Bluesky',
      url: 'https://bsky.app/profile/archive.org',
      tags: ['atproto_profile', 'client', 'orgs'],
      description: 'Preserving the web',
    },
    archive_pdsls: {
      label: 'Internet Archive on pdsls.dev',
      url: 'https://pdsls.dev/at/did:plc:73dpznbu4wqwtcyurwbiulov',
      tags: ['atproto_profile', 'devtool', 'orgs'],
    },

    cc_bsky: {
      label: 'Creative Commons on Bluesky',
      url: 'https://bsky.app/profile/creativecommons.bsky.social',
      tags: ['atproto_profile', 'client', 'orgs'],
      description: 'Open licenses for the world',
    },
    cc_pdsls: {
      label: 'Creative Commons on pdsls.dev',
      url: 'https://pdsls.dev/at/did:plc:mocbsa4drcbiiqnc7cjbve2u',
      tags: ['atproto_profile', 'devtool', 'orgs'],
    },

    signal_bsky: {
      label: 'Signal on Bluesky',
      url: 'https://bsky.app/profile/signal.org',
      tags: ['atproto_profile', 'client', 'orgs'],
      description: 'Encrypted communications',
    },
    signal_pdsls: {
      label: 'Signal on pdsls.dev',
      url: 'https://pdsls.dev/at/did:plc:tovhrfml47r6u4idaitaxefk',
      tags: ['atproto_profile', 'devtool', 'orgs'],
    },

    // --- News / Publications ---

    nature_bsky: {
      label: 'Nature on Bluesky',
      url: 'https://bsky.app/profile/nature.com',
      tags: ['atproto_profile', 'client', 'news'],
      description: 'International science journal',
    },
    nature_pdsls: {
      label: 'Nature on pdsls.dev',
      url: 'https://pdsls.dev/at/did:plc:vrsppvjc5fysqnm2zshiirey',
      tags: ['atproto_profile', 'devtool', 'news'],
    },

    verge_bsky: {
      label: 'The Verge on Bluesky',
      url: 'https://bsky.app/profile/theverge.com',
      tags: ['atproto_profile', 'client', 'news'],
      description: 'Covering life in the future',
    },
    verge_pdsls: {
      label: 'The Verge on pdsls.dev',
      url: 'https://pdsls.dev/at/did:plc:7exlcsle4mjfhu3wnhcgizz6',
      tags: ['atproto_profile', 'devtool', 'news'],
    },

    ars_bsky: {
      label: 'Ars Technica on Bluesky',
      url: 'https://bsky.app/profile/arstechnica.com',
      tags: ['atproto_profile', 'client', 'news'],
      description: 'Tech news and analysis',
    },
    ars_pdsls: {
      label: 'Ars Technica on pdsls.dev',
      url: 'https://pdsls.dev/at/did:plc:wld6fad6xsm4tz4kfkoikun2',
      tags: ['atproto_profile', 'devtool', 'news'],
    },

    wired_bsky: {
      label: 'WIRED on Bluesky',
      url: 'https://bsky.app/profile/wired.com',
      tags: ['atproto_profile', 'client', 'news'],
      description: 'For Future Reference',
    },
    wired_pdsls: {
      label: 'WIRED on pdsls.dev',
      url: 'https://pdsls.dev/at/did:plc:inz4fkbbp7ms3ixufw6xuvdi',
      tags: ['atproto_profile', 'devtool', 'news'],
    },

    nyt_bsky: {
      label: 'New York Times on Bluesky',
      url: 'https://bsky.app/profile/nytimes.com',
      tags: ['atproto_profile', 'client', 'news'],
      description: 'Independent reporting',
    },
    nyt_pdsls: {
      label: 'New York Times on pdsls.dev',
      url: 'https://pdsls.dev/at/did:plc:eclio37ymobqex2ncko63h4r',
      tags: ['atproto_profile', 'devtool', 'news'],
    },

    newyorker_bsky: {
      label: 'The New Yorker on Bluesky',
      url: 'https://bsky.app/profile/newyorker.com',
      tags: ['atproto_profile', 'client', 'news'],
      description: 'Reporting and commentary',
    },
    newyorker_pdsls: {
      label: 'The New Yorker on pdsls.dev',
      url: 'https://pdsls.dev/at/did:plc:t2dfq4ktezmwjdnjjaygw4bl',
      tags: ['atproto_profile', 'devtool', 'news'],
    },

    techcrunch_bsky: {
      label: 'TechCrunch on Bluesky',
      url: 'https://bsky.app/profile/techcrunch.com',
      tags: ['atproto_profile', 'client', 'news'],
      description: 'Startup and tech news',
    },
    techcrunch_pdsls: {
      label: 'TechCrunch on pdsls.dev',
      url: 'https://pdsls.dev/at/did:plc:vtpyqvwce4x6gpa5dcizqecy',
      tags: ['atproto_profile', 'devtool', 'news'],
    },

    // --- Individuals ---

    jay_bsky: {
      label: 'Jay Graber on Bluesky',
      url: 'https://bsky.app/profile/jay.bsky.team',
      tags: ['atproto_profile', 'client'],
      description: 'Bluesky CEO, AT Proto co-creator',
    },
    jay_pdsls: {
      label: 'Jay Graber on pdsls.dev',
      url: 'https://pdsls.dev/at/did:plc:oky5czdrnfjpqslsw2a5iclo',
      tags: ['atproto_profile', 'devtool'],
    },

    pfrazee_bsky: {
      label: 'Paul Frazee on Bluesky',
      url: 'https://bsky.app/profile/pfrazee.com',
      tags: ['atproto_profile', 'client'],
      description: 'CTO at Bluesky',
    },
    pfrazee_pdsls: {
      label: 'Paul Frazee on pdsls.dev',
      url: 'https://pdsls.dev/at/did:plc:ragtjsm2j2vknwkz3zp4oxrd',
      tags: ['atproto_profile', 'devtool'],
    },

    dan_bsky: {
      label: 'Dan Abramov on Bluesky',
      url: 'https://bsky.app/profile/danabra.mov',
      tags: ['atproto_profile', 'client'],
      description: 'Well-known developer',
    },
    dan_pdsls: {
      label: 'Dan Abramov on pdsls.dev',
      url: 'https://pdsls.dev/at/did:plc:fpruhuo22xkm5o7ttr2ktxdo',
      tags: ['atproto_profile', 'devtool'],
    },
  },
};
