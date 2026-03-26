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

export const tailwindConfig: AlapConfig = {
  settings: {
    listType: 'ul',
    menuTimeout: 5000,
  },

  macros: {
    cars: { linkItems: 'vwbug, bmwe36, miata' },
  },

  allLinks: {
    // Cars
    vwbug: {
      label: 'VW Bug',
      url: 'https://en.wikipedia.org/wiki/Volkswagen_Beetle',
      tags: ['car', 'vw', 'germany'],
    },
    bmwe36: {
      label: 'BMW E36',
      url: 'https://en.wikipedia.org/wiki/BMW_3_Series_(E36)',
      tags: ['car', 'bmw', 'germany'],
    },
    miata: {
      label: 'Mazda Miata',
      url: 'https://en.wikipedia.org/wiki/Mazda_MX-5',
      tags: ['car', 'mazda', 'japan'],
    },

    // NYC
    brooklyn: {
      label: 'Brooklyn Bridge',
      url: 'https://en.wikipedia.org/wiki/Brooklyn_Bridge',
      tags: ['nyc', 'bridge', 'landmark'],
    },
    manhattan: {
      label: 'Manhattan Bridge',
      url: 'https://en.wikipedia.org/wiki/Manhattan_Bridge',
      tags: ['nyc', 'bridge'],
    },
    highline: {
      label: 'The High Line',
      url: 'https://en.wikipedia.org/wiki/High_Line',
      tags: ['nyc', 'park', 'landmark'],
    },
    centralpark: {
      label: 'Central Park',
      url: 'https://en.wikipedia.org/wiki/Central_Park',
      tags: ['nyc', 'park'],
    },

    // SF
    goldengate: {
      label: 'Golden Gate Bridge',
      url: 'https://en.wikipedia.org/wiki/Golden_Gate_Bridge',
      tags: ['sf', 'bridge', 'landmark'],
    },
    dolores: {
      label: 'Dolores Park',
      url: 'https://en.wikipedia.org/wiki/Dolores_Park',
      tags: ['sf', 'park'],
    },

    // Coffee
    aqus: {
      label: 'Aqus Cafe',
      url: 'https://aqus.com',
      tags: ['coffee', 'sf'],
    },
    bluebottle: {
      label: 'Blue Bottle Coffee',
      url: 'https://bluebottlecoffee.com',
      tags: ['coffee', 'sf', 'nyc'],
    },
    acre: {
      label: 'Acre Coffee',
      url: 'https://acrecoffee.com',
      tags: ['coffee'],
    },
  },
};
