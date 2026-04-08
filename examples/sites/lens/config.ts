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
    // Items WITH URLs and rich metadata
    brooklyn: {
      label: 'Brooklyn Bridge',
      url: 'https://en.wikipedia.org/wiki/Brooklyn_Bridge',
      tags: ['nyc', 'bridge', 'landmark'],
      description: 'Opened in 1883, connecting Manhattan and Brooklyn over the East River. One of the oldest roadway bridges in the United States. Designed by John Augustus Roebling, the bridge took 14 years to build and was the longest suspension bridge in the world at the time of its completion.',
      thumbnail: '/shared/img/brooklyn-bridge.jpg',
      meta: {
        opened: 1883,
        length: '1,825 m',
        architect: 'John Augustus Roebling',
        borough: 'Manhattan / Brooklyn',
        designations: ['National Historic Landmark', 'NYC Landmark', 'National Register of Historic Places'],
      },
    },
    goldengate: {
      label: 'Golden Gate Bridge',
      url: 'https://en.wikipedia.org/wiki/Golden_Gate_Bridge',
      tags: ['sf', 'bridge', 'landmark'],
      description: 'Spanning the Golden Gate strait, this 1937 suspension bridge is an internationally recognized symbol of San Francisco and California.',
      thumbnail: '/shared/img/golden-gate.jpg',
      meta: {
        opened: 1937,
        length: '2,737 m',
        architect: 'Joseph Strauss',
        color: 'International Orange',
      },
    },
    highline: {
      label: 'The High Line',
      url: 'https://en.wikipedia.org/wiki/High_Line',
      tags: ['nyc', 'park', 'landmark'],
      description: 'An elevated linear park built on a historic freight rail line on the west side of Manhattan.',
      meta: {
        opened: 2009,
        length: '2.33 km',
        neighborhood: 'Chelsea / Meatpacking District',
        visitors_per_year: '8 million',
      },
    },

    // Items WITHOUT URLs — pure data, lens-only
    apple: {
      label: 'Apple',
      url: '',
      tags: ['fruit', 'rosaceae'],
      description: 'A widely cultivated tree fruit, rich in fiber and vitamin C.',
      meta: {
        family: 'Rosaceae',
        genus: 'Malus',
        calories: 52,
        sugar: 10.39,
        protein: 0.26,
        fat: 0.17,
        fiber: 2.4,
        vitamin_c: '14% DV',
      },
    },
    banana: {
      label: 'Banana',
      url: '',
      tags: ['fruit', 'musaceae'],
      description: 'An elongated, edible fruit produced by several kinds of large herbaceous flowering plants.',
      meta: {
        family: 'Musaceae',
        genus: 'Musa',
        calories: 89,
        sugar: 12.23,
        protein: 1.09,
        fat: 0.33,
        fiber: 2.6,
        potassium: '358 mg',
      },
    },
    strawberry: {
      label: 'Strawberry',
      url: '',
      tags: ['fruit', 'rosaceae'],
      description: 'A widely grown hybrid species of the genus Fragaria, cultivated worldwide for its fruit.',
      meta: {
        family: 'Rosaceae',
        genus: 'Fragaria',
        calories: 32,
        sugar: 4.89,
        protein: 0.67,
        fat: 0.3,
        fiber: 2.0,
        vitamin_c: '97% DV',
      },
    },

    // Array of strings in meta (chips rendering)
    bluebottle: {
      label: 'Blue Bottle Coffee',
      url: 'https://bluebottlecoffee.com',
      tags: ['coffee', 'sf', 'nyc'],
      description: 'Third-wave coffee roaster founded in Oakland in 2002. Known for single-origin beans and minimalist cafes.',
      meta: {
        founded: 2002,
        headquarters: 'Oakland, CA',
        locations: ['San Francisco', 'New York', 'Los Angeles', 'Tokyo', 'Seoul', 'Hong Kong'],
      },
    },

    // Booleans, long text, array of URLs
    mrrobot: {
      label: 'Mr. Robot',
      url: 'https://en.wikipedia.org/wiki/Mr._Robot',
      tags: ['tv', 'drama', 'thriller', 'tech'],
      description: 'A contemporary and colorful world of hackers and technology. Elliot, a young programmer working as a cyber-security engineer by day and a vigilante hacker by night, finds himself at a crossroads when a mysterious leader of an underground hacker group recruits him to destroy the corporation he is paid to protect.',
      meta: {
        seasons: 4,
        episodes: 45,
        ongoing: false,
        premiered: 2015,
        ended: 2019,
        network: 'USA Network',
        rating: 8.5,
        genres: ['Drama', 'Crime', 'Thriller', 'Science Fiction'],
        related_links: [
          'https://en.wikipedia.org/wiki/Mr._Robot',
          'https://www.imdb.com/title/tt4158110/',
          'https://www.rottentomatoes.com/tv/mr_robot',
        ],
      },
    },

    // Boolean + mixed types exercise
    centralpark: {
      label: 'Central Park',
      url: 'https://en.wikipedia.org/wiki/Central_Park',
      tags: ['nyc', 'park'],
      description: 'An 843-acre urban park in the heart of Manhattan, the most visited urban park in the United States.',
      meta: {
        area: '843 acres',
        established: 1857,
        free_admission: true,
        dogs_allowed: true,
        swimming: false,
        visitors_per_year: '42 million',
        designers: ['Frederick Law Olmsted', 'Calvert Vaux'],
      },
    },
  },
};
