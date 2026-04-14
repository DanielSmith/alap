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
import { webHandler } from 'alap';

const now = Date.now();
const DAY = 86400000;

export const demoConfig: AlapConfig = {
  settings: {
    listType: 'ul',
    menuTimeout: 5000,
  },

  macros: {
    my_bookmarks: { linkItems: 'anseladams, vivianmaier, cartierbresson' },
    nyc_spots:    { linkItems: '.nyc + .landmark' },
  },

  protocols: {
    time: {
      // Using the built-in time handler — included for composition demos
      filter: (segments, link) => {
        const ts = link.createdAt
          ? (typeof link.createdAt === 'number' ? link.createdAt : new Date(link.createdAt).getTime())
          : 0;
        if (!ts) return false;
        const match = segments[0].match(/^(\d+)([dhw])$/);
        if (!match) return false;
        const n = parseInt(match[1], 10);
        const mult = match[2] === 'h' ? 3600000 : match[2] === 'w' ? 7 * DAY : DAY;
        return (now - ts) <= n * mult;
      },
    },
    web: {
      generate: webHandler,
      cache: 10, // cache all web results for 10 minutes
      keys: {
        books: {
          url: 'https://openlibrary.org/search.json',
          linkBase: 'https://openlibrary.org',
          searches: {
            photography:  { q: 'street photography film', limit: 8 },
            architecture: { q: 'urban frank gehry', limit: 8 },
            adams:        { q: 'douglas adams hitchhiker', limit: 8 },
            gardening:    { q: 'vegetable garden organic', limit: 8 },
          },
          map: {
            label: 'title',
            url: 'key',
            meta: { author: 'author_name.0', year: 'first_publish_year' },
          },
          cache: 60, // books don't change often
        },
        // Fallback APIs for testing when Open Library is down
        repos: {
          url: 'https://api.github.com/search/repositories',
          searches: {
            javascript: { q: 'javascript', sort: 'stars', per_page: 8 },
            rust:       { q: 'rust', sort: 'stars', per_page: 8 },
            css:        { q: 'css framework', sort: 'stars', per_page: 8 },
          },
          map: {
            label: 'full_name',
            url: 'html_url',
            meta: { stars: 'stargazers_count', language: 'language' },
          },
        },
        posts: {
          url: 'https://jsonplaceholder.typicode.com/posts',
          linkBase: 'https://jsonplaceholder.typicode.com/posts',
          searches: {
            recent: { _limit: 8 },
          },
          map: {
            label: 'title',
            url: 'id',
          },
        },
      },
    },
  },

  allLinks: {
    // Photography bookmarks
    anseladams: {
      label: 'Ansel Adams — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Ansel_Adams',
      tags: ['photography', 'landscape', 'bookmark'],
      createdAt: now - 3 * DAY,
    },
    vivianmaier: {
      label: 'Vivian Maier — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Vivian_Maier',
      tags: ['photography', 'street', 'bookmark'],
      createdAt: now - 5 * DAY,
    },
    cartierbresson: {
      label: 'Henri Cartier-Bresson — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Henri_Cartier-Bresson',
      tags: ['photography', 'street', 'bookmark'],
      createdAt: now - 10 * DAY,
    },

    // NYC landmarks
    brooklyn: {
      label: 'Brooklyn Bridge',
      url: 'https://en.wikipedia.org/wiki/Brooklyn_Bridge',
      tags: ['nyc', 'bridge', 'landmark'],
      createdAt: now - 2 * DAY,
    },
    highline: {
      label: 'The High Line',
      url: 'https://en.wikipedia.org/wiki/High_Line',
      tags: ['nyc', 'park', 'landmark'],
      createdAt: now - 1 * DAY,
    },
    centralpark: {
      label: 'Central Park',
      url: 'https://en.wikipedia.org/wiki/Central_Park',
      tags: ['nyc', 'park', 'landmark'],
      createdAt: now - 30 * DAY,
    },

    // Coffee
    bluebottle: {
      label: 'Blue Bottle Coffee',
      url: 'https://bluebottlecoffee.com',
      tags: ['coffee', 'nyc'],
      createdAt: now - 4 * DAY,
    },
  },
};
