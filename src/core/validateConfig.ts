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

import type { AlapConfig, AlapLink } from './types';
import { sanitizeUrl } from './sanitizeUrl';
import { validateRegex } from './validateRegex';
import { warn } from './logger';
import { deepFreeze } from './deepFreeze';
import { deepCloneData } from './deepCloneData';
import { stampProvenance, type Provenance } from './linkProvenance';

/**
 * Keys that must never be copied onto a plain object via bracket assignment:
 * writing `obj['__proto__'] = x` invokes the prototype setter and taints the
 * object's prototype chain (and, depending on the caller, sibling lookups).
 * Every point where we ingest an untrusted record into a fresh object must
 * skip these. Centralized so a new copy path can't quietly diverge.
 */
const BLOCKED_KEYS: ReadonlySet<string> = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Marker set for configs that have already passed through validateConfig.
 *
 * Lets AlapEngine.constructor / updateConfig call validateConfig defensively
 * without clobbering stamps on configs that arrived pre-validated (notably
 * from storage adapters, which stamp `storage:local` / `storage:remote` and
 * would otherwise be re-stamped as `author` by the auto-validate path).
 *
 * Only entries added by this module's own `validateConfig` appear here —
 * external callers can't forge membership from outside.
 */
const VALIDATED: WeakSet<AlapConfig> = new WeakSet();

/**
 * Thrown when a config shape is incompatible with the current API and a
 * migration is needed. The message names the exact field and the fix.
 */
export class ConfigMigrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigMigrationError';
  }
}

/**
 * Reject function fields in `config.protocols[name]`. Handlers must be passed
 * via `new AlapEngine(config, { handlers: {...} })` — the config itself is
 * data only.
 *
 * Thrown loudly at engine construction so the shape mismatch surfaces
 * immediately, not on the first protocol dispatch (where the error would
 * masquerade as a missing handler).
 */
export function assertNoHandlersInConfig(config: AlapConfig): void {
  const protocols = (config as unknown as Record<string, unknown>).protocols;
  if (!protocols || typeof protocols !== 'object') return;
  for (const [name, entry] of Object.entries(protocols as Record<string, unknown>)) {
    if (!entry || typeof entry !== 'object') continue;
    for (const field of ['generate', 'filter', 'handler'] as const) {
      if (typeof (entry as Record<string, unknown>)[field] === 'function') {
        throw new ConfigMigrationError(
          `config.protocols.${name}.${field} is a function — handlers must be passed via new AlapEngine(config, { handlers: { ${name}: fn } }) instead. See docs/handlers-out-of-config.md.`,
        );
      }
    }
  }
}

/**
 * Single source of truth for URL-scheme sanitization on an AlapLink.
 *
 * Called by validateConfig (static config load) and AlapEngine.injectLinks
 * (protocol-generated links at resolve time). Both paths must go through
 * here so a URL-bearing field added later can't ship sanitized in one path
 * and raw in the other — that gap was the root cause of the 3.2 security
 * pass XSS finding in lens/lightbox renderers.
 */
export function sanitizeLinkUrls(link: AlapLink): AlapLink {
  const out: AlapLink = { ...link, url: sanitizeUrl(link.url) };
  if (typeof link.image === 'string') out.image = sanitizeUrl(link.image);
  if (typeof link.thumbnail === 'string') out.thumbnail = sanitizeUrl(link.thumbnail);
  if (link.meta && typeof link.meta === 'object' && !Array.isArray(link.meta)) {
    const safeMeta: Record<string, unknown> = {};
    for (const [mk, mv] of Object.entries(link.meta)) {
      if (BLOCKED_KEYS.has(mk)) continue;
      if (typeof mv === 'string' && /url$/i.test(mk)) {
        safeMeta[mk] = sanitizeUrl(mv);
      } else {
        safeMeta[mk] = mv;
      }
    }
    out.meta = safeMeta;
  }
  return out;
}

export interface ValidateConfigOptions {
  /**
   * Provenance tier to stamp each sanitized link with (see linkProvenance.ts).
   * Defaults to `'author'` — developer-hand-written config. Storage adapters
   * pass `'storage:remote'` / `'storage:local'` so Phase-6 sanitizers can
   * apply stricter rules to links that crossed a storage boundary.
   */
  provenance?: Provenance;
}

