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
import type { AlapLink, GenerateHandler } from '../../src/core/types';

/**
 * Phase 7 Step 7d — Surface 6-1. abortInFlight is refcounted so one
 * renderer cancelling a fetch doesn't pull the rug out from under
 * another renderer waiting on the same token via a shared engine.
 *
 * A "subscriber" is any attachment to an in-flight fetch — a cold
 * start, an in-flight coalesce, or a progressive attach. Each attach
 * bumps the count; each abortInFlight decrements. Only the last drop
 * actually aborts the handler.
 */

function gatedHandler(): {
  handler: GenerateHandler;
  settle: (links: AlapLink[]) => void;
  reject: (err: Error) => void;
  wasAborted: () => boolean;
  callCount: () => number;
} {
  let resolver: ((links: AlapLink[]) => void) | null = null;
  let rejecter: ((err: Error) => void) | null = null;
  let aborted = false;
  let calls = 0;

  const handler: GenerateHandler = (_args, _cfg, options) => {
    calls++;
    return new Promise<AlapLink[]>((resolve, reject) => {
      resolver = resolve;
      rejecter = reject;
      options?.signal?.addEventListener('abort', () => {
        aborted = true;
        reject(new DOMException('Aborted', 'AbortError'));
      });
    });
  };

  return {
    handler,
    settle: (links) => resolver?.(links),
    reject: (err) => rejecter?.(err),
    wasAborted: () => aborted,
    callCount: () => calls,
  };
}

describe('abortInFlight refcount (Surface 6-1)', () => {
  it('single subscriber → abort triggers handler abort', async () => {
    const g = gatedHandler();
    const engine = new AlapEngine(
      validateConfig({ allLinks: {} }),
      { handlers: { gen: g.handler } },
    );

    const p = engine.resolveAsync(':gen:');
    // Give the handler a turn to register its abort listener.
    await Promise.resolve();
    engine.abortInFlight('gen');
    g.settle([]); // resolver is a no-op after reject

    await p.catch(() => undefined);
    expect(g.wasAborted()).toBe(true);
  });

  it('two subscribers — one aborts — handler still runs to completion', async () => {
    const g = gatedHandler();
    const engine = new AlapEngine(
      validateConfig({ allLinks: {} }),
      { handlers: { gen: g.handler } },
    );

    // Two callers attach to the same token via resolveProgressive-equivalent
    // paths. resolveAsync delegates to preResolve, which goes through
    // ensureTokenResolution — the second call hits the "in flight — coalesce"
    // branch and bumps the refcount.
    const p1 = engine.resolveAsync(':gen:');
    const p2 = engine.resolveAsync(':gen:');
    await Promise.resolve();
    expect(g.callCount()).toBe(1); // dedup worked

    // First caller aborts. Refcount goes 2 → 1; handler not aborted.
    engine.abortInFlight('gen');
    expect(g.wasAborted()).toBe(false);

    // Settle — both promises should resolve with data.
    g.settle([{ url: 'https://example.com/a', label: 'A' }]);
    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1).toHaveLength(1);
    expect(r2).toHaveLength(1);
    expect(g.wasAborted()).toBe(false);
  });

  it('two subscribers — both abort — handler gets aborted', async () => {
    const g = gatedHandler();
    const engine = new AlapEngine(
      validateConfig({ allLinks: {} }),
      { handlers: { gen: g.handler } },
    );

    const p1 = engine.resolveAsync(':gen:');
    const p2 = engine.resolveAsync(':gen:');
    await Promise.resolve();

    engine.abortInFlight('gen'); // 2 → 1 — not yet
    expect(g.wasAborted()).toBe(false);
    engine.abortInFlight('gen'); // 1 → 0 — abort
    expect(g.wasAborted()).toBe(true);

    await Promise.allSettled([p1, p2]);
  });

  it('abortInFlight on an unknown token is a no-op', () => {
    const g = gatedHandler();
    const engine = new AlapEngine(
      validateConfig({ allLinks: {} }),
      { handlers: { gen: g.handler } },
    );
    // No call to :gen: yet; refcount map has no entry.
    expect(() => engine.abortInFlight('gen')).not.toThrow();
    expect(() => engine.abortInFlight('nonexistent')).not.toThrow();
    expect(g.wasAborted()).toBe(false);
  });

  it('subscriber count clears on settlement — late aborts are no-ops', async () => {
    const g = gatedHandler();
    const engine = new AlapEngine(
      validateConfig({ allLinks: {} }),
      { handlers: { gen: g.handler } },
    );

    const p = engine.resolveAsync(':gen:');
    await Promise.resolve();
    g.settle([{ url: 'https://example.com/a', label: 'A' }]);
    await p;

    // Fetch completed. Refcount cleared. Abort after-the-fact is harmless.
    expect(() => engine.abortInFlight('gen')).not.toThrow();
    expect(g.wasAborted()).toBe(false);
  });
});
