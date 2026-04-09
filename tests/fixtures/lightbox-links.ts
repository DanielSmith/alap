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

export const lightboxTestConfig: AlapConfig = {
  settings: {
    listType: 'ul',
    menuTimeout: 5000,
  },

  macros: {
    favorites: { linkItems: 'brooklyn, goldengate, towerbridge' },
  },

  allLinks: {
    brooklyn: {
      label: 'Brooklyn Bridge',
      url: 'https://example.com/brooklyn',
      tags: ['nyc', 'bridge', 'landmark'],
      description: 'Iconic suspension bridge spanning the East River',
      thumbnail: 'images/brooklyn.jpg',
      meta: {
        photoCredit: 'Jane Doe',
        photoCreditUrl: 'https://unsplash.com/@janedoe',
      },
    },
    goldengate: {
      label: 'Golden Gate',
      url: 'https://example.com/goldengate',
      tags: ['sf', 'bridge', 'landmark'],
      description: 'Famous suspension bridge with bay views',
      image: 'images/goldengate.jpg',
      altText: 'Golden Gate Bridge at sunset',
    },
    towerbridge: {
      label: 'Tower Bridge',
      url: 'https://example.com/towerbridge',
      tags: ['london', 'bridge', 'landmark'],
      thumbnail: 'images/towerbridge.jpg',
      meta: {
        photoCredit: 'John Smith',
      },
    },
    aqus: {
      label: 'Aqus Cafe',
      url: 'https://example.com/aqus',
      tags: ['coffee', 'sf'],
      description: 'Cozy waterfront cafe',
    },
    bluebottle: {
      label: 'Blue Bottle',
      url: 'https://example.com/bluebottle',
      tags: ['coffee', 'sf', 'nyc'],
    },
    minimal: {
      label: 'Minimal Item',
      url: 'https://example.com/minimal',
    },
    single: {
      label: 'Solo Item',
      url: 'https://example.com/solo',
      tags: ['solo'],
    },
    xss_attempt: {
      label: '<script>alert("xss")</script>',
      url: 'javascript:alert(1)',
      tags: ['security'],
      description: '<img src=x onerror=alert(1)>',
      meta: {
        photoCredit: '<b>bold</b>',
        photoCreditUrl: 'javascript:void(0)',
      },
    },
  },
};
