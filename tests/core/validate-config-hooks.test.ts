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
import { validateConfig } from '../../src/core/validateConfig';

/**
 * Phase 7 Step 7b — Surface 2-3 closure. `settings.hooks` serves as an
 * allowlist for hook keys arriving on non-author-tier links. Author-tier
 * keeps hooks verbatim; non-author intersects against the allowlist;
 * non-author with no allowlist strips everything (fail-closed).
 */

describe('validateConfig — hooks allowlist', () => {
  describe('author tier (default)', () => {
    it('keeps all hooks verbatim', () => {
      const cfg = validateConfig({
        settings: { hooks: ['item-hover'] },
        allLinks: {
          a: { url: '/a', hooks: ['item-hover', 'my-custom-hook', 'another'] },
        },
      });
      expect(cfg.allLinks.a.hooks).toEqual(['item-hover', 'my-custom-hook', 'another']);
    });

    it('keeps hooks even with no allowlist declared', () => {
      const cfg = validateConfig({
        allLinks: {
          a: { url: '/a', hooks: ['anything', 'goes'] },
        },
      });
      expect(cfg.allLinks.a.hooks).toEqual(['anything', 'goes']);
    });
  });

  describe('non-author tier + declared allowlist', () => {
    it('keeps hooks that appear in settings.hooks', () => {
      const cfg = validateConfig(
        {
          settings: { hooks: ['item-hover', 'item-context'] },
          allLinks: {
            a: { url: '/a', hooks: ['item-hover'] },
          },
        },
        { provenance: 'storage:remote' },
      );
      expect(cfg.allLinks.a.hooks).toEqual(['item-hover']);
    });

    it('strips hooks outside the allowlist', () => {
      const cfg = validateConfig(
        {
          settings: { hooks: ['item-hover'] },
          allLinks: {
            a: { url: '/a', hooks: ['item-hover', 'attacker-chosen', 'another'] },
          },
        },
        { provenance: 'protocol:web' },
      );
      expect(cfg.allLinks.a.hooks).toEqual(['item-hover']);
    });

    it('drops the hooks array entirely when nothing matches', () => {
      const cfg = validateConfig(
        {
          settings: { hooks: ['item-hover'] },
          allLinks: {
            a: { url: '/a', hooks: ['evil', 'worse'] },
          },
        },
        { provenance: 'protocol:web' },
      );
      expect(cfg.allLinks.a.hooks).toBeUndefined();
    });
  });

  describe('non-author tier + no allowlist (fail-closed)', () => {
    it('strips all hooks from storage-tier links when settings.hooks is absent', () => {
      const cfg = validateConfig(
        {
          allLinks: {
            a: { url: '/a', hooks: ['item-hover', 'anything'] },
          },
        },
        { provenance: 'storage:local' },
      );
      expect(cfg.allLinks.a.hooks).toBeUndefined();
    });

    it('strips all hooks from protocol-tier links when settings.hooks is absent', () => {
      const cfg = validateConfig(
        {
          allLinks: {
            a: { url: '/a', hooks: ['item-hover'] },
          },
        },
        { provenance: 'protocol:web' },
      );
      expect(cfg.allLinks.a.hooks).toBeUndefined();
    });
  });

  describe('no hooks field on link', () => {
    it('leaves link.hooks undefined when the raw link had no hooks', () => {
      const cfg = validateConfig({
        settings: { hooks: ['item-hover'] },
        allLinks: {
          a: { url: '/a' },
        },
      });
      expect(cfg.allLinks.a.hooks).toBeUndefined();
    });
  });

  describe('non-string entries', () => {
    it('strips non-strings before the allowlist check', () => {
      const cfg = validateConfig(
        {
          settings: { hooks: ['item-hover'] },
          allLinks: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            a: { url: '/a', hooks: ['item-hover', 42 as any, null as any, 'item-hover'] },
          },
        },
        { provenance: 'storage:remote' },
      );
      expect(cfg.allLinks.a.hooks).toEqual(['item-hover', 'item-hover']);
    });
  });
});
