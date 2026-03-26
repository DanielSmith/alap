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

export const demoConfig: AlapConfig = {
  settings: {
    listType: 'ul',
    menuTimeout: 8000,
    hooks: ['item-hover', 'item-context'],
  },

  macros: {
    bridges: { linkItems: '.bridge' },
    sf: { linkItems: '.sf' },
  },

  allLinks: {
    // --- Bridges (with thumbnails for hover preview) ---
    goldengate: {
      label: 'Golden Gate Bridge',
      url: 'https://en.wikipedia.org/wiki/Golden_Gate_Bridge',
      description: 'Suspension bridge spanning the Golden Gate strait. Opened in 1937, its 4,200-foot main span was the longest in the world for nearly three decades.',
      tags: ['sf', 'bridge', 'landmark'],
      thumbnail: '../../img/golden-gate.jpg',
      guid: 'b1a2c3d4-0001-4000-a000-000000000001',
      hooks: ['item-hover', 'item-context'],
    },
    brooklyn: {
      label: 'Brooklyn Bridge',
      url: 'https://en.wikipedia.org/wiki/Brooklyn_Bridge',
      description: 'Hybrid cable-stayed/suspension bridge connecting Manhattan and Brooklyn. Completed in 1883, it was the first steel-wire suspension bridge.',
      tags: ['nyc', 'bridge', 'landmark'],
      thumbnail: '../../img/brooklyn-bridge.jpg',
      guid: 'b1a2c3d4-0002-4000-a000-000000000002',
      hooks: ['item-hover', 'item-context'],
    },
    manhattan: {
      label: 'Manhattan Bridge',
      url: 'https://en.wikipedia.org/wiki/Manhattan_Bridge',
      description: 'Suspension bridge crossing the East River. Opened in 1909, it carries four subway tracks — more rail traffic than any other bridge in the world.',
      tags: ['nyc', 'bridge'],
      guid: 'b1a2c3d4-0003-4000-a000-000000000003',
      hooks: ['item-hover'],
    },

    // --- SF spots (with image menu items) ---
    paintedladies: {
      label: 'Painted Ladies',
      url: 'https://en.wikipedia.org/wiki/Painted_ladies',
      description: 'Row of Victorian houses at 710-720 Steiner Street, across from Alamo Square park. One of the most photographed locations in San Francisco.',
      tags: ['sf', 'landmark', 'architecture'],
      image: '../../img/sf-victorians.jpg',
      altText: 'Painted Ladies Victorian houses with SF skyline',
      thumbnail: '../../img/sf-victorians.jpg',
      guid: 'b1a2c3d4-0004-4000-a000-000000000004',
      hooks: ['item-hover', 'item-context'],
    },
    dolores: {
      label: 'Dolores Park',
      url: 'https://en.wikipedia.org/wiki/Dolores_Park',
      description: 'Popular 16-acre park in the Mission District with panoramic downtown views, palm trees, and year-round sunshine.',
      tags: ['sf', 'park'],
      guid: 'b1a2c3d4-0005-4000-a000-000000000005',
      hooks: ['item-hover'],
    },
    aqus: {
      label: 'Aqus Cafe',
      url: 'https://aqus.com',
      description: 'Community-owned cafe in Petaluma. Worker cooperative since 2003.',
      tags: ['coffee', 'sf'],
      guid: 'b1a2c3d4-0006-4000-a000-000000000006',
    },

    // --- Items specifically for image-menu demo ---
    ggphoto: {
      label: 'Golden Gate photo',
      url: 'https://en.wikipedia.org/wiki/Golden_Gate_Bridge',
      image: '../../img/golden-gate.jpg',
      altText: 'Golden Gate Bridge at sunset',
      tags: ['photo', 'sf'],
    },
    brooklynphoto: {
      label: 'Brooklyn Bridge photo',
      url: 'https://en.wikipedia.org/wiki/Brooklyn_Bridge',
      image: '../../img/brooklyn-bridge.jpg',
      altText: 'Brooklyn Bridge cables and tower',
      tags: ['photo', 'nyc'],
    },
    chainsphoto: {
      label: 'Chain links photo',
      url: 'https://en.wikipedia.org/wiki/Chain',
      image: '../../img/chain-links.jpg',
      altText: 'Close-up of metal chain links',
      tags: ['photo', 'abstract'],
    },
  },
};
