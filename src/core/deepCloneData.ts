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
 * `deepCloneData` returns a detached copy of a data-only value. It is the
 * entry-point gate between untrusted input (storage loads, remote payloads)
 * and the rest of the engine: by the time a value reaches `validateConfig`
 * it must be plain data with no shared references to the caller and no
 * exotic types.
 *
 * Contract:
 * - Primitives (incl. `null`, `undefined`, `symbol`) pass through.
 * - Arrays and plain objects are recursed and rebuilt fresh.
 * - Functions, class instances, `Date`, `RegExp`, `Map`, `Set`, typed
 *   arrays, and prototype-bearing non-plain objects all throw
 *   `ConfigCloneError`. Config is data; if the caller needs behavior it
 *   passes handlers via `new AlapEngine(config, { handlers })`.
 * - Cycles throw.
 * - Graphs deeper than `MAX_CLONE_DEPTH` or larger than `MAX_CLONE_NODES`
 *   throw — bounds picked well above any real config so a legitimate
 *   payload never trips them but a pathological one fails fast.
 *
 * The guards are deliberately loud: a caller that hits a bound is
 * misusing the config surface, not being "nearly fine" — better to halt
 * than accept a possibly-truncated copy.
 */

const MAX_CLONE_DEPTH = 64;
const MAX_CLONE_NODES = 10_000;

export class ConfigCloneError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigCloneError';
  }
}

const BLOCKED_KEYS: ReadonlySet<string> = new Set(['__proto__', 'constructor', 'prototype']);

export function deepCloneData<T>(value: T): T {
  const seen = new WeakSet<object>();
  let nodeCount = 0;

  function clone(v: unknown, depth: number, path: string): unknown {
    if (v === null || v === undefined) return v;

    const t = typeof v;
    if (t === 'string' || t === 'number' || t === 'boolean' || t === 'bigint') return v;
    if (t === 'symbol') return v;

    if (t === 'function') {
      throw new ConfigCloneError(
        `Functions are not allowed in config (at ${path || '<root>'}). Pass handlers via new AlapEngine(config, { handlers }) — see docs/handlers-out-of-config.md.`,
      );
    }

    if (depth > MAX_CLONE_DEPTH) {
      throw new ConfigCloneError(`Config depth exceeds ${MAX_CLONE_DEPTH} (at ${path})`);
    }
    if (++nodeCount > MAX_CLONE_NODES) {
      throw new ConfigCloneError(`Config node count exceeds ${MAX_CLONE_NODES}`);
    }

    const obj = v as object;
    if (seen.has(obj)) {
      throw new ConfigCloneError(`Cycle detected in config (at ${path})`);
    }
    seen.add(obj);

    if (Array.isArray(v)) {
      const out: unknown[] = new Array(v.length);
      for (let i = 0; i < v.length; i++) {
        out[i] = clone(v[i], depth + 1, `${path}[${i}]`);
      }
      return out;
    }

    const proto = Object.getPrototypeOf(v);
    if (proto !== Object.prototype && proto !== null) {
      const name = (proto && proto.constructor && proto.constructor.name) || 'unknown';
      throw new ConfigCloneError(
        `Unexpected object type in config at ${path || '<root>'}: ${name} (only plain objects, arrays, and primitives are allowed).`,
      );
    }

    const out: Record<string, unknown> = {};
    for (const k of Object.keys(obj)) {
      if (BLOCKED_KEYS.has(k)) continue;
      out[k] = clone((obj as Record<string, unknown>)[k], depth + 1, path ? `${path}.${k}` : k);
    }
    return out;
  }

  return clone(value, 0, '') as T;
}
