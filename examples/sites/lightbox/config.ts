/**
 * Copyright 2026 Daniel Smith
 * SPDX-License-Identifier: Apache-2.0
 */

import type { AlapConfig } from 'alap/core';

export const demoConfig: AlapConfig = {
  settings: {
    listType: 'ul',
    menuTimeout: 5000,
  },

  macros: {
    favorites: { linkItems: 'goldengate, bluebottle, highline' },
  },

  allLinks: {
    brooklyn: {
      label: 'Brooklyn Bridge',
      url: 'https://en.wikipedia.org/wiki/Brooklyn_Bridge',
      tags: ['nyc', 'bridge', 'landmark'],
      description: 'Opened in 1883, connecting Manhattan and Brooklyn over the East River. One of the oldest roadway bridges in the United States.',
      thumbnail: './images/brooklyn.jpg',
      meta: { photoCredit: 'Hannes Richter', photoCreditUrl: 'https://unsplash.com/@harimedia' },
    },
    manhattan: {
      label: 'Manhattan Bridge',
      url: 'https://en.wikipedia.org/wiki/Manhattan_Bridge',
      tags: ['nyc', 'bridge'],
      description: 'A suspension bridge crossing the East River, connecting Lower Manhattan with Downtown Brooklyn.',
      thumbnail: './images/manhattan.jpg',
      meta: { photoCredit: 'YM', photoCreditUrl: 'https://unsplash.com/@ymoran' },
    },
    goldengate: {
      label: 'Golden Gate Bridge',
      url: 'https://en.wikipedia.org/wiki/Golden_Gate_Bridge',
      tags: ['sf', 'bridge', 'landmark'],
      description: 'Spanning the Golden Gate strait, this 1937 suspension bridge is an internationally recognized symbol of San Francisco.',
      thumbnail: './images/goldengate.jpg',
      meta: { photoCredit: 'Maarten van den Heuvel', photoCreditUrl: 'https://unsplash.com/@mvdheuvel' },
    },
    highline: {
      label: 'The High Line',
      url: 'https://en.wikipedia.org/wiki/High_Line',
      tags: ['nyc', 'park', 'landmark'],
      description: 'An elevated linear park built on a historic freight rail line on the west side of Manhattan.',
      thumbnail: './images/highline.jpg',
      meta: { photoCredit: 'lo lindo', photoCreditUrl: 'https://unsplash.com/@lolindo' },
    },
    centralpark: {
      label: 'Central Park',
      url: 'https://en.wikipedia.org/wiki/Central_Park',
      tags: ['nyc', 'park'],
      description: 'An 843-acre urban park in the heart of Manhattan, the most visited urban park in the United States.',
      thumbnail: './images/centralpark.jpg',
      meta: { photoCredit: 'Harry Gillen', photoCreditUrl: 'https://unsplash.com/@gillenha' },
    },
    dolores: {
      label: 'Dolores Park',
      url: 'https://en.wikipedia.org/wiki/Dolores_Park',
      tags: ['sf', 'park'],
      description: 'A city park in the Mission District with views of downtown San Francisco and the East Bay.',
      thumbnail: './images/dolores.jpg',
      meta: { photoCredit: 'Leo Korman', photoCreditUrl: 'https://unsplash.com/@leokorman' },
    },
    bluebottle: {
      label: 'Blue Bottle Coffee',
      url: 'https://bluebottlecoffee.com',
      tags: ['coffee', 'sf', 'nyc'],
      description: 'Third-wave coffee roaster founded in Oakland in 2002. Known for single-origin beans and minimalist cafes.',
      thumbnail: './images/bluebottle.jpg',
      meta: { photoCredit: 'Braden Collum', photoCreditUrl: 'https://unsplash.com/@bradencollum' },
    },
    ritual: {
      label: 'Ritual Coffee Roasters',
      url: 'https://ritualcoffee.com',
      tags: ['coffee', 'sf'],
      description: 'San Francisco roaster in the Mission District, a pioneer of the city\'s specialty coffee scene since 2005.',
    },
    stumptown: {
      label: 'Stumptown Coffee',
      url: 'https://stumptowncoffee.com',
      tags: ['coffee', 'portland'],
      description: 'Portland-based roaster known for direct trade sourcing and hair bender espresso blend.',
      thumbnail: './images/stumptown.jpg',
      meta: { photoCredit: 'Jordan Ringo', photoCreditUrl: 'https://unsplash.com/@jordyringo' },
    },
    coava: {
      label: 'Coava Coffee',
      url: 'https://coavacoffee.com',
      tags: ['coffee', 'portland'],
      description: 'Portland roaster focused on single-origin coffees and custom-built brewing equipment.',
    },
  },
};
