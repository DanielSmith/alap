/**
 * Copyright 2026 Daniel Smith
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

/**
 * Mock `GenerateHandler`s for the advanced-protocol demo suite.
 *
 * These protocols never touch the network — they simulate latency, errors,
 * and empty results with `setTimeout`. That gives every adapter a
 * deterministic way to exercise the progressive-rendering contract:
 *
 *   - "Loading…" placeholder appears immediately
 *   - resolved items land when the timer fires
 *   - errored sources render an error placeholder
 *   - empty sources render an empty placeholder
 *   - two concurrent clicks on the same token share one fetch (dedup)
 *   - dismiss before settle aborts the fetch
 *
 * Each handler respects the engine's `signal` so cancel-on-dismiss works.
 */

import type { AlapLink, GenerateHandler } from 'alap/core';

const DEFAULT_SLOW_MS = 2000;
const DEFAULT_SLOW_COUNT = 3;
const DEFAULT_FLAKY_MS = 800;
const MAX_COUNT = 12;

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    if (!signal) return;
    if (signal.aborted) {
      clearTimeout(t);
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    signal.addEventListener('abort', () => {
      clearTimeout(t);
      reject(new DOMException('Aborted', 'AbortError'));
    }, { once: true });
  });
}

function buildLinks(prefix: string, count: number, tag: string): AlapLink[] {
  const links: AlapLink[] = [];
  for (let i = 1; i <= count; i++) {
    links.push({
      label: `${prefix} item ${i}`,
      url: `https://example.com/${prefix.toLowerCase()}/${i}`,
      tags: [tag, 'mock'],
      cssClass: 'source_mock',
      meta: {
        source: 'mock',
        index: i,
      },
    });
  }
  return links;
}

/**
 * `:slow:delayMs:count:` — always succeeds, configurable latency + count.
 *
 *   `:slow:`              → 2000ms, 3 items (defaults)
 *   `:slow:500:`          → 500ms, 3 items
 *   `:slow::8:`           → 2000ms, 8 items
 *   `:slow:500:8:`        → 500ms, 8 items
 *
 * `count` is capped at 12 — runaway values would make the menu unusable.
 */
export const slowHandler: GenerateHandler = async (segments, _config, options) => {
  const delay = parseInt(segments[0] ?? '', 10) || DEFAULT_SLOW_MS;
  const count = Math.min(parseInt(segments[1] ?? '', 10) || DEFAULT_SLOW_COUNT, MAX_COUNT);
  await wait(delay, options?.signal);
  return buildLinks('Slow', count, 'slow');
};

/**
 * `:flaky:mode:delayMs:` — errors, empties, or succeeds based on mode.
 *
 *   `:flaky:error:`       → throws after 800ms (placeholder → error)
 *   `:flaky:empty:`       → resolves `[]` after 800ms (placeholder → empty)
 *   `:flaky:ok:`          → resolves 3 items after 800ms
 *   `:flaky:`             → defaults to `error`
 *   `:flaky:error:1500:`  → 1500ms before the error
 */
export const flakyHandler: GenerateHandler = async (segments, _config, options) => {
  const mode = (segments[0] ?? 'error').toLowerCase();
  const delay = parseInt(segments[1] ?? '', 10) || DEFAULT_FLAKY_MS;
  await wait(delay, options?.signal);
  if (mode === 'empty') return [];
  if (mode === 'ok') return buildLinks('Flaky', 3, 'flaky');
  throw new Error('Mock flaky protocol: intentional error for demo');
};
