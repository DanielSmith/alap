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

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AlapUI } from '../../../src/ui/dom/AlapUI';
import type { AlapConfig } from '../../../src/core/types';
import {
  clickTrigger,
  createTrigger,
  flushMicrotasks,
  getMenuItems,
  makeDeferredHandler,
} from './helpers';

/**
 * In-flight request coalescing + result-cache reuse.
 *
 * Covers contracts:
 *    9 — Two anchors with the same protocol token clicked during fetch → one generate() call
 *   10 — When the shared fetch lands, the currently-open anchor sees the result;
 *        a later reopen of the other anchor also gets the cached result with no new fetch
 *   10b — Two anchors share the token but have different refiners → one fetch, each menu
 *        renders with its own refiners applied
 *   11 — Within result-cache TTL, subsequent clicks hit the cache (zero generate calls)
 */

describe('Progressive async — in-flight dedup + cache reuse (AlapUI)', () => {
  let ui: AlapUI;

  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    ui?.destroy();
  });

  // --- Contract 9: two anchors, same token, one fetch ---

  it('calls generate() exactly once when two anchors share a protocol token and are clicked during fetch', () => {
    const mock = makeDeferredHandler();
    const a1 = createTrigger('a1', ':mock:foo:');
    const a2 = createTrigger('a2', ':mock:foo:');
    ui = new AlapUI({
      settings: { listType: 'ul' },
      allLinks: {},
    }, { handlers: { mock: mock.handler } });

    clickTrigger(a1);
    clickTrigger(a2);

    expect(mock.callCount()).toBe(1);
  });

  // --- Contract 10: second anchor receives the shared fetch result ---

  it('delivers the shared fetch result to whichever anchor is currently open when it lands', async () => {
    const mock = makeDeferredHandler();
    const a1 = createTrigger('a1', ':mock:foo:');
    const a2 = createTrigger('a2', ':mock:foo:');
    ui = new AlapUI({
      settings: { listType: 'ul' },
      allLinks: {},
    }, { handlers: { mock: mock.handler } });

    clickTrigger(a1);
    clickTrigger(a2); // a2 is now the open menu, still waiting on the shared fetch

    mock.settle([
      { label: 'Shared One', url: 'https://example.com/s1' },
      { label: 'Shared Two', url: 'https://example.com/s2' },
    ]);
    await flushMicrotasks();

    const labels = getMenuItems().map((el) => el.textContent?.trim());
    expect(labels).toEqual(['Shared One', 'Shared Two']);
    expect(mock.callCount()).toBe(1);
  });

  it('reopens a previously-clicked anchor without a new fetch once the shared result is cached', async () => {
    const mock = makeDeferredHandler();
    const a1 = createTrigger('a1', ':mock:foo:');
    const a2 = createTrigger('a2', ':mock:foo:');
    ui = new AlapUI({
      settings: { listType: 'ul' },
      allLinks: {},
    }, { handlers: { mock: mock.handler } });

    clickTrigger(a1);
    clickTrigger(a2);
    mock.settle([{ label: 'Shared One', url: 'https://example.com/s1' }]);
    await flushMicrotasks();

    // Reopen a1 — should use the cached result, no new fetch.
    ui.close();
    clickTrigger(a1);

    expect(mock.callCount()).toBe(1);
    expect(getMenuItems().map((el) => el.textContent?.trim())).toEqual(['Shared One']);
  });

  // --- Contract 10b: different refiners on shared token ---

  it('applies each anchor\u2019s own refiners to the shared result with only one fetch', async () => {
    const mock = makeDeferredHandler();
    const a1 = createTrigger('a1', ':mock:foo: *sort:label*');
    const a2 = createTrigger('a2', ':mock:foo: *limit:2*');
    ui = new AlapUI({
      settings: { listType: 'ul' },
      allLinks: {},
    }, { handlers: { mock: mock.handler } });

    clickTrigger(a1);
    clickTrigger(a2); // a2 is open, waiting on the shared fetch

    // Return 4 items in a deliberately unsorted order.
    mock.settle([
      { label: 'Charlie', url: 'https://example.com/c' },
      { label: 'Alpha',   url: 'https://example.com/a' },
      { label: 'Delta',   url: 'https://example.com/d' },
      { label: 'Bravo',   url: 'https://example.com/b' },
    ]);
    await flushMicrotasks();

    // a2 has `*limit:2*` — two items, preserving source order.
    const a2Labels = getMenuItems().map((el) => el.textContent?.trim());
    expect(a2Labels).toHaveLength(2);
    expect(a2Labels).toEqual(['Charlie', 'Alpha']);
    expect(mock.callCount()).toBe(1);

    // Reopen a1 — should apply `*sort:label*` to the same cached set.
    ui.close();
    clickTrigger(a1);

    const a1Labels = getMenuItems().map((el) => el.textContent?.trim());
    expect(a1Labels).toEqual(['Alpha', 'Bravo', 'Charlie', 'Delta']);
    expect(mock.callCount()).toBe(1);
  });

  // --- Contract 11: result cache TTL → zero new fetches on warm click ---

  it('skips the generate call on a subsequent click within the protocol\u2019s cache TTL', async () => {
    const mock = makeDeferredHandler();
    const trigger = createTrigger('t', ':mock:foo:');
    const config: AlapConfig = {
      settings: { listType: 'ul' },
      // Long TTL so the cache entry is definitely still valid on the second click.
      protocols: { mock: { cache: 60 } },
      allLinks: {},
    };
    ui = new AlapUI(config, { handlers: { mock: mock.handler } });

    clickTrigger(trigger);
    mock.settle([{ label: 'Only', url: 'https://example.com/o' }]);
    await flushMicrotasks();

    ui.close();
    clickTrigger(trigger);

    expect(mock.callCount()).toBe(1);
    expect(getMenuItems().map((el) => el.textContent?.trim())).toEqual(['Only']);
  });
});
