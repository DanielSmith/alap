/**
 * Copyright 2026 Daniel Smith
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { findAliasedNeedle, resolveTagAliases } from '../../src/protocols/obsidian/tagAliases';

/**
 * Tier 27c: `tagAliases` config normalizer.
 *
 * Unit coverage for the key/value validators, the forward/reverse maps,
 * and the first-wins tie-break when two aliases share a value.
 */

let warnSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  warnSpy.mockRestore();
});

describe('resolveTagAliases — empty / absent', () => {
  it('returns empty maps for undefined', () => {
    const r = resolveTagAliases(undefined);
    expect(r.keyToTag.size).toBe(0);
    expect(r.tagToKey.size).toBe(0);
  });

  it('returns empty maps for null', () => {
    const r = resolveTagAliases(null);
    expect(r.keyToTag.size).toBe(0);
    expect(r.tagToKey.size).toBe(0);
  });

  it('returns empty maps for an empty object', () => {
    const r = resolveTagAliases({});
    expect(r.keyToTag.size).toBe(0);
    expect(r.tagToKey.size).toBe(0);
  });
});

describe('resolveTagAliases — valid entries', () => {
  it('builds a forward map from key → raw Obsidian tag', () => {
    const r = resolveTagAliases({
      thisDashTag: 'this-tag',
      work_project: 'work/project',
      techno: 'techno',
    });
    expect(r.keyToTag.get('thisDashTag')).toBe('this-tag');
    expect(r.keyToTag.get('work_project')).toBe('work/project');
    expect(r.keyToTag.get('techno')).toBe('techno');
  });

  it('builds a reverse map from raw tag → key', () => {
    const r = resolveTagAliases({
      thisDashTag: 'this-tag',
      work_project: 'work/project',
    });
    expect(r.tagToKey.get('this-tag')).toBe('thisDashTag');
    expect(r.tagToKey.get('work/project')).toBe('work_project');
  });

  it('strips a leading # from values', () => {
    const r = resolveTagAliases({ techno: '#techno' });
    expect(r.keyToTag.get('techno')).toBe('techno');
    expect(r.tagToKey.get('techno')).toBe('techno');
  });

  it('trims surrounding whitespace from values', () => {
    const r = resolveTagAliases({ foo: '  bar  ' });
    expect(r.keyToTag.get('foo')).toBe('bar');
  });

  it('accepts underscores, digits (after the first char), hyphens, and slashes in values', () => {
    const r = resolveTagAliases({
      a: 'alpha_1',
      b: 'beta-two',
      c: 'gamma/three/four',
      d: '_underscore_first',
    });
    expect(r.keyToTag.size).toBe(4);
  });
});

describe('resolveTagAliases — tie-break', () => {
  it('first-declared wins in the reverse map when two keys share a value', () => {
    const r = resolveTagAliases({
      primary: 'shared-tag',
      secondary: 'shared-tag',
    });
    // Both forward entries survive — each key still matches the tag.
    expect(r.keyToTag.get('primary')).toBe('shared-tag');
    expect(r.keyToTag.get('secondary')).toBe('shared-tag');
    // Reverse-lookup picks the first declared.
    expect(r.tagToKey.get('shared-tag')).toBe('primary');
  });

  it('two aliases for genuinely-distinct-but-similar tags disambiguate cleanly', () => {
    // The wild-obsidian-vault scenario: both #this-tag and #this_tag exist.
    const r = resolveTagAliases({
      thisDashTag: 'this-tag',
      this_tag:    'this_tag',
    });
    expect(r.keyToTag.get('thisDashTag')).toBe('this-tag');
    expect(r.keyToTag.get('this_tag')).toBe('this_tag');
    expect(r.tagToKey.get('this-tag')).toBe('thisDashTag');
    expect(r.tagToKey.get('this_tag')).toBe('this_tag');
  });
});

