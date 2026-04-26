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
import { validateConfig } from '../../src/core/validateConfig';
import {
  getProvenance,
  isAuthorTier,
  isStorageTier,
  isProtocolTier,
  stampProvenance,
} from '../../src/core/linkProvenance';
import type { AlapConfig, AlapLink, GenerateHandler } from '../../src/core/types';

/**
 * Phase 5 — WeakMap-backed provenance stamping at trust boundaries.
 * These tests verify that each boundary stamps the correct tier,
 * that attacker-supplied fields can't forge a tier, and that the
 * predicates classify correctly.
 */

describe('linkProvenance — primitives', () => {
  it('getProvenance returns undefined for unstamped links', () => {
    const link: AlapLink = { url: 'https://example.com/a', label: 'a' };
    expect(getProvenance(link)).toBeUndefined();
  });

  it('stampProvenance writes and getProvenance reads it back', () => {
    const link: AlapLink = { url: 'https://example.com/a', label: 'a' };
    stampProvenance(link, 'author');
    expect(getProvenance(link)).toBe('author');
  });

  it('later stamp overwrites earlier stamp (WeakMap .set semantics)', () => {
    const link: AlapLink = { url: 'https://example.com/a', label: 'a' };
    stampProvenance(link, 'author');
    stampProvenance(link, 'storage:local');
    expect(getProvenance(link)).toBe('storage:local');
  });
});

describe('linkProvenance — tier predicates', () => {
  it('isAuthorTier true only for author stamp', () => {
    const link: AlapLink = { url: 'https://example.com/a', label: 'a' };
    stampProvenance(link, 'author');
    expect(isAuthorTier(link)).toBe(true);
    expect(isStorageTier(link)).toBe(false);
    expect(isProtocolTier(link)).toBe(false);
  });

  it('isStorageTier true for both storage:local and storage:remote', () => {
    const local: AlapLink = { url: 'https://example.com/a', label: 'a' };
    const remote: AlapLink = { url: 'https://example.com/b', label: 'b' };
    stampProvenance(local, 'storage:local');
    stampProvenance(remote, 'storage:remote');
    expect(isStorageTier(local)).toBe(true);
    expect(isStorageTier(remote)).toBe(true);
    expect(isAuthorTier(local)).toBe(false);
    expect(isProtocolTier(remote)).toBe(false);
  });

  it('isProtocolTier matches any protocol:<name> stamp', () => {
    const webLink: AlapLink = { url: 'https://example.com/a', label: 'a' };
    const hnLink: AlapLink = { url: 'https://example.com/b', label: 'b' };
    stampProvenance(webLink, 'protocol:web');
    stampProvenance(hnLink, 'protocol:hn');
    expect(isProtocolTier(webLink)).toBe(true);
    expect(isProtocolTier(hnLink)).toBe(true);
    expect(isAuthorTier(webLink)).toBe(false);
    expect(isStorageTier(hnLink)).toBe(false);
  });

  it('all predicates false for unstamped links', () => {
    const link: AlapLink = { url: 'https://example.com/a', label: 'a' };
    expect(isAuthorTier(link)).toBe(false);
    expect(isStorageTier(link)).toBe(false);
    expect(isProtocolTier(link)).toBe(false);
  });
});

describe('validateConfig boundary', () => {
  it('stamps every allLinks entry as author by default', () => {
    const config = validateConfig({
      allLinks: {
        a: { url: 'https://example.com/a', label: 'A' },
        b: { url: 'https://example.com/b', label: 'B' },
      },
    });
    expect(isAuthorTier(config.allLinks.a)).toBe(true);
    expect(isAuthorTier(config.allLinks.b)).toBe(true);
  });

  it('passes provenance option through to each link', () => {
    const config = validateConfig(
      {
        allLinks: {
          a: { url: 'https://example.com/a', label: 'A' },
        },
      },
      { provenance: 'storage:remote' },
    );
    expect(getProvenance(config.allLinks.a)).toBe('storage:remote');
    expect(isStorageTier(config.allLinks.a)).toBe(true);
    expect(isAuthorTier(config.allLinks.a)).toBe(false);
  });

  it('attacker-supplied provenance-ish field on raw input is not trusted', () => {
    // A malicious remote config tries to pre-stamp itself as author.
    // validateConfig doesn't copy unknown fields, but even if it did,
    // our WeakMap lookup keys on object identity — not on a field value.
    const raw = {
      allLinks: {
        evil: {
          url: 'https://evil.example/',
          label: 'evil',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          provenance: 'author' as any,
        },
      },
    };
    const config = validateConfig(raw, { provenance: 'storage:remote' });
    expect(getProvenance(config.allLinks.evil)).toBe('storage:remote');
    expect(isAuthorTier(config.allLinks.evil)).toBe(false);
  });
});

describe('AlapEngine protocol boundary', () => {
  it('stamps protocol-fetched ResolvedLinks as protocol:<name>', async () => {
    const config = validateConfig({
      allLinks: { local: { url: 'https://example.com/local', label: 'local' } },
    });
    const handler: GenerateHandler = async () => [
      { url: 'https://fetched.example/a', label: 'A' },
      { url: 'https://fetched.example/b', label: 'B' },
    ];
    const engine = new AlapEngine(config, { handlers: { demo: handler } });
    const resolved = await engine.resolveAsync(':demo:');

    expect(resolved).toHaveLength(2);
    for (const r of resolved) {
      expect(getProvenance(r)).toBe('protocol:demo');
      expect(isProtocolTier(r)).toBe(true);
      expect(isAuthorTier(r)).toBe(false);
      expect(isStorageTier(r)).toBe(false);
    }
  });

  it('carries author provenance from allLinks through resolve() to ResolvedLink', () => {
    const config = validateConfig({
      allLinks: { local: { url: 'https://example.com/local', label: 'local', tags: ['x'] } },
    });
    const engine = new AlapEngine(config);
    const resolved = engine.resolve('.x');
    expect(resolved).toHaveLength(1);
    expect(isAuthorTier(resolved[0])).toBe(true);
    expect(isProtocolTier(resolved[0])).toBe(false);
  });
});

describe('structuredClone round-trip loses stamps (by design)', () => {
  it('cloned links are unstamped until a loader re-stamps them', () => {
    const link: AlapLink = { url: 'https://example.com/a', label: 'A' };
    stampProvenance(link, 'author');
    const clone = structuredClone(link);
    expect(getProvenance(link)).toBe('author');
    expect(getProvenance(clone)).toBeUndefined();
  });
});
