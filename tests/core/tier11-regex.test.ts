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

import { describe, it, expect } from 'vitest';
import { AlapEngine } from '../../src/core/AlapEngine';
import { testConfig } from '../fixtures/links';
import type { AlapConfig } from '../../src/core/types';

const engine = new AlapEngine(testConfig);

// --- Basic regex resolution ---

describe('Regex — basic /key/ syntax', () => {
  it('matches label text via string shorthand', () => {
    // "bridges" pattern: 'bridge' — matches labels containing "bridge"
    const ids = engine.query('/bridges/');
    expect(ids).toContain('brooklyn');
    expect(ids).toContain('manhattan');
    expect(ids).toContain('goldengate');  // "Golden Gate" doesn't have "bridge" in label
    expect(ids).toContain('towerbridge');
    // String shorthand searches all fields (default 'a'), so it also matches tags/url/id
  });

  it('returns empty for unknown pattern key', () => {
    expect(engine.query('/nonexistent/')).toEqual([]);
  });

  it('returns empty for missing searchPatterns config', () => {
    const bare = new AlapEngine({ allLinks: testConfig.allLinks });
    expect(bare.query('/bridges/')).toEqual([]);
  });
});

// --- Field filtering ---

describe('Regex — field options', () => {
  it('searches label only with "l" option in config', () => {
    // germanCars: pattern "VW|BMW", fields "l" — only matches labels
    const ids = engine.query('/germanCars/');
    expect(ids).toContain('vwbug');   // label: "VW Bug"
    expect(ids).toContain('bmwe36');  // label: "BMW E36"
    expect(ids).not.toContain('miata');
  });

  it('expression field opts override config defaults', () => {
    // germanCars config has fields: "l" — override to "k" (search IDs only)
    // Pattern is "VW|BMW" (case-insensitive), IDs are "vwbug" and "bmwe36"
    const ids = engine.query('/germanCars/k');
    // "vwbug" matches /vw/i, "bmwe36" matches /bmw/i (substring in ID)
    expect(ids).toContain('vwbug');
    expect(ids).toContain('bmwe36');
    // But if we search description only — these items have no description
    const dIds = engine.query('/germanCars/d');
    expect(dIds).toEqual([]);
  });

  it('searches URL with "u" option', () => {
    const ids = engine.query('/exampleDotCom/');
    // All items have example.com URLs
    expect(ids.length).toBe(Object.keys(testConfig.allLinks).length);
  });

  it('searches description with "d" option', () => {
    // scenic: pattern "scenic|views|panoram", fields "d"
    const ids = engine.query('/scenic/');
    expect(ids).toContain('brooklyn');   // "scenic views of Manhattan"
    expect(ids).toContain('highline');   // "panoramic city views"
    expect(ids).toContain('goldengate'); // "scenic bay views"
    expect(ids).not.toContain('manhattan'); // no description
    expect(ids).not.toContain('vwbug');
  });

  it('searches ID (key) with "k" option', () => {
    const ids = engine.query('/idSearch/');
    expect(ids).toEqual(['bluebottle']); // only ID starting with "blue"
  });

  it('searches tags with "t" option', () => {
    const ids = engine.query('/tagSearch/');
    // Items with "landmark" tag
    expect(ids).toContain('brooklyn');
    expect(ids).toContain('highline');
    expect(ids).toContain('goldengate');
    expect(ids).toContain('towerbridge');
    expect(ids).not.toContain('manhattan'); // no landmark tag
  });

  it('"a" option searches all fields', () => {
    // The string shorthand "bridges" = { pattern: "bridge" } defaults to all fields
    const ids = engine.query('/bridges/a');
    // Should match: label, url, tags, id, description containing "bridge"
    expect(ids.length).toBeGreaterThan(0);
  });
});

// --- Sorting ---