describe('resolveTagAliases — invalid entries', () => {
  it('skips a key that starts with a digit', () => {
    const r = resolveTagAliases({ '1tag': 'one-tag', valid: 'valid' });
    expect(r.keyToTag.has('1tag')).toBe(false);
    expect(r.keyToTag.has('valid')).toBe(true);
    expect(warnSpy).toHaveBeenCalled();
  });

  it('skips a key containing a hyphen', () => {
    const r = resolveTagAliases({ 'bad-key': 'x', good_key: 'x' });
    expect(r.keyToTag.has('bad-key')).toBe(false);
    expect(r.keyToTag.has('good_key')).toBe(true);
  });

  it('skips a key containing whitespace', () => {
    const r = resolveTagAliases({ 'with space': 'x' });
    expect(r.keyToTag.size).toBe(0);
  });

  it('skips an empty key', () => {
    const r = resolveTagAliases({ '': 'x' });
    expect(r.keyToTag.size).toBe(0);
  });

  it('skips a non-string value', () => {
    const r = resolveTagAliases({ foo: 123 as unknown as string, bar: 'bar' });
    expect(r.keyToTag.has('foo')).toBe(false);
    expect(r.keyToTag.has('bar')).toBe(true);
  });

  it('skips a value whose normalised form is empty', () => {
    const r = resolveTagAliases({ foo: '#', bar: '   ' });
    expect(r.keyToTag.size).toBe(0);
  });

  it('skips a value that starts with a digit', () => {
    const r = resolveTagAliases({ foo: '123bad', good: 'g' });
    expect(r.keyToTag.has('foo')).toBe(false);
    expect(r.keyToTag.has('good')).toBe(true);
  });

  it('skips a value containing whitespace inside', () => {
    const r = resolveTagAliases({ foo: 'bad tag' });
    expect(r.keyToTag.size).toBe(0);
  });

  it('warns and returns empty for a non-object top-level value', () => {
    const r = resolveTagAliases('not an object' as unknown);
    expect(r.keyToTag.size).toBe(0);
    expect(warnSpy).toHaveBeenCalled();
  });

  it('warns and returns empty for an array top-level value', () => {
    const r = resolveTagAliases(['a', 'b'] as unknown);
    expect(r.keyToTag.size).toBe(0);
    expect(warnSpy).toHaveBeenCalled();
  });

  it('keeps good entries when bad ones are interleaved', () => {
    const r = resolveTagAliases({
      ok_one: 'one',
      'bad-key': 'x',
      ok_two: 'two-2',
      badValue: '   ',
      ok_three: '#three',
    });
    expect(r.keyToTag.size).toBe(3);
    expect(r.keyToTag.get('ok_one')).toBe('one');
    expect(r.keyToTag.get('ok_two')).toBe('two-2');
    expect(r.keyToTag.get('ok_three')).toBe('three');
  });
});

describe('findAliasedNeedle — forward needle expansion', () => {
  const { keyToTag } = resolveTagAliases({
    thisDashTag: 'this-tag',
    work_project: 'work/project',
    techno: 'techno',
  });

  it('returns the raw tag (lowercased) for an exact key match', () => {
    expect(findAliasedNeedle('work_project', keyToTag)).toBe('work/project');
    expect(findAliasedNeedle('thisdashtag', keyToTag)).toBe('this-tag');
  });

  it('matches keys case-insensitively (caller already lowercased)', () => {
    // `thisDashTag` declared with camelCase; handler lowercases queries.
    expect(findAliasedNeedle('thisdashtag', keyToTag)).toBe('this-tag');
  });

  it('returns undefined for a non-matching needle', () => {
    expect(findAliasedNeedle('unrelated', keyToTag)).toBeUndefined();
  });

  it('returns undefined for a partial key match (substring of a key)', () => {
    // `work_proj` is a prefix of `work_project` — must NOT alias-expand.
    expect(findAliasedNeedle('work_proj', keyToTag)).toBeUndefined();
    expect(findAliasedNeedle('work', keyToTag)).toBeUndefined();
  });

  it('returns undefined for an empty needle', () => {
    expect(findAliasedNeedle('', keyToTag)).toBeUndefined();
  });

  it('returns undefined when the alias map is empty', () => {
    expect(findAliasedNeedle('anything', new Map())).toBeUndefined();
  });
});
