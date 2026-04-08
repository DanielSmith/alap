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

/**
 * Test config for AlapLens. Exercises every meta field type the lens
 * auto-detects: short strings, long strings, numbers, booleans,
 * string arrays (chips), URL arrays (links), display hint overrides,
 * internal meta keys (should be filtered), and URL-less items.
 */
export const lensTestConfig: AlapConfig = {
  settings: {
    listType: 'ul',
    menuTimeout: 5000,
  },

  macros: {
    fruits: { linkItems: 'apple, banana' },
    shows: { linkItems: 'mrrobot, breakingbad' },
    dataonly: { linkItems: 'fruitdata, dictword' },
  },

  allLinks: {
    // Item with URL, thumbnail, tags, description, and rich meta
    mrrobot: {
      label: 'Mr. Robot',
      url: 'https://example.com/mrrobot',
      tags: ['drama', 'thriller', 'scifi'],
      description: 'A contemporary and colorful world of hackers and technology that explores the invisible battle between a security engineer and the forces of corporate greed.',
      thumbnail: 'https://example.com/images/mrrobot.jpg',
      meta: {
        rating: 8.5,
        status: 'Ended',
        premiered: 2015,
        network: 'USA Network',
        ongoing: false,
        genres: ['Drama', 'Thriller', 'Science-Fiction'],
        episodes: [
          'https://example.com/ep/s01e01',
          'https://example.com/ep/s01e02',
          'https://example.com/ep/s01e03',
          'https://example.com/ep/s01e04',
          'https://example.com/ep/s01e05',
          'https://example.com/ep/s01e06',
          'https://example.com/ep/s01e07',
        ],
        // Internal keys — should be filtered by lens
        source: 'json',
        sourceLabel: 'TVMaze API',
        updated: '2026-04-01T12:00:00Z',
        _cacheKey: 'tvmaze_mrrobot',
      },
    },

    // Item with URL, minimal meta
    breakingbad: {
      label: 'Breaking Bad',
      url: 'https://example.com/breakingbad',
      tags: ['drama', 'thriller'],
      description: 'A chemistry teacher diagnosed with lung cancer turns to manufacturing methamphetamine.',
      meta: {
        rating: 9.5,
        status: 'Ended',
      },
    },

    // URL-less item — nutritional data (the data IS the destination)
    fruitdata: {
      label: 'Apple',
      url: '',
      tags: ['rosaceae', 'malus'],
      meta: {
        calories: 52,
        sugar: 10.39,
        protein: 0.26,
        fat: 0.17,
        organic: true,
      },
    },

    // URL-less item — dictionary definition with long text
    dictword: {
      label: 'Serendipity',
      url: '',
      description: 'The occurrence and development of events by chance in a happy or beneficial way, often used to describe unexpected and fortunate discoveries made while looking for something else entirely.',
      meta: {
        partOfSpeech: 'noun',
        origin: 'Coined by Horace Walpole in 1754 based on the Persian fairy tale "The Three Princes of Serendip" whose heroes were always making discoveries by accidents and sagacity of things they were not in quest of.',
        origin_display: 'text',
        synonyms: ['luck', 'fortune', 'chance', 'providence', 'kismet'],
      },
    },

    // Item with custom targetWindow
    apple: {
      label: 'Apple Inc.',
      url: 'https://apple.com',
      tags: ['tech', 'fruit_co'],
      targetWindow: '_self',
      meta: {
        founded: 1976,
        headquarters: 'Cupertino, CA',
      },
    },

    // Item with image (not thumbnail)
    banana: {
      label: 'Banana Stand',
      url: 'https://example.com/banana',
      tags: ['food', 'comedy'],
      image: 'https://example.com/images/banana.jpg',
      altText: 'A frozen banana stand',
    },

    // Item with only label and URL (minimal)
    minimal: {
      label: 'Minimal Link',
      url: 'https://example.com/minimal',
    },

    // Item with empty meta (should not render meta section)
    emptymeta: {
      label: 'Empty Meta',
      url: 'https://example.com/emptymeta',
      meta: {},
    },

    // Item with only internal meta keys (meta section should not render)
    internalmeta: {
      label: 'Internal Only',
      url: 'https://example.com/internal',
      meta: {
        source: 'web',
        sourceLabel: 'Crawler',
        _internal: true,
        atUri: 'at://did:plc:abc/post/123',
        handle: 'user.bsky.social',
        did: 'did:plc:abc',
        updated: '2026-04-01',
        photoCredit: 'Someone',
        photoCreditUrl: 'https://example.com',
      },
    },

    // Item with display hint overrides
    hinted: {
      label: 'Hint Test',
      url: 'https://example.com/hinted',
      meta: {
        bio: 'Short bio forced to text block.',
        bio_display: 'text',
        count: 'five',
        count_display: 'value',
      },
    },

    // Item with null/undefined/empty meta values (should be skipped)
    nullmeta: {
      label: 'Null Meta',
      url: 'https://example.com/nullmeta',
      meta: {
        present: 'visible',
        empty: '',
        nothing: null,
      },
    },
  },
};