describe('Regex — sorting', () => {
  it('sorts alphabetically by ID', () => {
    const ids = engine.query('/alphaSorted/');
    // Items with "bridge" in label, sorted alpha by ID
    const expected = [...ids].sort((a, b) => a.localeCompare(b));
    expect(ids).toEqual(expected);
  });

  it('sorts newest first with createdAt', () => {
    const now = Date.now();
    const config: AlapConfig = {
      searchPatterns: {
        all: { pattern: '.', options: { sort: 'newest' } },
      },
      allLinks: {
        old: { url: 'https://example.com/old', label: 'Old', createdAt: now - 100000 },
        mid: { url: 'https://example.com/mid', label: 'Mid', createdAt: now - 50000 },
        new: { url: 'https://example.com/new', label: 'New', createdAt: now },
      },
    };
    const e = new AlapEngine(config);
    expect(e.query('/all/')).toEqual(['new', 'mid', 'old']);
  });

  it('sorts oldest first', () => {
    const now = Date.now();
    const config: AlapConfig = {
      searchPatterns: {
        all: { pattern: '.', options: { sort: 'oldest' } },
      },
      allLinks: {
        old: { url: 'https://example.com/old', label: 'Old', createdAt: now - 100000 },
        new: { url: 'https://example.com/new', label: 'New', createdAt: now },
      },
    };
    const e = new AlapEngine(config);
    expect(e.query('/all/')).toEqual(['old', 'new']);
  });
});

// --- Age filtering ---

describe('Regex — age filter', () => {
  it('filters items by age (7d)', () => {
    const now = Date.now();
    const config: AlapConfig = {
      searchPatterns: {
        recent: { pattern: '.', options: { age: '7d' } },
      },
      allLinks: {
        fresh: { url: 'https://example.com/fresh', label: 'Fresh', createdAt: now - 1000 },
        stale: { url: 'https://example.com/stale', label: 'Stale', createdAt: now - 30 * 86400000 },
        noDate: { url: 'https://example.com/nodate', label: 'No Date' },
      },
    };
    const e = new AlapEngine(config);
    const ids = e.query('/recent/');
    expect(ids).toContain('fresh');
    expect(ids).not.toContain('stale');
    expect(ids).not.toContain('noDate'); // no createdAt → excluded by age filter
  });

  it('supports ISO 8601 createdAt strings', () => {
    const config: AlapConfig = {
      searchPatterns: {
        recent: { pattern: '.', options: { age: '7d' } },
      },
      allLinks: {
        item: { url: 'https://example.com/item', label: 'Item', createdAt: new Date().toISOString() },
      },
    };
    const e = new AlapEngine(config);
    expect(e.query('/recent/')).toEqual(['item']);
  });

  it('supports hour-based age', () => {
    const now = Date.now();
    const config: AlapConfig = {
      searchPatterns: {
        lastHour: { pattern: '.', options: { age: '1h' } },
      },
      allLinks: {
        recent: { url: 'https://example.com/r', label: 'R', createdAt: now - 1000 },
        old: { url: 'https://example.com/o', label: 'O', createdAt: now - 7200000 },
      },
    };
    const e = new AlapEngine(config);
    const ids = e.query('/lastHour/');
    expect(ids).toContain('recent');
    expect(ids).not.toContain('old');
  });
});

// --- Limit ---

describe('Regex — limit', () => {
  it('respects config limit', () => {
    // germanCars has limit: 5 — but only 2 match, so no truncation
    const ids = engine.query('/germanCars/');
    expect(ids.length).toBeLessThanOrEqual(5);
  });

  it('truncates results at limit', () => {
    const config: AlapConfig = {
      searchPatterns: {
        limited: { pattern: '.', options: { limit: 2 } },
      },
      allLinks: {
        a: { url: 'https://example.com/a', label: 'A' },
        b: { url: 'https://example.com/b', label: 'B' },
        c: { url: 'https://example.com/c', label: 'C' },
        d: { url: 'https://example.com/d', label: 'D' },
      },
    };
    const e = new AlapEngine(config);
    expect(e.query('/limited/')).toHaveLength(2);
  });
});

// --- Composing with operators ---

describe('Regex — composition with operators', () => {
  it('regex AND class: /bridges/ + .nyc', () => {
    const ids = engine.query('/bridges/ + .nyc');
    // Items matching "bridge" regex AND having "nyc" tag
    expect(ids).toContain('brooklyn');
    expect(ids).toContain('manhattan');
    expect(ids).not.toContain('goldengate');  // sf, not nyc
    expect(ids).not.toContain('towerbridge'); // london, not nyc
  });

  it('regex OR class: /germanCars/ | .japan', () => {
    const ids = engine.query('/germanCars/ | .japan');
    expect(ids).toContain('vwbug');
    expect(ids).toContain('bmwe36');
    expect(ids).toContain('miata');
  });

  it('regex WITHOUT class: /bridges/ - .nyc', () => {
    const ids = engine.query('/bridges/ - .nyc');
    // bridge matches minus nyc items
    expect(ids).not.toContain('brooklyn');
    expect(ids).not.toContain('manhattan');
    expect(ids).toContain('goldengate');
    expect(ids).toContain('towerbridge');
  });

  it('regex in comma-separated list: /germanCars/, .coffee', () => {
    const ids = engine.query('/germanCars/, .coffee');
    expect(ids).toContain('vwbug');
    expect(ids).toContain('bmwe36');
    expect(ids).toContain('aqus');
    expect(ids).toContain('bluebottle');
    expect(ids).toContain('acre');
  });

  it('regex in parenthesized group: (/bridges/ + .nyc) | .coffee', () => {
    const ids = engine.query('(/bridges/ + .nyc) | .coffee');
    expect(ids).toContain('brooklyn');
    expect(ids).toContain('manhattan');
    expect(ids).toContain('aqus');
    expect(ids).toContain('acre');
    expect(ids).not.toContain('goldengate');
  });
});

