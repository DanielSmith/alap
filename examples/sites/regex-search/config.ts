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

const now = Date.now();

export const demoConfig: AlapConfig = {
  settings: {
    listType: 'ul',
    menuTimeout: 5000,
  },

  macros: {
    cars: { linkItems: 'vwbug, bmwe36' },
  },

  searchPatterns: {
    // Simple string shorthand — searches all fields
    bridges: 'bridge',

    // Label-only search
    german: {
      pattern: 'VW|BMW|Mercedes',
      options: { fields: 'l' },
    },

    // Description search
    scenic: {
      pattern: 'scenic|views|panoram',
      options: { fields: 'd' },
    },

    // Tag search
    landmarks: {
      pattern: 'landmark',
      options: { fields: 't' },
    },

    // Sorted alphabetically
    alphaBridges: {
      pattern: 'bridge',
      options: { fields: 'l', sort: 'alpha' },
    },

    // Recent items (last 30 days)
    recent: {
      pattern: '.',
      options: { age: '30d', sort: 'newest' },
    },

    // URL search
    wikipedia: {
      pattern: 'wikipedia\\.org',
      options: { fields: 'u' },
    },

    // Limited results
    topBridges: {
      pattern: 'bridge',
      options: { fields: 'l', limit: 2, sort: 'alpha' },
    },
  },

  allLinks: {
    vwbug: {
      label: 'VW Bug — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Volkswagen_Beetle',
      tags: ['car', 'vw', 'germany'],
      createdAt: now - 5 * 86400000,
    },
    bmwe36: {
      label: 'BMW E36 — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/BMW_3_Series_(E36)',
      tags: ['car', 'bmw', 'germany'],
      createdAt: now - 3 * 86400000,
    },
    miata: {
      label: 'Mazda Miata — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Mazda_MX-5',
      tags: ['car', 'mazda', 'japan'],
      createdAt: now - 60 * 86400000, // 60 days ago — outside "recent" window
    },
    brooklyn: {
      label: 'Brooklyn Bridge',
      url: 'https://en.wikipedia.org/wiki/Brooklyn_Bridge',
      tags: ['nyc', 'bridge', 'landmark'],
      description: 'Iconic suspension bridge with scenic views of Manhattan',
      createdAt: now - 2 * 86400000,
    },
    manhattan: {
      label: 'Manhattan Bridge',
      url: 'https://en.wikipedia.org/wiki/Manhattan_Bridge',
      tags: ['nyc', 'bridge'],
      createdAt: now - 10 * 86400000,
    },
    highline: {
      label: 'The High Line',
      url: 'https://en.wikipedia.org/wiki/High_Line',
      tags: ['nyc', 'park', 'landmark'],
      description: 'Elevated linear park with panoramic city views',
      createdAt: now - 1 * 86400000,
    },
    goldengate: {
      label: 'Golden Gate Bridge',
      url: 'https://en.wikipedia.org/wiki/Golden_Gate_Bridge',
      tags: ['sf', 'bridge', 'landmark'],
      description: 'Famous suspension bridge with scenic bay views',
      createdAt: now - 7 * 86400000,
    },
    towerbridge: {
      label: 'Tower Bridge',
      url: 'https://en.wikipedia.org/wiki/Tower_Bridge',
      tags: ['london', 'bridge', 'landmark'],
      createdAt: now - 15 * 86400000,
    },
    aqus: {
      label: 'Aqus Cafe',
      url: 'https://aqus.com',
      tags: ['coffee', 'sf'],
      createdAt: now - 4 * 86400000,
    },
    bluebottle: {
      label: 'Blue Bottle Coffee',
      url: 'https://bluebottlecoffee.com',
      tags: ['coffee', 'sf', 'nyc'],
      createdAt: now - 20 * 86400000,
    },
  },
};
