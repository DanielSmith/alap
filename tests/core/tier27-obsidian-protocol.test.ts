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

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { obsidianHandler } from '../../src/protocols/obsidian';
import { hydrateNote, hydrateNotes, isSafeVaultPath, restSearch } from '../../src/protocols/obsidian/rest';
import { redactKey, restFetch } from '../../src/protocols/obsidian/restClient';
import {
  OBSIDIAN_API_KEY_ENV,
  OBSIDIAN_LINK_CSS_CLASS,
  OBSIDIAN_MODE_REST,
} from '../../src/protocols/obsidian/constants';
import { expandTemplate, loadOptional } from '../../src/protocols/shared';
import { isWithin } from '../../src/protocols/shared/pathSafety';
import { isLocalhost } from '../../src/protocols/shared/localhostGuard';
import { MAX_GENERATED_LINKS } from '../../src/constants';
import type { AlapConfig } from '../../src/core/types';

/**
 * Tier 27: :obsidian: protocol (core mode).
 *
 * Exercises the handler against a synthetic vault written to a tmp dir.
 * Real vaults live on the user's disk and are covered by the smoke
 * example in `examples/obsidian-core-smoke.mjs`.
 */

let vaultPath: string;
let outsidePath: string;

const writeNote = async (rel: string, contents: string): Promise<void> => {
  const full = join(vaultPath, rel);
  await mkdir(join(full, '..'), { recursive: true });
  await writeFile(full, contents, 'utf8');
};

const mockConfig = (overrides: Record<string, unknown> = {}): AlapConfig => ({
  settings: { listType: 'ul' },
  protocols: {
    obsidian: {
      vault: 'TestVault',
      vaultPath,
      ...overrides,
    },
  },
  allLinks: {},
});

beforeAll(async () => {
  vaultPath = await mkdtemp(join(tmpdir(), 'alap-obsidian-'));
  outsidePath = await mkdtemp(join(tmpdir(), 'alap-obsidian-outside-'));

  await writeNote(
    'index.md',
    'Hello from ExampleVault\n\nThis vault is for #testing the protocol.\n',
  );

  await writeNote(
    'bridges/brooklyn.md',
    [
      '---',
      'title: Brooklyn Bridge',
      'tags: [nyc, bridge]',
      'description: A New York classic',
      'cover: attachments/brooklyn.jpg',
      '---',
      'The East River crossing between Manhattan and Brooklyn.',
    ].join('\n'),
  );

  await writeNote(
    'bridges/manhattan.md',
    [
      '---',
      'title: Manhattan Bridge',
      'tags:',
      '  - nyc',
      '  - bridge',
      '---',
      'Just north of the Brooklyn Bridge.',
    ].join('\n'),
  );

  await writeNote(
    'coffee.md',
    [
      '---',
      'title: Coffee Spots',
      'description: Where to find good coffee',
      '---',
      'A list of cafes. ![[attachments/cafe.png]]',
    ].join('\n'),
  );

  // Should be excluded by default ignore globs
  await writeNote('.obsidian/app.json', '{"plugins":[]}');
  await writeNote('.trash/old-note.md', '# Old\n\nForgotten content.');

  // A file outside the vault — referenced via symlink for traversal tests.
  await writeFile(join(outsidePath, 'secret.md'), '# Secret\n\nDo not read.');
});

afterAll(async () => {
  await rm(vaultPath, { recursive: true, force: true });
  await rm(outsidePath, { recursive: true, force: true });
});

describe('Tier 27: :obsidian: protocol — shared helpers', () => {
  it('isWithin accepts paths inside the base', () => {
    expect(isWithin('/a/b', '/a/b/c')).toBe(true);
    expect(isWithin('/a/b', '/a/b')).toBe(true);
  });

  it('isWithin rejects paths outside the base', () => {
    expect(isWithin('/a/b', '/a/bc')).toBe(false);
    expect(isWithin('/a/b', '/a')).toBe(false);
    expect(isWithin('/a/b', '/c')).toBe(false);
  });

  it('isLocalhost matches loopback hosts', () => {
    expect(isLocalhost('localhost')).toBe(true);
    expect(isLocalhost('127.0.0.1')).toBe(true);
    expect(isLocalhost('127.55.66.77')).toBe(true);
    expect(isLocalhost('::1')).toBe(true);
    expect(isLocalhost('[::1]')).toBe(true);
  });

  it('isLocalhost rejects non-loopback hosts', () => {
    expect(isLocalhost('example.com')).toBe(false);
    expect(isLocalhost('10.0.0.1')).toBe(false);
    expect(isLocalhost('')).toBe(false);
    expect(isLocalhost(undefined)).toBe(false);
  });

  it('expandTemplate substitutes and encodes by default', () => {
    const out = expandTemplate('obsidian://open?vault={vault}&file={path}', {
      vault: 'My Vault',
      path: 'notes/a b.md',
    });
    expect(out).toBe('obsidian://open?vault=My%20Vault&file=notes%2Fa%20b.md');
  });

  it('expandTemplate honours the raw opt-out', () => {
    const out = expandTemplate('{host}/{path}', { host: 'https://ex.com', path: 'foo' }, { raw: ['host'] });
    expect(out).toBe('https://ex.com/foo');
  });

  it('expandTemplate leaves unknown vars in place', () => {
    expect(expandTemplate('{a}-{b}', { a: 'x' })).toBe('x-{b}');
  });

  it('loadOptional returns null for a missing package', async () => {
    const mod = await loadOptional('this-package-definitely-does-not-exist-abc123');
    expect(mod).toBeNull();
  });
});