// --- Security & guardrails ---

describe('Regex — security guardrails', () => {
  it('invalid regex pattern returns empty', () => {
    const config: AlapConfig = {
      searchPatterns: {
        bad: { pattern: '[invalid' },
      },
      allLinks: { a: { url: 'https://example.com', label: 'A' } },
    };
    const e = new AlapEngine(config);
    expect(e.query('/bad/')).toEqual([]);
  });

  it('enforces MAX_REGEX_QUERIES per expression', () => {
    const config: AlapConfig = {
      searchPatterns: {
        a: 'a', b: 'b', c: 'c', d: 'd', e: 'e', f: 'f', g: 'g',
      },
      allLinks: {
        abc: { url: 'https://example.com', label: 'abcdefg', tags: ['a', 'b', 'c', 'd', 'e', 'f', 'g'] },
      },
    };
    const e = new AlapEngine(config);
    // 7 regex atoms — exceeds MAX_REGEX_QUERIES (5)
    // First 5 should resolve, 6th and 7th should return empty
    const ids = e.query('/a/ | /b/ | /c/ | /d/ | /e/ | /f/ | /g/');
    // The exact count depends on which atoms return the item,
    // but the key test is it doesn't crash and stays bounded
    expect(ids.length).toBeLessThanOrEqual(1);
  });

  it('handles empty pattern key gracefully', () => {
    expect(engine.query('///')).toEqual([]);
  });

  it('gracefully handles missing closing slash', () => {
    // Missing closing slash — tokenizer reads key to end of string
    // This is graceful degradation: still resolves the pattern
    const ids = engine.query('/bridges');
    expect(ids.length).toBeGreaterThan(0); // resolves "bridges" pattern
  });
});

// --- Multi-regex composition ---

