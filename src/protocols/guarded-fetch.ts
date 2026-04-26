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

/**
 * Node-side drop-in for `fetch()` that closes the DNS rebinding bypass in
 * `isPrivateHost`. The syntactic check validates the URL string; this adds
 * a second check at socket-open time against the resolved IP, so an
 * attacker-controlled DNS that flips a public hostname to `127.0.0.1`
 * between check and connect cannot slip through.
 *
 * Environment-aware: in the browser, CORS + mixed-content protection close
 * the rebind vector, so `guardedFetch` degrades to plain `fetch`. Node 22+
 * is required for the socket-level guard (undici Agent's `connect.lookup`
 * callback). `undici` and `node:dns` are loaded lazily so browser bundlers
 * don't drag them into the graph.
 */

import { isPrivateHost } from './ssrf-guard';

declare const __ALAP_IIFE__: boolean | undefined;

// Vite's `define` replaces `__ALAP_IIFE__` with a literal at build time.
// `typeof` guard makes the code safe for environments that don't apply
// `define` (vitest in some configurations, ts-node, etc.) — falls back
// to `false`, which is the right default for the non-IIFE case.
const IS_IIFE_BUILD: boolean =
  typeof __ALAP_IIFE__ !== 'undefined' && __ALAP_IIFE__ === true;

const isNodeRuntime =
  typeof process !== 'undefined' && !!process.versions?.node;

// Loud fail if the browser-only IIFE bundle is loaded in Node — silent
// degradation to unprotected fetch would hide a real misconfiguration.
if (IS_IIFE_BUILD && isNodeRuntime) {
  throw new Error(
    'alap.iife.js is browser-only. In Node, import from "alap" (the ESM/CJS entry) to get the full DNS-rebinding guard.',
  );
}

// `isNode` collapses to `false` in the IIFE build, so the socket-level
// guard and its `import('undici')` / `import('node:dns')` calls become
// unreachable and are tree-shaken out of the browser bundle.
const isNode = !IS_IIFE_BUILD && isNodeRuntime;

type NodeDispatcher = unknown;

let cachedDispatcher: NodeDispatcher | null = null;
let initPromise: Promise<NodeDispatcher> | null = null;

const getDispatcher = (): Promise<NodeDispatcher> => {
  if (cachedDispatcher) return Promise.resolve(cachedDispatcher);
  initPromise ??= (async () => {
    // `@vite-ignore` + string-variable specifiers so bundlers don't follow
    // these into the IIFE/browser graphs. `guardedFetch` gates on `isNode`
    // before ever reaching here, so runtime resolution is Node-only.
    type UndiciMod = typeof import('undici');
    type DnsMod = typeof import('node:dns');
    type LookupOneOptions = import('node:dns').LookupOneOptions;
    const undiciSpec = 'undici';
    const dnsSpec = 'node:dns';
    const [undiciMod, dnsMod] = (await Promise.all([
      import(/* @vite-ignore */ undiciSpec),
      import(/* @vite-ignore */ dnsSpec),
    ])) as [UndiciMod, DnsMod];
    const { Agent } = undiciMod;
    const dnsLookup = dnsMod.lookup;

    const lookup = (
      hostname: string,
      options: unknown,
      callback: (err: Error | null, address: string, family: number) => void,
    ): void => {
      // `family: 0` — no v4/v6 preference, avoids Node DNS cache surprises.
      // `all: false` — single address back; our check needs one IP per attempt.
      const opts: LookupOneOptions = { ...(options as object), family: 0, all: false };
      dnsLookup(hostname, opts, (err, address, family) => {
        if (err) {
          callback(err, '', 0);
          return;
        }
        if (isPrivateHost(`http://${address}`)) {
          const rebindErr = new Error(
            `SSRF guard: hostname "${hostname}" resolved to private IP ${address}`,
          ) as NodeJS.ErrnoException;
          rebindErr.code = 'ERR_SSRF_PRIVATE_IP';
          callback(rebindErr, '', 0);
          return;
        }
        callback(null, address, family);
      });
    };

    cachedDispatcher = new Agent({
      connect: { lookup: lookup as unknown as never },
    });
    return cachedDispatcher;
  })();
  return initPromise;
};

/**
 * Drop-in replacement for `fetch()` on Node-side protocols. Applies a cheap
 * syntactic guard first (`isPrivateHost` against the URL's hostname). In
 * Node, adds a socket-level re-check against the DNS-resolved IP. In the
 * browser, degrades to plain `fetch` — CORS closes the rebind vector.
 */
export async function guardedFetch(
  url: string | URL,
  init?: RequestInit,
): Promise<Response> {
  const urlStr = url.toString();
  if (isPrivateHost(urlStr)) {
    throw new Error(`SSRF guard: refusing ${urlStr} (private address)`);
  }
  if (!isNode) {
    return fetch(url, init);
  }
  const dispatcher = await getDispatcher();
  return fetch(url, {
    ...init,
    dispatcher,
  } as RequestInit);
}