describe('Tier 27: :obsidian:core: — vault walking', () => {
  it('returns links for every note when the query is empty', async () => {
    const links = await obsidianHandler(['core', ''], mockConfig());
    const paths = links.map((l) => (l.meta as Record<string, unknown>).path);
    expect(paths).toContain('index.md');
    expect(paths).toContain('bridges/brooklyn.md');
    expect(paths).toContain('bridges/manhattan.md');
    expect(paths).toContain('coffee.md');
  });

  it('excludes .obsidian and .trash by default', async () => {
    const links = await obsidianHandler(['core', ''], mockConfig());
    const paths = links.map((l) => (l.meta as Record<string, unknown>).path as string);
    expect(paths.some((p) => p.startsWith('.obsidian/'))).toBe(false);
    expect(paths.some((p) => p.startsWith('.trash/'))).toBe(false);
  });

  it('matches frontmatter title', async () => {
    const links = await obsidianHandler(['core', 'brooklyn'], mockConfig());
    // "brooklyn" also appears in the manhattan note's body — both should match.
    const labels = links.map((l) => l.label).sort();
    expect(labels).toContain('Brooklyn Bridge');
  });

  it('matches frontmatter tag', async () => {
    const links = await obsidianHandler(['core', 'nyc'], mockConfig());
    const labels = links.map((l) => l.label).sort();
    expect(labels).toEqual(['Brooklyn Bridge', 'Manhattan Bridge']);
  });

  // Regression: the minimal-YAML fallback parser used to require leading
  // whitespace before a `-` block-sequence item. Some YAML emitters
  // (including the converter at `scripts/lib/vault_from_md/`) write
  // unindented block sequences — `tags:\n- foo` — which is valid YAML
  // but caused the fallback to read `tags` as an empty array.
  it('parses unindented block-sequence tags in frontmatter', async () => {
    await writeNote(
      'projects/alpha.md',
      [
        '---',
        'title: Alpha',
        'tags:',
        '- project',
        '- alpha',
        'description: An unindented-tags note',
        '---',
        'Body content.',
      ].join('\n'),
    );
    const links = await obsidianHandler(['core', 'project'], mockConfig());
    const labels = links.map((l) => l.label).sort();
    expect(labels).toContain('Alpha');
  });

  it('matches body text when body field is enabled', async () => {
    const links = await obsidianHandler(
      ['core', 'testing', 'fields=body'],
      mockConfig(),
    );
    expect(links).toHaveLength(1);
    expect((links[0].meta as Record<string, unknown>).path).toBe('index.md');
  });

  it('restricts search to named fields via fields= arg', async () => {
    // "crossing" only appears in bridges/brooklyn.md body — limiting fields
    // to `title` should therefore return nothing.
    const links = await obsidianHandler(
      ['core', 'crossing', 'fields=title'],
      mockConfig(),
    );
    expect(links).toHaveLength(0);
  });

  it('respects a user-supplied maxFiles cap', async () => {
    const links = await obsidianHandler(['core', ''], mockConfig({ maxFiles: 2 }));
    expect(links.length).toBeLessThanOrEqual(2);
  });
});

describe('Tier 27: :obsidian:core: — link building', () => {
  it('builds an obsidian:// URI with encoded path', async () => {
    const links = await obsidianHandler(['core', 'brooklyn'], mockConfig());
    expect(links[0].url).toBe('obsidian://open?vault=TestVault&file=bridges%2Fbrooklyn.md');
  });

  it('falls back to basename when frontmatter has no title', async () => {
    const links = await obsidianHandler(['core', 'Hello'], mockConfig({ }));
    expect(links.find((l) => l.label === 'index')).toBeTruthy();
  });

  it('pulls tags, description, and thumbnail from frontmatter', async () => {
    const links = await obsidianHandler(['core', 'brooklyn'], mockConfig());
    const link = links[0];
    expect(link.tags).toEqual(['nyc', 'bridge']);
    expect(link.description).toBe('A New York classic');
    expect(link.thumbnail).toBe('/vault-media/attachments/brooklyn.jpg');
    expect(link.cssClass).toBe(OBSIDIAN_LINK_CSS_CLASS);
  });

  it('respects mediaBaseUrl for tier-3 thumbnails', async () => {
    const links = await obsidianHandler(
      ['core', 'brooklyn'],
      mockConfig({ mediaBaseUrl: 'https://cdn.example.com/vault/' }),
    );
    expect(links[0].thumbnail).toBe('https://cdn.example.com/vault/attachments/brooklyn.jpg');
  });

  it('falls back to first inline wikilink image when no frontmatter cover', async () => {
    const links = await obsidianHandler(['core', 'Coffee Spots'], mockConfig());
    expect(links).toHaveLength(1);
    expect(links[0].thumbnail).toBe('/vault-media/attachments/cafe.png');
  });
});

