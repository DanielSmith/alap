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

import type { AlapConfig, AlapEngineOptions, AlapLink, GenerateHandler, ProtocolHandlerRegistry } from '../../../src/core/types';

/**
 * Placeholder contract: renderers emit `<li data-alap-placeholder="loading|error|empty">`
 * entries for async sources that haven't resolved yet. Tests query by that attribute so
 * the contract is decoupled from visual styling decisions.
 */
export const PLACEHOLDER_SELECTOR = '[data-alap-placeholder]';
export const LOADING_PLACEHOLDER = '[data-alap-placeholder="loading"]';
export const ERROR_PLACEHOLDER = '[data-alap-placeholder="error"]';
export const EMPTY_PLACEHOLDER = '[data-alap-placeholder="empty"]';

export interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (err: Error) => void;
}

export function deferred<T>(): Deferred<T> {
  let resolve!: (v: T) => void;
  let reject!: (e: Error) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/**
 * Build a generate handler with test-controlled settlement.
 *
 * Each invocation appends a pending promise; `settle()` / `fail()` resolve or reject
 * every pending promise at once. This lets tests assert both call count and coalescing:
 * if dedup works, calls.length === 1 even after two clicks; if it's broken, calls.length
 * is larger AND settle still completes so tests don't hang.
 */
export interface DeferredHandler {
  handler: GenerateHandler;
  settle: (links: AlapLink[]) => void;
  fail: (err: Error) => void;
  callCount: () => number;
  callArgs: () => ReadonlyArray<ReadonlyArray<string>>;
}

export function makeDeferredHandler(): DeferredHandler {
  const calls: string[][] = [];
  const pending: Deferred<AlapLink[]>[] = [];

  const handler: GenerateHandler = async (segments) => {
    calls.push([...segments]);
    const d = deferred<AlapLink[]>();
    pending.push(d);
    return d.promise;
  };

  return {
    handler,
    settle: (links) => {
      while (pending.length > 0) pending.shift()!.resolve(links);
    },
    fail: (err) => {
      while (pending.length > 0) pending.shift()!.reject(err);
    },
    callCount: () => calls.length,
    callArgs: () => calls,
  };
}

/**
 * Data-only config with one async protocol under the key `mock`.
 * Pair with `asyncHandlers(handler)` at renderer construction:
 *
 *   new AlapUI(buildAsyncConfig(), asyncHandlers(mock.handler))
 */
export function buildAsyncConfig(
  allLinks: AlapConfig['allLinks'] = {},
): AlapConfig {
  return {
    settings: { listType: 'ul' },
    protocols: { mock: {} },
    allLinks,
  };
}

/** Config with both `mock` (async) and some static links — for mixed-source tests. */
export function buildMixedConfig(
  allLinks: AlapConfig['allLinks'],
): AlapConfig {
  return {
    settings: { listType: 'ul' },
    protocols: { mock: {} },
    allLinks,
  };
}

/** Engine options wrapping a mock-protocol handler. */
export function asyncHandlers(handler: GenerateHandler): AlapEngineOptions {
  return { handlers: { mock: handler } satisfies ProtocolHandlerRegistry };
}

// ---------------------------------------------------------------------------
// DOM helpers — mirror the shape used by existing AlapUI tests, plus
// progressive-specific selectors.
// ---------------------------------------------------------------------------

export function createTrigger(
  id: string,
  expression: string,
  opts: { className?: string } = {},
): HTMLElement {
  const a = document.createElement('a');
  a.id = id;
  a.className = opts.className ?? 'alap';
  a.setAttribute('data-alap-linkitems', expression);
  a.textContent = id;
  document.body.appendChild(a);
  return a;
}

export function clickTrigger(trigger: HTMLElement): void {
  trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

export function getMenu(): HTMLElement | null {
  return document.getElementById('alapelem');
}

export function getMenuItems(): HTMLElement[] {
  const menu = getMenu();
  if (!menu) return [];
  return Array.from(menu.querySelectorAll<HTMLElement>('a[role="menuitem"]'));
}

export function getPlaceholders(): HTMLElement[] {
  const menu = getMenu();
  if (!menu) return [];
  return Array.from(menu.querySelectorAll<HTMLElement>(PLACEHOLDER_SELECTOR));
}

export function getLoadingPlaceholders(): HTMLElement[] {
  const menu = getMenu();
  if (!menu) return [];
  return Array.from(menu.querySelectorAll<HTMLElement>(LOADING_PLACEHOLDER));
}

/**
 * Flush pending microtasks so async `.then()` callbacks settle. Each resolveProgressive
 * cycle involves a chain of awaits (handler promise → startFetch resolution → renderer
 * subscription .then), so several microtask turns may be needed. A macrotask yield
 * (setTimeout 0) drains everything reliably.
 */
export async function flushMicrotasks(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}