/**
 * Validate and sanitize an AlapConfig loaded from an untrusted source
 * (e.g., a remote server or imported JSON file).
 *
 * - Verifies structural shape (allLinks is an object, links have url strings)
 * - Sanitizes all URLs (link.url, link.image, link.thumbnail, meta.*Url) via sanitizeLinkUrls
 * - Validates and removes dangerous regex search patterns
 * - Filters prototype-pollution keys (__proto__, constructor, prototype)
 * - Stamps each sanitized link with the caller-supplied provenance tier
 *
 * Returns a sanitized copy of the config. Does not mutate the input.
 * Throws if the config is structurally invalid (missing allLinks).
 */
export function validateConfig(config: unknown, options: ValidateConfigOptions = {}): AlapConfig {
  const provenance: Provenance = options.provenance ?? 'author';

  if (!config || typeof config !== 'object') {
    throw new Error('Invalid config: expected an object');
  }

  // Short-circuit: if this exact reference was produced by a prior
  // validateConfig call, it's already frozen, stamped, and deep-cloned —
  // re-running the full pipeline would lose the original stamps (notably
  // storage-tier stamps on configs returned from storage adapters, which
  // the caller doesn't want overwritten to 'author').
  if (VALIDATED.has(config as AlapConfig)) {
    return config as AlapConfig;
  }

  // Single front door: reject legacy (function-bearing) shapes before any
  // further processing — deepCloneData would also reject functions, but
  // with a generic "not data" message; this throws first with the exact
  // field name and the migration fix. Downstream callers that pass the
  // returned config to `new AlapEngine(...)` still get belt-and-suspenders
  // protection from the engine's own check, but validateConfig is the
  // canonical gate.
  assertNoHandlersInConfig(config as AlapConfig);

  // Detach from the caller's input. Strips Vue reactive proxies, React
  // state snapshots, and any other wrapper type that would otherwise
  // carry proxy traps into our own meta/settings copies and blow up
  // deepFreeze later. Also throws on class instances and cycles — config
  // is data, and this is where that becomes enforced. Storage adapters
  // already clone before calling us; the idempotent WeakSet short-circuit
  // above keeps that path cheap.
  const cloned = deepCloneData(config) as Record<string, unknown>;
  const raw = cloned;

  // Hook-key allowlist — pulled from settings up front so the per-link pass
  // below can filter non-author-tier hooks against it. `settings.hooks` pulls
  // double duty: (1) a fallback "default hooks for links that don't specify
  // their own" (existing semantic) and (2) an allowlist for hooks arriving
  // on non-author-tier links (new in 3.2). Fail-closed: if no allowlist is
  // declared and the link is non-author tier, all hooks are stripped —
  // remote configs can't smuggle hook keys the app hasn't opted into.
  const rawSettingsForHooks = raw.settings as Record<string, unknown> | undefined;
  const hookAllowlist: Set<string> | null = Array.isArray(rawSettingsForHooks?.hooks)
    ? new Set(rawSettingsForHooks.hooks.filter((h: unknown): h is string => typeof h === 'string'))
    : null;

  // --- allLinks (required) ---
  if (!raw.allLinks || typeof raw.allLinks !== 'object' || Array.isArray(raw.allLinks)) {
    throw new Error('Invalid config: allLinks must be a non-null object');
  }

  const rawLinks = raw.allLinks as Record<string, unknown>;
  const sanitizedLinks: AlapConfig['allLinks'] = {};

  for (const key of Object.keys(rawLinks)) {
    if (BLOCKED_KEYS.has(key)) continue;

    if (key.includes('-')) {
      warn(`validateConfig: skipping allLinks["${key}"] — hyphens are not allowed in item IDs. Use underscores instead. The "-" character is the WITHOUT operator in expressions.`);
      continue;
    }

    const link = rawLinks[key];
    if (!link || typeof link !== 'object' || Array.isArray(link)) {
      warn(`validateConfig: skipping allLinks["${key}"] — not a valid link object`);
      continue;
    }

    const rawLink = link as Record<string, unknown>;

    // url is required and must be a string
    if (typeof rawLink.url !== 'string') {
      warn(`validateConfig: skipping allLinks["${key}"] — missing or invalid url`);
      continue;
    }

    // tags must be an array of strings if present
    let tags: string[] | undefined;
    if (rawLink.tags !== undefined) {
      if (Array.isArray(rawLink.tags)) {
        tags = rawLink.tags.filter((t): t is string => {
          if (typeof t !== 'string') return false;
          if (t.includes('-')) {
            warn(`validateConfig: allLinks["${key}"] — stripping tag "${t}" (hyphens not allowed in tags). Use underscores instead.`);
            return false;
          }
          return true;
        });
      } else {
        warn(`validateConfig: allLinks["${key}"].tags is not an array — ignoring`);
        // tags stays undefined — the spread below will omit it
      }
    }

    // Build the link with shape validation. URL sanitization runs as a final
    // pass via sanitizeLinkUrls below — the single source of truth shared
    // with AlapEngine.injectLinks.
    const shaped: AlapLink = { url: rawLink.url };
    if (typeof rawLink.label === 'string') shaped.label = rawLink.label;
    if (tags !== undefined) shaped.tags = tags;
    if (typeof rawLink.cssClass === 'string') shaped.cssClass = rawLink.cssClass;
    if (typeof rawLink.image === 'string') shaped.image = rawLink.image;
    if (typeof rawLink.altText === 'string') shaped.altText = rawLink.altText;
    if (typeof rawLink.targetWindow === 'string') shaped.targetWindow = rawLink.targetWindow;
    if (typeof rawLink.description === 'string') shaped.description = rawLink.description;
    if (typeof rawLink.thumbnail === 'string') shaped.thumbnail = rawLink.thumbnail;
    if (Array.isArray(rawLink.hooks)) {
      const stringHooks = rawLink.hooks.filter((h): h is string => typeof h === 'string');
      if (provenance === 'author') {
        // Author-tier: the developer wrote this hook list; keep it verbatim.
        shaped.hooks = stringHooks;
      } else if (hookAllowlist) {
        // Non-author with a declared allowlist: keep only allowed keys,
        // warn loudly for anything stripped.
        const allowed: string[] = [];
        for (const h of stringHooks) {
          if (hookAllowlist.has(h)) {
            allowed.push(h);
          } else {
            warn(`validateConfig: allLinks["${key}"] — stripping hook "${h}" not in settings.hooks allowlist (tier: ${provenance})`);
          }
        }
        if (allowed.length > 0) shaped.hooks = allowed;
      } else if (stringHooks.length > 0) {
        // Non-author with no allowlist declared: fail-closed, strip all.
        warn(`validateConfig: allLinks["${key}"] — dropping ${stringHooks.length} hook(s) on ${provenance}-tier link; declare settings.hooks to allow specific keys`);
      }
    }
    if (typeof rawLink.guid === 'string') shaped.guid = rawLink.guid;
    if (rawLink.createdAt !== undefined) shaped.createdAt = rawLink.createdAt as string | number;
    // `allowedSchemes` widens the strict-tier sanitizer for links a trusted
    // protocol handler is supposed to stamp via AlapEngine.injectLinks. Only
    // author-tier links may declare it statically — for any other tier the
    // field is silently dropped so storage-loaded configs and remote
    // responses cannot widen their own sanitization.
    if (provenance === 'author' && Array.isArray(rawLink.allowedSchemes)) {
      const schemes = rawLink.allowedSchemes.filter(
        (s): s is string => typeof s === 'string' && s.length > 0,
      );
      if (schemes.length > 0) shaped.allowedSchemes = schemes;
    }
    if (rawLink.meta && typeof rawLink.meta === 'object' && !Array.isArray(rawLink.meta)) {
      // Explicit bracket-assignment loop rather than `{ ...meta }` so keys
      // like `__proto__` can't ride the spread into a fresh object. The
      // spread would copy them as own props, but the downstream sanitize
      // step uses bracket assignment and that IS exploitable.
      const rawMeta = rawLink.meta as Record<string, unknown>;
      const safeMeta: Record<string, unknown> = {};
      for (const metaKey of Object.keys(rawMeta)) {
        if (BLOCKED_KEYS.has(metaKey)) continue;
        safeMeta[metaKey] = rawMeta[metaKey];
      }
      shaped.meta = safeMeta;
    }

    const finalLink = sanitizeLinkUrls(shaped);
    stampProvenance(finalLink, provenance);
    sanitizedLinks[key] = finalLink;
  }

  // --- settings (optional) ---
  let settings: AlapConfig['settings'];
  if (raw.settings && typeof raw.settings === 'object' && !Array.isArray(raw.settings)) {
    const rawSettings = raw.settings as Record<string, unknown>;
    settings = {} as AlapConfig['settings'];
    for (const key of Object.keys(rawSettings)) {
      if (!BLOCKED_KEYS.has(key)) {
        (settings as Record<string, unknown>)[key] = rawSettings[key];
      }
    }
  }

  // --- macros (optional) ---
  let macros: AlapConfig['macros'];
  if (raw.macros && typeof raw.macros === 'object' && !Array.isArray(raw.macros)) {
    const rawMacros = raw.macros as Record<string, unknown>;
    macros = {};
    for (const key of Object.keys(rawMacros)) {
      if (BLOCKED_KEYS.has(key)) continue;
      if (key.includes('-')) {
        warn(`validateConfig: skipping macro "${key}" — hyphens are not allowed in macro names. Use underscores instead. The "-" character is the WITHOUT operator in expressions.`);
        continue;
      }
      const macro = rawMacros[key];
      if (macro && typeof macro === 'object' && typeof (macro as Record<string, unknown>).linkItems === 'string') {
        macros[key] = macro as AlapConfig['macros'] extends Record<string, infer M> ? M : never;
      } else {
        warn(`validateConfig: skipping macro "${key}" — invalid shape`);
      }
    }
  }

  // --- searchPatterns (optional) ---
  let searchPatterns: AlapConfig['searchPatterns'];
  if (raw.searchPatterns && typeof raw.searchPatterns === 'object' && !Array.isArray(raw.searchPatterns)) {
    const rawPatterns = raw.searchPatterns as Record<string, unknown>;
    searchPatterns = {};
    for (const key of Object.keys(rawPatterns)) {
      if (BLOCKED_KEYS.has(key)) continue;
      if (key.includes('-')) {
        warn(`validateConfig: skipping searchPattern "${key}" — hyphens are not allowed in pattern keys. Use underscores instead. The "-" character is the WITHOUT operator in expressions.`);
        continue;
      }
      const entry = rawPatterns[key];

      // String shorthand
      if (typeof entry === 'string') {
        const validation = validateRegex(entry);
        if (validation.safe) {
          searchPatterns[key] = entry;
        } else {
          warn(`validateConfig: removing searchPattern "${key}" — ${validation.reason}`);
        }
        continue;
      }

      // Object form
      if (entry && typeof entry === 'object' && typeof (entry as Record<string, unknown>).pattern === 'string') {
        const pattern = (entry as Record<string, unknown>).pattern as string;
        const validation = validateRegex(pattern);
        if (validation.safe) {
          searchPatterns[key] = entry as AlapConfig['searchPatterns'] extends Record<string, infer P> ? P : never;
        } else {
          warn(`validateConfig: removing searchPattern "${key}" — ${validation.reason}`);
        }
        continue;
      }

      warn(`validateConfig: skipping searchPattern "${key}" — invalid shape`);
    }
  }

  // --- protocols (optional, data-only since 3.2) ---
  // Preserves cache TTLs, `keys`, `searches`, `allowedOrigins`, `presets`,
  // `accessJwt`, etc. Functions were already rejected by
  // assertNoHandlersInConfig above, so by this point every value here is
  // guaranteed plain data — the deepCloneData pass on input took care of
  // stripping proxies and exotic types.
  let protocols: AlapConfig['protocols'];
  if (raw.protocols && typeof raw.protocols === 'object' && !Array.isArray(raw.protocols)) {
    const rawProtocols = raw.protocols as Record<string, unknown>;
    protocols = {};
    for (const key of Object.keys(rawProtocols)) {
      if (BLOCKED_KEYS.has(key)) continue;
      (protocols as Record<string, unknown>)[key] = rawProtocols[key];
    }
  }

  const result: AlapConfig = { allLinks: sanitizedLinks };
  if (settings) result.settings = settings;
  if (macros) result.macros = macros;
  if (searchPatterns) result.searchPatterns = searchPatterns;
  if (protocols) result.protocols = protocols;

  const frozen = deepFreeze(result);
  VALIDATED.add(frozen);
  return frozen;
}