describe('Tier 27: :obsidian:core: — $preset segments', () => {
  const withPresets = () => mockConfig({
    searches: {
      meta:  { fields: 'title;tags' },
      small: { maxFiles: 2 },
      body:  { fields: 'body' },
    },
  });

  it('expands $meta to restrict search to title/tags', async () => {
    // "crossing" only appears in a body — $meta forces title/tags,
    // so the match count should be zero.
    const links = await obsidianHandler(['core', 'crossing', '$meta'], withPresets());
    expect(links).toHaveLength(0);
  });

  it('$small caps maxFiles', async () => {
    const links = await obsidianHandler(['core', '', '$small'], withPresets());
    expect(links.length).toBeLessThanOrEqual(2);
  });

  it('inline key=value wins over a preset', async () => {
    // $meta would exclude body, but inline `fields=body` overrides and
    // forces a body-only scan where "crossing" does appear.
    const links = await obsidianHandler(
      ['core', 'crossing', '$meta', 'fields=body'],
      withPresets(),
    );
    expect(links.length).toBeGreaterThan(0);
  });

  it('later preset wins over earlier preset', async () => {
    // $meta says title;tags. $body then overrides fields to body-only.
    const links = await obsidianHandler(
      ['core', 'crossing', '$meta', '$body'],
      withPresets(),
    );
    expect(links.length).toBeGreaterThan(0);
  });

  it('warns on unknown preset and proceeds with defaults', async () => {
    const links = await obsidianHandler(
      ['core', 'brooklyn', '$nonexistent'],
      withPresets(),
    );
    // Default field set includes body, so the query still matches.
    expect(links.length).toBeGreaterThan(0);
  });
});

describe('Tier 27: :obsidian:core: — inline tags + tagAliases (integration)', () => {
  let tagsVaultPath: string;

  const writeTagNote = async (rel: string, contents: string): Promise<void> => {
    const full = join(tagsVaultPath, rel);
    await mkdir(join(full, '..'), { recursive: true });
    await writeFile(full, contents, 'utf8');
  };

  const tagsConfig = (overrides: Record<string, unknown> = {}): AlapConfig => ({
    settings: { listType: 'ul' },
    protocols: {
      obsidian: {
        vault: 'TagsVault',
        vaultPath: tagsVaultPath,
        ...overrides,
      },
    },
    allLinks: {},
  });

  beforeAll(async () => {
    tagsVaultPath = await mkdtemp(join(tmpdir(), 'alap-obsidian-tags-'));

    // Inline tags only — no frontmatter.
    await writeFile(
      join(tagsVaultPath, 'techno-mix.md'),
      'A weekend mix featuring #techno and #ambient sounds.\n',
      'utf8',
    );

    // Frontmatter + inline, with a duplicate to prove dedup.
    await writeFile(
      join(tagsVaultPath, 'work-log.md'),
      [
        '---',
        'title: Work Log',
        'tags: [alap, work]',
        '---',
        'Today on #alap (again) and a bit of #work/project/q2 planning.',
      ].join('\n'),
      'utf8',
    );

    // Obsidian-unsafe shapes exercised by tagAliases.
    await writeFile(
      join(tagsVaultPath, 'dash-notes.md'),
      [
        '---',
        'title: Dash Notes',
        '---',
        'Tagged with #this-tag and also #work/project here.',
      ].join('\n'),
      'utf8',
    );
  });

  afterAll(async () => {
    await rm(tagsVaultPath, { recursive: true, force: true });
  });

  it('surfaces inline body tags in the emitted link.tags', async () => {
    const links = await obsidianHandler(['core', 'techno-mix'], tagsConfig());
    const link = links.find((l) => l.label === 'techno-mix');
    expect(link).toBeDefined();
    expect(link!.tags).toEqual(['techno', 'ambient']);
  });

  it('merges frontmatter and inline tags with dedup, frontmatter first', async () => {
    const links = await obsidianHandler(['core', 'Work Log'], tagsConfig());
    const link = links.find((l) => l.label === 'Work Log');
    expect(link).toBeDefined();
    // frontmatter [alap, work] first; inline #alap deduped; #work/project/q2 appended
    expect(link!.tags).toEqual(['alap', 'work', 'work/project/q2']);
  });

  it('fields=tags narrow hits an inline-only body tag', async () => {
    const links = await obsidianHandler(
      ['core', 'techno', 'fields=tags'],
      tagsConfig(),
    );
    const labels = links.map((l) => l.label);
    expect(labels).toContain('techno-mix');
  });

  it('reverse-rewrites emitted tags via tagAliases (tagToKey)', async () => {
    const links = await obsidianHandler(
      ['core', 'Dash Notes'],
      tagsConfig({ tagAliases: { thisDashTag: 'this-tag', work_project: 'work/project' } }),
    );
    const link = links.find((l) => l.label === 'Dash Notes');
    expect(link).toBeDefined();
    // Raw tags `this-tag` and `work/project` become Alap-canonical handles
    // so `.thisDashTag` and `.work_project` atoms can address them.
    expect(link!.tags).toEqual(['thisDashTag', 'work_project']);
  });

  it('leaves unaliased tags verbatim (selective override, not translation)', async () => {
    const links = await obsidianHandler(
      ['core', 'Dash Notes'],
      // Only alias one of the two unsafe tags.
      tagsConfig({ tagAliases: { thisDashTag: 'this-tag' } }),
    );
    const link = links.find((l) => l.label === 'Dash Notes');
    expect(link!.tags).toEqual(['thisDashTag', 'work/project']);
  });

  it('forward alias: querying the handle reaches notes tagged with the raw value', async () => {
    // `#work/project` is the real tag; `work_project` is the declared handle.
    const links = await obsidianHandler(
      ['core', 'work_project', 'fields=tags'],
      tagsConfig({ tagAliases: { work_project: 'work/project' } }),
    );
    const labels = links.map((l) => l.label).sort();
    // Both dash-notes (#work/project) and work-log (#work/project/q2) hit.
    expect(labels).toEqual(['Dash Notes', 'Work Log']);
  });

  it('forward alias is exact-key only — a prefix of the handle does not expand', async () => {
    // `work_proj` is a prefix of the handle `work_project` but must not
    // alias-expand. Without expansion, `work_proj` substring-matches no
    // tag and the result set is empty.
    const links = await obsidianHandler(
      ['core', 'work_proj', 'fields=tags'],
      tagsConfig({ tagAliases: { work_project: 'work/project' } }),
    );
    expect(links).toEqual([]);
  });
});

