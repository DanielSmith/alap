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

import type { AlapConfig } from '../../src/core/types';

// This is a TypeScript object, not JSON — comments are fine here.
// Real user configs (Config.js / config.json) won't have comments.
export const testConfig: AlapConfig = {
  settings: {
    listType: 'ul',
    menuTimeout: 5000,
  },

  macros: {
    cars: { linkItems: 'vwbug, bmwe36' },
    nycbridges: { linkItems: '.nyc + .bridge' },
    everything: { linkItems: '.nyc | .sf' },
  },

  searchPatterns: {
    // Simple string shorthand
    bridges: 'bridge',

    // Full object with options
    germanCars: {
      pattern: 'VW|BMW',
      options: { fields: 'l', limit: 5 },
    },

    // URL search
    exampleDotCom: {
      pattern: 'example\\.com',
      options: { fields: 'u' },
    },

    // Description search
    scenic: {
      pattern: 'scenic|views|panoram',
      options: { fields: 'd' },
    },

    // ID search
    idSearch: {
      pattern: '^blue',
      options: { fields: 'k' },
    },

    // Tag search
    tagSearch: {
      pattern: 'landmark',
      options: { fields: 't' },
    },

    // Sorted
    alphaSorted: {
      pattern: 'bridge',
      options: { fields: 'l', sort: 'alpha' },
    },

    // Age filter (will be tested with createdAt items)
    recent: {
      pattern: '.',
      options: { age: '7d' },
    },

    // Regex-heavy patterns for composition tests
    endsWithBridge: {
      pattern: 'bridge$',
      options: { fields: 'k' },
    },
    threeLetterTag: {
      pattern: '^[a-z]{3}$',
      options: { fields: 't' },
    },
    vowelHeavyLabel: {
      pattern: '[aeiou]{2,}',
      options: { fields: 'l' },
    },
    startsWithB: {
      pattern: '^b',
      options: { fields: 'k' },
    },
    labelHasThe: {
      pattern: '\\bthe\\b',
      options: { fields: 'l' },
    },
    urlSlugWithE: {
      pattern: '/[^/]*e[^/]*$',
      options: { fields: 'u' },
    },
    suspensionDesc: {
      pattern: 'sus.*ion',
      options: { fields: 'd' },
    },
    camelOrPascal: {
      pattern: '[a-z][A-Z]',
      options: { fields: 'k' },
    },
  },

  allLinks: {
    // Cars
    vwbug: {
      label: 'VW Bug',
      url: 'https://example.com/vwbug',
      tags: ['car', 'vw', 'germany'],
    },
    bmwe36: {
      label: 'BMW E36',
      url: 'https://example.com/bmwe36',
      tags: ['car', 'bmw', 'germany'],
    },
    miata: {
      label: 'Mazda Miata',
      url: 'https://example.com/miata',
      tags: ['car', 'mazda', 'japan'],
    },

    // NYC
    brooklyn: {
      label: 'Brooklyn Bridge',
      url: 'https://example.com/brooklyn',
      tags: ['nyc', 'bridge', 'landmark'],
      description: 'Iconic suspension bridge with scenic views of Manhattan',
    },
    manhattan: {
      label: 'Manhattan Bridge',
      url: 'https://example.com/manhattan',
      tags: ['nyc', 'bridge'],
    },
    highline: {
      label: 'The High Line',
      url: 'https://example.com/highline',
      tags: ['nyc', 'park', 'landmark'],
      description: 'Elevated linear park with panoramic city views',
    },
    centralpark: {
      label: 'Central Park',
      url: 'https://example.com/centralpark',
      tags: ['nyc', 'park'],
    },

    // SF
    goldengate: {
      label: 'Golden Gate',
      url: 'https://example.com/goldengate',
      tags: ['sf', 'bridge', 'landmark'],
      description: 'Famous suspension bridge with scenic bay views',
    },
    dolores: {
      label: 'Dolores Park',
      url: 'https://example.com/dolores',
      tags: ['sf', 'park'],
    },

    // London
    towerbridge: {
      label: 'Tower Bridge',
      url: 'https://example.com/towerbridge',
      tags: ['london', 'bridge', 'landmark'],
    },

    // Coffee
    aqus: {
      label: 'Aqus Cafe',
      url: 'https://example.com/aqus',
      tags: ['coffee', 'sf'],
    },
    bluebottle: {
      label: 'Blue Bottle',
      url: 'https://example.com/bluebottle',
      tags: ['coffee', 'sf', 'nyc'],
    },
    acre: {
      label: 'Acre Coffee',
      url: 'https://example.com/acre',
      tags: ['coffee'],
    },
  },
};