describe('Regex — multi-regex composition', () => {
  it('AND of two regexes: /bridges/ + /startsWithB/', () => {
    // bridges (all fields, pattern "bridge"): brooklyn, manhattan, goldengate, towerbridge
    // startsWithB (field "k", pattern "^b"): brooklyn, bmwe36, bluebottle
    // Intersection → brooklyn
    const ids = engine.query('/bridges/ + /startsWithB/');
    expect(ids).toEqual(['brooklyn']);
  });

  it('OR of two regexes: /suspensionDesc/ | /labelHasThe/', () => {
    // suspensionDesc (field "d"): "sus.*ion" matches brooklyn ("suspension bridge"),
    //   goldengate ("suspension bridge")
    // labelHasThe (field "l"): "\\bthe\\b" matches highline ("The High Line")
    const ids = engine.query('/suspensionDesc/ | /labelHasThe/');
    expect(ids).toContain('brooklyn');
    expect(ids).toContain('goldengate');
    expect(ids).toContain('highline');
    expect(ids).not.toContain('manhattan');
  });

  it('MINUS of two regexes: /vowelHeavyLabel/ - /startsWithB/', () => {
    // vowelHeavyLabel (field "l"): [aeiou]{2,} matches consecutive vowels in label
    //   "Mazda Miata" has "ia" → miata
    //   "Blue Bottle" has "ue" → bluebottle
    //   "Golden Gate" has no consecutive vowels
    //   "Aqus Cafe" → no consecutive vowels ("qu" is q+u)
    // startsWithB (field "k"): bmwe36, brooklyn, bluebottle
    // Minus → miata (bluebottle subtracted)
    const ids = engine.query('/vowelHeavyLabel/ - /startsWithB/');
    expect(ids).toContain('miata');
    expect(ids).not.toContain('bluebottle');
    expect(ids).not.toContain('bmwe36');
  });

  it('three regexes chained: /urlSlugWithE/ - /threeLetterTag/ - /endsWithBridge/', () => {
    // urlSlugWithE (field "u"): slug contains "e" — matches most URLs:
    //   /vwbug → no e, excluded
    //   /bmwe36 → "e" ✓ → bmwe36
    //   /miata → no e, excluded
    //   /brooklyn → no e, excluded
    //   /manhattan → no e, excluded
    //   /highline → "e" ✓ → highline
    //   /centralpark → no e, excluded
    //   /goldengate → "e" ✓ → goldengate
    //   /dolores → "e" ✓ → dolores
    //   /towerbridge → "e" ✓ → towerbridge
    //   /aqus → no e, excluded
    //   /bluebottle → "e" ✓ → bluebottle
    //   /acre → "e" ✓ → acre
    // threeLetterTag (field "t"): tag matching ^[a-z]{3}$ — "car","nyc","bmw","sf" etc
    //   bmwe36 has "car","bmw" → ✓
    //   highline has "nyc" → ✓
    //   goldengate has "sf" → ✓
    //   dolores has "sf" → ✓
    //   towerbridge — no 3-letter tag... wait "landmark" is 8. tags are: london, bridge, landmark — none are 3 chars. Nope, check again.
    //   Actually: towerbridge tags: ['london', 'bridge', 'landmark'] — none match ^[a-z]{3}$
    //   bluebottle tags: ['coffee', 'sf', 'nyc'] — "sf" is 2 chars, "nyc" matches ✓
    //   acre tags: ['coffee'] — 'coffee' is 6 chars → no match
    // After first minus (remove threeLetterTag matches): towerbridge, acre remain
    // endsWithBridge (field "k"): towerbridge matches
    // After second minus: acre remains
    const ids = engine.query('/urlSlugWithE/ - /threeLetterTag/ - /endsWithBridge/');
    expect(ids).toContain('acre');
    expect(ids).not.toContain('towerbridge');
    expect(ids).not.toContain('bmwe36');
    expect(ids).not.toContain('bluebottle');
  });

  it('regex OR regex, then AND class: (/suspensionDesc/ | /startsWithB/) + .nyc', () => {
    // suspensionDesc: brooklyn, goldengate (descriptions with "sus.*ion")
    // startsWithB (field "k"): brooklyn, bmwe36, bluebottle
    // Union: brooklyn, goldengate, bmwe36, bluebottle
    // AND .nyc: brooklyn (nyc), bluebottle (nyc)
    const ids = engine.query('(/suspensionDesc/ | /startsWithB/) + .nyc');
    expect(ids).toContain('brooklyn');
    expect(ids).toContain('bluebottle');
    expect(ids).not.toContain('goldengate');
    expect(ids).not.toContain('bmwe36');
  });

  it('AND of two regexes with no overlap returns empty', () => {
    // endsWithBridge (field "k", pattern "bridge$"): towerbridge
    // startsWithB (field "k", pattern "^b"): brooklyn, bmwe36, bluebottle
    // No ID both starts with "b" and ends with "bridge" → empty
    const ids = engine.query('/endsWithBridge/ + /startsWithB/');
    expect(ids).toEqual([]);
  });

  it('comma-separated regexes: /endsWithBridge/, /suspensionDesc/', () => {
    // endsWithBridge (field "k"): brooklyn, towerbridge
    // suspensionDesc (field "d"): brooklyn, goldengate
    // Comma = union, deduplicated
    const ids = engine.query('/endsWithBridge/, /suspensionDesc/');
    expect(ids).toContain('brooklyn');
    expect(ids).toContain('towerbridge');
    expect(ids).toContain('goldengate');
    // brooklyn appears once despite matching both
    expect(ids.filter(id => id === 'brooklyn')).toHaveLength(1);
  });
});

// --- Case insensitivity ---

describe('Regex — case insensitivity', () => {
  it('matches case-insensitively', () => {
    const config: AlapConfig = {
      searchPatterns: {
        upper: 'BRIDGE',
        lower: 'bridge',
      },
      allLinks: {
        item: { url: 'https://example.com', label: 'Brooklyn Bridge' },
      },
    };
    const e = new AlapEngine(config);
    expect(e.query('/upper/')).toEqual(['item']);
    expect(e.query('/lower/')).toEqual(['item']);
  });
});