describe('Tier 27: :obsidian: — error paths', () => {
  it('returns [] when vaultPath is missing', async () => {
    const config: AlapConfig = {
      protocols: { obsidian: {} },
      allLinks: {},
    };
    expect(await obsidianHandler(['core', 'anything'], config)).toEqual([]);
  });

  it('returns [] when vaultPath does not exist', async () => {
    const config = mockConfig({ vaultPath: '/nonexistent/path/abc-alap-test' });
    expect(await obsidianHandler(['core', ''], config)).toEqual([]);
  });

  it('returns [] for an unknown mode', async () => {
    const links = await obsidianHandler(['unknown', 'x'], mockConfig());
    expect(links).toEqual([]);
  });

  describe('rest mode validation', () => {
    let savedKey: string | undefined;
    beforeAll(() => { savedKey = process.env[OBSIDIAN_API_KEY_ENV]; });
    afterAll(() => {
      if (savedKey === undefined) delete process.env[OBSIDIAN_API_KEY_ENV];
      else process.env[OBSIDIAN_API_KEY_ENV] = savedKey;
    });

    it('returns [] when no apiKey is configured and no env var is set', async () => {
      delete process.env[OBSIDIAN_API_KEY_ENV];
      const links = await obsidianHandler([OBSIDIAN_MODE_REST, 'x'], mockConfig());
      expect(links).toEqual([]);
    });

    it('falls back to OBSIDIAN_API_KEY env var when rest.apiKey is missing', async () => {
      process.env[OBSIDIAN_API_KEY_ENV] = 'test-key-from-env';
      // vault is set by mockConfig — env-supplied key clears the apiKey gate
      const links = await obsidianHandler([OBSIDIAN_MODE_REST, 'x'], mockConfig());
      // Step 1 returns [] once gates pass; step 2 will fill in the actual fetch
      expect(links).toEqual([]);
    });

    it('returns [] when vault display name is missing', async () => {
      process.env[OBSIDIAN_API_KEY_ENV] = 'test-key';
      const config: AlapConfig = {
        protocols: {
          obsidian: {
            // vault deliberately omitted; vaultPath only used by core mode
          },
        },
        allLinks: {},
      };
      const links = await obsidianHandler([OBSIDIAN_MODE_REST, 'x'], config);
      expect(links).toEqual([]);
    });

    it('dispatches to restSearch when apiKey and vault are present', async () => {
      delete process.env[OBSIDIAN_API_KEY_ENV];
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => '[]',
        json: async () => [],
        headers: new Headers(),
      } as unknown as Response);
      const config: AlapConfig = {
        protocols: {
          obsidian: {
            vault: 'TestVault',
            rest: { apiKey: 'inline-key' },
          },
        },
        allLinks: {},
      };
      const links = await obsidianHandler([OBSIDIAN_MODE_REST, 'x'], config);
      // Empty search result → no hydration → no links (the end-to-end
      // flow with real hits is covered by the `resolveRest end-to-end`
      // block at the bottom of this file).
      expect(links).toEqual([]);
      expect(fetchSpy).toHaveBeenCalledOnce();
      const url = String(fetchSpy.mock.calls[0][0]);
      expect(url).toContain('/search/simple/?query=x');
      fetchSpy.mockRestore();
    });
  });

  it('does not follow symlinks that escape the vault', async () => {
    // Wire a symlink inside the vault pointing at a file outside it.
    const linkPath = join(vaultPath, 'escape.md');
    await rm(linkPath, { force: true });
    await symlink(join(outsidePath, 'secret.md'), linkPath);

    const links = await obsidianHandler(['core', 'secret'], mockConfig());
    const paths = links.map((l) => (l.meta as Record<string, unknown>).path);
    expect(paths).not.toContain('escape.md');
    await rm(linkPath, { force: true });
  });
});

