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
import type { AlapConfig, AlapLink, GenerateHandler } from '../../src/core/types';

/**
 * Plumbing tests for the progressive-resolution machinery introduced in 3.2:
 *   - concurrency cap + FIFO queue
 *   - per-fetch timeout via AbortController
 *   - in-flight cancellation via abortInFlight()
 *
 * These sit below the renderer (no DOM, no placeholders) and exercise the
 * engine directly. Higher-level progressive behavior is covered in
 * tests/ui/progressive/.
 */

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (v: T) => void;
  reject: (e: Error) => void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (v: T) => void;
  let reject!: (e: Error) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/**
 * Build a handler that parks every invocation on an independent deferred and
 * tracks how many are in flight. Unlike the test-UI helper, this keeps one
 * deferred per (call-order index) so we can settle them selectively.
 */
function makePerCallHandler() {
  const deferreds: Deferred<AlapLink[]>[] = [];
  const startedAt: string[] = []; // token/arg[0] order, in start order

  const handler: GenerateHandler = async (segments) => {
    startedAt.push(segments[0]);
    const d = deferred<AlapLink[]>();
    deferreds.push(d);
    return d.promise;
  };

  return {
    handler,
    resolveByIndex: (i: number, links: AlapLink[]) => deferreds[i].resolve(links),
    startedAt: () => [...startedAt],
    activeCount: () => deferreds.length - deferreds.filter((d) => Object.isFrozen(d)).length,
  };
}

function buildConfig(extraSettings: Record<string, unknown> = {}): AlapConfig {
  return {
    settings: extraSettings,
    protocols: { mock: {} },
    allLinks: {},
  };
}

describe('AlapEngine — concurrency cap', () => {
  it('invokes handlers only up to maxConcurrentFetches and queues the rest in order', async () => {
    const h = makePerCallHandler();
    const engine = new AlapEngine(buildConfig({ maxConcurrentFetches: 2 }), { handlers: { mock: h.handler } });

    // Fire five progressive resolutions with distinct tokens.
    engine.resolveProgressive(':mock:a:');
    engine.resolveProgressive(':mock:b:');
    engine.resolveProgressive(':mock:c:');
    engine.resolveProgressive(':mock:d:');
    engine.resolveProgressive(':mock:e:');

    // Under cap=2, only two handlers have been called so far.
    expect(h.startedAt()).toEqual(['a', 'b']);

    // Settle the first fetch — the queue should advance by one.
    h.resolveByIndex(0, [{ label: 'A', url: 'https://example.com/a' }]);
    await new Promise<void>((r) => setTimeout(r, 0));
    expect(h.startedAt()).toEqual(['a', 'b', 'c']);

    // Settle another two — d and e start in turn.
    h.resolveByIndex(1, [{ label: 'B', url: 'https://example.com/b' }]);
    h.resolveByIndex(2, [{ label: 'C', url: 'https://example.com/c' }]);
    await new Promise<void>((r) => setTimeout(r, 0));
    expect(h.startedAt()).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('defaults to a sensible concurrent cap when settings.maxConcurrentFetches is omitted', () => {
    const h = makePerCallHandler();
    const engine = new AlapEngine(buildConfig(), { handlers: { mock: h.handler } });

    // Ten tokens at once — all should be allowed under the default cap of 6.
    // We only assert the cap > 1 (the actual value is an implementation default),
    // but the queue correctness from the previous test covers the behavior.
    for (let i = 0; i < 10; i++) {
      engine.resolveProgressive(`:mock:t${i}:`);
    }

    expect(h.startedAt().length).toBeGreaterThan(1);
    expect(h.startedAt().length).toBeLessThanOrEqual(10);
  });
});

describe('AlapEngine — fetch timeout', () => {
  it('surfaces an error state when a handler exceeds settings.fetchTimeout', async () => {
    // Handler that never settles — simulates a hung network request.
    const handler: GenerateHandler = () => new Promise<AlapLink[]>(() => { /* never resolves */ });
    const engine = new AlapEngine(buildConfig({ fetchTimeout: 30 }), { handlers: { mock: handler } });

    engine.resolveProgressive(':mock:hang:');

    // Wait past the timeout.
    await new Promise<void>((r) => setTimeout(r, 60));

    const state = engine.resolveProgressive(':mock:hang:');
    const errored = state.sources.find((s) => s.token === 'mock:hang' && s.status === 'error');
    expect(errored).toBeDefined();
    expect(errored!.error?.message).toMatch(/timeout/i);
  });

  it('honors the AbortSignal passed to handlers that opt in', async () => {
    let receivedSignal: AbortSignal | undefined;
    const handler: GenerateHandler = async (_segments, _config, options) => {
      receivedSignal = options?.signal;
      return new Promise<AlapLink[]>((_resolve, reject) => {
        if (receivedSignal) {
          receivedSignal.addEventListener('abort', () => reject(new Error('aborted by handler')));
        }
      });
    };

    const engine = new AlapEngine(buildConfig({ fetchTimeout: 30 }), { handlers: { mock: handler } });
    engine.resolveProgressive(':mock:abortable:');

    await new Promise<void>((r) => setTimeout(r, 60));

    expect(receivedSignal).toBeInstanceOf(AbortSignal);
    expect(receivedSignal!.aborted).toBe(true);
  });
});

describe('AlapEngine — abortInFlight()', () => {
  it('aborts a specific token without affecting others', async () => {
    const h = makePerCallHandler();
    const engine = new AlapEngine(buildConfig({ fetchTimeout: 10_000 }), { handlers: { mock: h.handler } });

    engine.resolveProgressive(':mock:keep:');
    engine.resolveProgressive(':mock:abort:');
    expect(h.startedAt()).toEqual(['keep', 'abort']);

    // Cancel just the second one.
    engine.abortInFlight('mock:abort');
    await new Promise<void>((r) => setTimeout(r, 0));

    // 'abort' should now be errored; 'keep' is still loading.
    const state = engine.resolveProgressive(':mock:keep: | :mock:abort:');
    const abortSource = state.sources.find((s) => s.token === 'mock:abort');
    const keepSource = state.sources.find((s) => s.token === 'mock:keep');
    expect(abortSource?.status).toBe('error');
    expect(keepSource?.status).toBe('loading');
  });
});