describe('Tier 27: :obsidian:rest: — restClient', () => {
  describe('redactKey', () => {
    it('strips the raw key from a string', () => {
      expect(redactKey('failed to fetch with key sk_live_abc123', 'sk_live_abc123'))
        .toBe('failed to fetch with key ***');
    });

    it('strips a Bearer token form', () => {
      expect(redactKey('Authorization: Bearer sk_live_abc123', 'sk_live_abc123'))
        .toBe('Authorization: Bearer ***');
    });

    it('strips multiple occurrences', () => {
      expect(redactKey('key=secret&token=secret', 'secret'))
        .toBe('key=***&token=***');
    });

    it('passes through when the key is empty or missing', () => {
      expect(redactKey('untouched text', '')).toBe('untouched text');
      expect(redactKey('untouched text', undefined)).toBe('untouched text');
    });

    it('escapes regex metacharacters in the key', () => {
      // A key containing `.` or `+` shouldn't act as a regex wildcard
      expect(redactKey('xax bax cax', 'a.x')).toBe('xax bax cax');
      expect(redactKey('a.x b.x', 'a.x')).toBe('*** b.x');
    });
  });

  describe('restFetch — host policy', () => {
    let fetchSpy: ReturnType<typeof vi.spyOn>;
    afterEach(() => { fetchSpy?.mockRestore(); });

    const okResponse = (body: unknown = {}): Response => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(body),
      json: async () => body,
      headers: new Headers(),
    } as unknown as Response);

    it('blocks a non-loopback host that is not on the allowlist', async () => {
      fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(okResponse());
      const resp = await restFetch(
        { apiKey: 'k', host: 'vault.example.com' },
        '/search/simple/?query=x',
      );
      expect(resp).toBeNull();
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('permits a non-loopback host that is on an explicit allowlist', async () => {
      fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(okResponse({ hits: [] }));
      const resp = await restFetch(
        {
          apiKey: 'k',
          host: 'vault.example.com',
          allowedHosts: ['vault.example.com'],
        },
        '/search/simple/?query=x',
      );
      expect(resp).not.toBeNull();
      expect(fetchSpy).toHaveBeenCalledOnce();
      const url = String(fetchSpy.mock.calls[0][0]);
      expect(url).toContain('vault.example.com');
    });

    it('uses loopback defaults when no host is configured', async () => {
      fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(okResponse({ hits: [] }));
      await restFetch({ apiKey: 'k' }, '/search/simple/?query=x');
      const url = String(fetchSpy.mock.calls[0][0]);
      expect(url).toContain('https://127.0.0.1:27124');
    });

    it('returns null without dispatching when apiKey is missing', async () => {
      fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(okResponse());
      const resp = await restFetch({}, '/search/simple/?query=x');
      expect(resp).toBeNull();
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  describe('restFetch — auth + URL construction', () => {
    let fetchSpy: ReturnType<typeof vi.spyOn>;
    afterEach(() => { fetchSpy?.mockRestore(); });

    const okResponse = (): Response => ({
      ok: true,
      status: 200,
      text: async () => '',
      json: async () => ({}),
      headers: new Headers(),
    } as unknown as Response);

    it('sets the Authorization header to Bearer <apiKey>', async () => {
      fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(okResponse());
      await restFetch({ apiKey: 'sk_test_123' }, '/vault/notes/x.md');
      const init = fetchSpy.mock.calls[0][1] as RequestInit | undefined;
      const headers = init?.headers as Record<string, string>;
      expect(headers.Authorization).toBe('Bearer sk_test_123');
    });

    it('honors method, body, and extra headers from opts', async () => {
      fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(okResponse());
      await restFetch(
        { apiKey: 'k' },
        '/search/',
        { method: 'POST', body: 'q', headers: { 'X-Custom': 'v' } },
      );
      const init = fetchSpy.mock.calls[0][1] as RequestInit | undefined;
      expect(init?.method).toBe('POST');
      expect(init?.body).toBe('q');
      expect((init?.headers as Record<string, string>)['X-Custom']).toBe('v');
    });

    it('returns ok=false for a non-2xx response', async () => {
      fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
        json: async () => ({ error: 'Unauthorized' }),
        headers: new Headers(),
      } as unknown as Response);
      const resp = await restFetch({ apiKey: 'k' }, '/vault/');
      expect(resp).not.toBeNull();
      expect(resp?.ok).toBe(false);
      expect(resp?.status).toBe(401);
    });
  });

  describe('restFetch — timeout + error handling', () => {
    let fetchSpy: ReturnType<typeof vi.spyOn>;
    afterEach(() => { fetchSpy?.mockRestore(); });

    it('returns null and warns on a network error', async () => {
      fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'));
      const resp = await restFetch({ apiKey: 'k' }, '/search/simple/?query=x');
      expect(resp).toBeNull();
    });

    it('aborts when the timeout fires', async () => {
      // Mock fetch to never resolve unless aborted; expect the AbortController
      // to fire and the helper to return null.
      fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation((_url, init) => {
        return new Promise((_resolve, reject) => {
          const signal = (init as RequestInit | undefined)?.signal;
          signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
        });
      });
      const resp = await restFetch(
        { apiKey: 'k' },
        '/search/simple/?query=x',
        { timeoutMs: 10 },
      );
      expect(resp).toBeNull();
    });
  });

  describe('restFetch — TLS bypass policy', () => {
    let fetchSpy: ReturnType<typeof vi.spyOn>;
    afterEach(() => { fetchSpy?.mockRestore(); });

    const okResponse = (): Response => ({
      ok: true,
      status: 200,
      text: async () => '',
      json: async () => ({}),
      headers: new Headers(),
    } as unknown as Response);

    it('ignores rejectUnauthorized=false on non-loopback hosts (uses native fetch)', async () => {
      fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(okResponse());
      const resp = await restFetch(
        {
          apiKey: 'k',
          host: 'vault.example.com',
          allowedHosts: ['vault.example.com'],
          rejectUnauthorized: false,
        },
        '/vault/',
      );
      expect(resp).not.toBeNull();
      // If TLS bypass had kicked in, fetch would not have been called
      // (the node:https path is taken instead).
      expect(fetchSpy).toHaveBeenCalledOnce();
    });
  });
});

describe('Tier 27: :obsidian:rest: — restSearch', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  afterEach(() => { fetchSpy?.mockRestore(); });

  const jsonResponse = (body: unknown, status = 200): Response => ({
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
    json: async () => body,
    headers: new Headers(),
  } as unknown as Response);

  it('POSTs to /search/simple/ with the encoded query', async () => {
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse([]));
    await restSearch({ apiKey: 'k' }, 'coffee shops');
    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, init] = fetchSpy.mock.calls[0];
    expect(String(url)).toContain('/search/simple/?query=coffee%20shops');
    expect((init as RequestInit | undefined)?.method).toBe('POST');
  });

  it('maps hits to { relPath, basename } and strips .md', async () => {
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse([
      { filename: 'Music/favorites.md', score: 1.0, matches: [] },
      { filename: 'inbox.md', score: 0.8, matches: [] },
      { filename: 'nested/deep/path/note.md', score: 0.5, matches: [] },
    ]));
    const results = await restSearch({ apiKey: 'k' }, 'x');
    expect(results).toEqual([
      { relPath: 'Music/favorites.md', basename: 'favorites' },
      { relPath: 'inbox.md', basename: 'inbox' },
      { relPath: 'nested/deep/path/note.md', basename: 'note' },
    ]);
  });

  it('skips malformed hits without killing the batch', async () => {
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse([
      { filename: 'good.md' },
      null,
      'string-instead-of-object',
      { score: 1.0 }, // no filename
      { filename: '' }, // empty filename
      { filename: 42 }, // wrong type
      { filename: 'also-good.md' },
    ]));
    const results = await restSearch({ apiKey: 'k' }, 'x');
    expect(results.map(r => r.basename)).toEqual(['good', 'also-good']);
  });

  it('returns [] on non-2xx response', async () => {
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({ error: 'Unauthorized' }, 401),
    );
    const results = await restSearch({ apiKey: 'k' }, 'x');
    expect(results).toEqual([]);
  });

  it('returns [] when response body is not JSON', async () => {
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => 'not json',
      json: async () => { throw new SyntaxError('unexpected token'); },
      headers: new Headers(),
    } as unknown as Response);
    const results = await restSearch({ apiKey: 'k' }, 'x');
    expect(results).toEqual([]);
  });

  it('returns [] when response is JSON but not an array', async () => {
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ unexpected: 'shape' }));
    const results = await restSearch({ apiKey: 'k' }, 'x');
    expect(results).toEqual([]);
  });

  it('returns [] when restFetch returns null (e.g. host blocked)', async () => {
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse([{ filename: 'ignored.md' }]));
    const results = await restSearch(
      { apiKey: 'k', host: 'vault.example.com' }, // not on allowlist
      'x',
    );
    expect(results).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('Tier 27: :obsidian:rest: — isSafeVaultPath', () => {
  it('accepts simple vault-relative paths', () => {
    expect(isSafeVaultPath('note.md')).toBe(true);
    expect(isSafeVaultPath('folder/note.md')).toBe(true);
    expect(isSafeVaultPath('a/b/c/deep.md')).toBe(true);
    expect(isSafeVaultPath('with spaces.md')).toBe(true);
    expect(isSafeVaultPath('émoji-🦊.md')).toBe(true);
  });

  it('rejects empty and NUL-contaminated paths', () => {
    expect(isSafeVaultPath('')).toBe(false);
    expect(isSafeVaultPath('good\0.md')).toBe(false);
  });

  it('rejects absolute paths and Windows drive prefixes', () => {
    expect(isSafeVaultPath('/etc/passwd')).toBe(false);
    expect(isSafeVaultPath('\\windows\\system32')).toBe(false);
    expect(isSafeVaultPath('C:\\windows\\system32')).toBe(false);
    expect(isSafeVaultPath('C:/Users/foo')).toBe(false);
  });

  it('rejects any `..` segment in either slash direction', () => {
    expect(isSafeVaultPath('../etc/passwd')).toBe(false);
    expect(isSafeVaultPath('notes/../../secret.md')).toBe(false);
    expect(isSafeVaultPath('..\\windows\\system32')).toBe(false);
    expect(isSafeVaultPath('notes\\..\\secret.md')).toBe(false);
  });

  it('does not trip on names that merely contain dots', () => {
    expect(isSafeVaultPath('..note.md')).toBe(true);        // two dots in filename, not a segment
    expect(isSafeVaultPath('folder/..hidden.md')).toBe(true);
    expect(isSafeVaultPath('a.b.c.md')).toBe(true);
  });
});

describe('Tier 27: :obsidian:rest: — hydrateNote / hydrateNotes', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  afterEach(() => { fetchSpy?.mockRestore(); });

  const textResponse = (body: string, status = 200): Response => ({
    ok: status >= 200 && status < 300,
    status,
    text: async () => body,
    json: async () => JSON.parse(body),
    headers: new Headers(),
  } as unknown as Response);

  /** Builds a fetch mock that serves different bodies keyed on URL substring. */
  const routedFetch = (routes: Record<string, Response>) =>
    vi.spyOn(globalThis, 'fetch').mockImplementation(((url: string | URL) => {
      const u = String(url);
      for (const key of Object.keys(routes)) {
        if (u.includes(key)) return Promise.resolve(routes[key]);
      }
      return Promise.reject(new Error(`unexpected URL: ${u}`));
    }) as typeof fetch);

  it('GETs /vault/{path} and parses frontmatter + body', async () => {
    fetchSpy = routedFetch({
      '/vault/notes/one.md': textResponse(
        '---\ntitle: First\ntags: [a, b]\n---\nhello body',
      ),
    });
    const note = await hydrateNote({ apiKey: 'k' }, 'notes/one.md');
    expect(note).not.toBeNull();
    expect(note!.relPath).toBe('notes/one.md');
    expect(note!.basename).toBe('one');
    expect(note!.frontmatter.title).toBe('First');
    expect(note!.frontmatter.tags).toEqual(['a', 'b']);
    expect(note!.body).toBe('hello body');
    expect(note!.absPath).toBeUndefined();
    const init = fetchSpy.mock.calls[0][1] as RequestInit | undefined;
    expect(init?.method ?? 'GET').toBe('GET');
  });

  it('URL-encodes path segments but preserves slashes', async () => {
    fetchSpy = routedFetch({
      '/vault/a%20folder/note%3F.md': textResponse('plain body'),
    });
    const note = await hydrateNote({ apiKey: 'k' }, 'a folder/note?.md');
    expect(note).not.toBeNull();
    expect(String(fetchSpy.mock.calls[0][0])).toContain('/vault/a%20folder/note%3F.md');
  });

  it('rejects traversal attempts without issuing a request', async () => {
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(textResponse('should not see this'));
    for (const bad of ['../etc/passwd', '/etc/passwd', '..\\windows\\system32', 'notes/../secret.md']) {
      const note = await hydrateNote({ apiKey: 'k' }, bad);
      expect(note).toBeNull();
    }
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns null on 404 without throwing', async () => {
    fetchSpy = routedFetch({
      '/vault/missing.md': textResponse('Not Found', 404),
    });
    const note = await hydrateNote({ apiKey: 'k' }, 'missing.md');
    expect(note).toBeNull();
  });

  it('truncates the source at OBSIDIAN_MAX_MATCH_BYTES before parsing', async () => {
    // 256 KiB + 1 char — the tail should never reach `body`.
    const padding = 'x'.repeat(262_145);
    fetchSpy = routedFetch({
      '/vault/huge.md': textResponse(`---\ntitle: Huge\n---\n${padding}TAIL`),
    });
    const note = await hydrateNote({ apiKey: 'k' }, 'huge.md');
    expect(note).not.toBeNull();
    expect(note!.body).not.toContain('TAIL');
    expect(note!.body.length).toBeLessThanOrEqual(262_144);
  });

  it('dedupes by relPath — same note twice = one fetch', async () => {
    fetchSpy = routedFetch({
      '/vault/one.md': textResponse('---\ntitle: One\n---\nbody'),
      '/vault/two.md': textResponse('---\ntitle: Two\n---\nbody'),
    });
    const notes = await hydrateNotes({ apiKey: 'k' }, [
      { relPath: 'one.md', basename: 'one' },
      { relPath: 'two.md', basename: 'two' },
      { relPath: 'one.md', basename: 'one' }, // duplicate
      { relPath: 'one.md', basename: 'one' }, // another duplicate
    ]);
    expect(notes.map(n => n.relPath)).toEqual(['one.md', 'two.md']);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('one bad path does not kill the batch', async () => {
    fetchSpy = routedFetch({
      '/vault/good-1.md': textResponse('---\ntitle: Good 1\n---\nbody'),
      '/vault/good-2.md': textResponse('---\ntitle: Good 2\n---\nbody'),
    });
    const notes = await hydrateNotes({ apiKey: 'k' }, [
      { relPath: 'good-1.md', basename: 'good-1' },
      { relPath: '../escape.md', basename: 'escape' },    // rejected by guard
      { relPath: 'good-2.md', basename: 'good-2' },
    ]);
    expect(notes.map(n => n.frontmatter.title)).toEqual(['Good 1', 'Good 2']);
  });

  it('one 404 does not kill the batch', async () => {
    fetchSpy = routedFetch({
      '/vault/exists.md': textResponse('---\ntitle: Here\n---\nbody'),
      '/vault/gone.md': textResponse('Not Found', 404),
    });
    const notes = await hydrateNotes({ apiKey: 'k' }, [
      { relPath: 'exists.md', basename: 'exists' },
      { relPath: 'gone.md', basename: 'gone' },
    ]);
    expect(notes.map(n => n.relPath)).toEqual(['exists.md']);
  });
});

describe('Tier 27: :obsidian:rest: — resolveRest end-to-end', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  afterEach(() => { fetchSpy?.mockRestore(); });

  const textResponse = (body: string, status = 200): Response => ({
    ok: status >= 200 && status < 300,
    status,
    text: async () => body,
    json: async () => JSON.parse(body),
    headers: new Headers(),
  } as unknown as Response);

  /** One mock that serves both search results and per-note vault GETs. */
  const wireMockPipeline = (searchHits: unknown[], vaultBodies: Record<string, string>) =>
    vi.spyOn(globalThis, 'fetch').mockImplementation(((url: string | URL) => {
      const u = String(url);
      if (u.includes('/search/simple/')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify(searchHits),
          json: async () => searchHits,
          headers: new Headers(),
        } as unknown as Response);
      }
      for (const key of Object.keys(vaultBodies)) {
        if (u.includes(`/vault/${encodeURI(key)}`)) {
          return Promise.resolve(textResponse(vaultBodies[key]));
        }
      }
      return Promise.reject(new Error(`unexpected URL: ${u}`));
    }) as typeof fetch);

  const mockRestConfig = (overrides: Record<string, unknown> = {}): AlapConfig => ({
    settings: { listType: 'ul' },
    protocols: {
      obsidian: {
        vault: 'TestVault',
        rest: { apiKey: 'inline-key' },
        ...overrides,
      },
    },
    allLinks: {},
  });

  it('returns fully-populated AlapLinks for matching notes', async () => {
    fetchSpy = wireMockPipeline(
      [{ filename: 'coffee-shops.md' }],
      {
        'coffee-shops.md': '---\ntitle: Coffee Shops\ntags: [coffee, nyc]\ndescription: Favourite spots.\n---\nbody mentioning coffee',
      },
    );
    const links = await obsidianHandler([OBSIDIAN_MODE_REST, 'coffee'], mockRestConfig());
    expect(links).toHaveLength(1);
    const link = links[0];
    expect(link.label).toBe('Coffee Shops');
    expect(link.url).toBe('obsidian://open?vault=TestVault&file=coffee-shops.md');
    expect(link.tags).toEqual(['coffee', 'nyc']);
    expect(link.description).toBe('Favourite spots.');
    expect(link.cssClass).toBe(OBSIDIAN_LINK_CSS_CLASS);
    expect((link.meta as Record<string, unknown>).source).toBe('obsidian');
    expect((link.meta as Record<string, unknown>).path).toBe('coffee-shops.md');
  });

  it('falls back to basename when frontmatter lacks a title', async () => {
    fetchSpy = wireMockPipeline(
      [{ filename: 'plain-note.md' }],
      { 'plain-note.md': 'no frontmatter, just a body containing coffee' },
    );
    const links = await obsidianHandler([OBSIDIAN_MODE_REST, 'coffee'], mockRestConfig());
    expect(links[0].label).toBe('plain-note');
    expect(links[0].tags).toBeUndefined();
  });

  it('fields=title excludes a note that only matches in body', async () => {
    fetchSpy = wireMockPipeline(
      [
        { filename: 'titled.md' },
        { filename: 'body-only.md' },
      ],
      {
        'titled.md':    '---\ntitle: Coffee Guide\n---\nsome unrelated body',
        'body-only.md': '---\ntitle: Random\n---\nbody mentioning coffee',
      },
    );
    const links = await obsidianHandler(
      [OBSIDIAN_MODE_REST, 'coffee', 'fields=title'],
      mockRestConfig(),
    );
    expect(links.map(l => l.label)).toEqual(['Coffee Guide']);
  });

  it('fields=tags narrows to tag-only matches', async () => {
    fetchSpy = wireMockPipeline(
      [
        { filename: 'tagged.md' },
        { filename: 'untagged.md' },
      ],
      {
        'tagged.md':   '---\ntitle: Tagged\ntags: [coffee]\n---\n',
        'untagged.md': '---\ntitle: Mentions coffee in title but not tags\n---\n',
      },
    );
    const links = await obsidianHandler(
      [OBSIDIAN_MODE_REST, 'coffee', 'fields=tags'],
      mockRestConfig(),
    );
    expect(links.map(l => l.label)).toEqual(['Tagged']);
  });

  it('caps emitted links at MAX_GENERATED_LINKS', async () => {
    const hits = Array.from({ length: MAX_GENERATED_LINKS + 5 }, (_, i) => ({ filename: `n${i}.md` }));
    const bodies: Record<string, string> = {};
    for (const h of hits) bodies[h.filename] = `---\ntitle: ${h.filename}\n---\ncoffee`;
    fetchSpy = wireMockPipeline(hits, bodies);
    const links = await obsidianHandler([OBSIDIAN_MODE_REST, 'coffee'], mockRestConfig());
    expect(links.length).toBe(MAX_GENERATED_LINKS);
  });

  it('returns [] when no search hits match', async () => {
    fetchSpy = wireMockPipeline([], {});
    const links = await obsidianHandler([OBSIDIAN_MODE_REST, 'anything'], mockRestConfig());
    expect(links).toEqual([]);
  });
});

describe('Tier 27: :obsidian:rest: — auth-rejection observability', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;
  afterEach(() => {
    fetchSpy?.mockRestore();
    warnSpy?.mockRestore();
  });

  const statusResponse = (status: number, body: unknown = { error: 'rejected' }): Response => ({
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
    json: async () => body,
    headers: new Headers(),
  } as unknown as Response);

  const warnMessages = (): string[] =>
    (warnSpy?.mock.calls ?? []).map((call: unknown[]) => String(call[0]));

  it('emits auth-rejected warn for 401 on /search/', async () => {
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(statusResponse(401));
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const results = await restSearch({ apiKey: 'k' }, 'x');
    expect(results).toEqual([]);
    expect(warnMessages().some(m => m.includes('auth rejected') && m.includes('401'))).toBe(true);
    expect(warnMessages().some(m => m.includes('check apiKey'))).toBe(true);
  });

  it('emits auth-rejected warn for 403 on /search/', async () => {
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(statusResponse(403));
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const results = await restSearch({ apiKey: 'k' }, 'x');
    expect(results).toEqual([]);
    expect(warnMessages().some(m => m.includes('auth rejected') && m.includes('403'))).toBe(true);
  });

  it('emits generic warn for non-auth 5xx on /search/', async () => {
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(statusResponse(502, { error: 'bad gateway' }));
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const results = await restSearch({ apiKey: 'k' }, 'x');
    expect(results).toEqual([]);
    // Generic branch — must not claim auth rejection when the cause is something else.
    expect(warnMessages().some(m => m.includes('auth rejected'))).toBe(false);
    expect(warnMessages().some(m => m.includes('HTTP 502'))).toBe(true);
  });

  it('emits auth-rejected warn for 401 on /vault/', async () => {
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(statusResponse(401));
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const note = await hydrateNote({ apiKey: 'k' }, 'notes/x.md');
    expect(note).toBeNull();
    const msgs = warnMessages();
    expect(msgs.some(m => m.includes('auth rejected') && m.includes('/vault/'))).toBe(true);
  });

  it('emits auth-rejected warn for 403 on /vault/', async () => {
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(statusResponse(403));
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const note = await hydrateNote({ apiKey: 'k' }, 'notes/x.md');
    expect(note).toBeNull();
    expect(warnMessages().some(m => m.includes('auth rejected') && m.includes('403'))).toBe(true);
  });

  it('does not leak the apiKey into auth-rejection warns', async () => {
    const secret = 'sk_live_supersecret_xyz';
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(statusResponse(401));
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await hydrateNote({ apiKey: secret }, `path-with-key-${secret}.md`);
    for (const m of warnMessages()) {
      expect(m).not.toContain(secret);
    }
  });
});
