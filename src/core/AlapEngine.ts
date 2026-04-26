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

import type {
  AlapConfig,
  AlapEngineOptions,
  AlapLink,
  AlapProtocol,
  AlapSettings,
  GenerateHandler,
  ProgressiveState,
  ProtocolHandler,
  ProtocolHandlerEntry,
  ResolvedLink,
  ResolveResult,
  SourceState,
} from './types';
import { ExpressionParser } from './ExpressionParser';
import { ProtocolCache } from '../protocols/cache';
import {
  DEFAULT_FETCH_TIMEOUT_MS,
  DEFAULT_MAX_CONCURRENT_FETCHES,
  MAX_GENERATED_LINKS,
} from '../constants';
import { warn } from './logger';
import { assertNoHandlersInConfig, sanitizeLinkUrls, validateConfig } from './validateConfig';
import { cloneProvenance, stampProvenance, type Provenance } from './linkProvenance';
import { OverlayCatalog } from './linkCatalog';

/** Regex to find :protocol:...: tokens in an expression */
const PROTOCOL_RE = /:([a-zA-Z]\w*(?::[^:\s+|,()*/]+)*):/g;

let tempIdCounter = 0;

const generateTempId = (protocolName: string): string =>
  `__alap_gen_${protocolName}_${tempIdCounter++}_${Date.now().toString(36)}`;

export class AlapEngine {
  private config: AlapConfig;
  private parser: ExpressionParser;
  private cache: ProtocolCache;
  private generatedIds: Map<string, string[]> = new Map();
  /**
   * Protocol-generated link overlay. Lives outside `config.allLinks` so the
   * config itself can be deep-frozen while the engine still layers in
   * ephemeral results at resolve time. The map's keys are the full set of
   * injected ids — no separate bookkeeping set. Lookup precedence in
   * `OverlayCatalog` is author-first — an overlay entry can never shadow
   * a static id.
   */
  private generatedLinks: Map<string, AlapLink> = new Map();
  /** Read-only merged view handed to the parser and protocol resolvers. */
  private catalog: OverlayCatalog;
  /** In-flight fetch tracker — coalesces duplicate requests for the same token. */
  private inFlight: Map<string, Promise<void>> = new Map();
  /** Per-token AbortController — wires the handler's optional signal to the engine's timeout + dismiss-cancel logic. */
  private fetchAborts: Map<string, AbortController> = new Map();
  /**
   * Per-token subscriber refcount — how many external callers currently
   * care about the in-flight result. Bumped wherever a caller attaches
   * to a fetch (cold start, in-flight coalesce, progressive attach).
   * `abortInFlight(token)` decrements and only aborts the underlying
   * fetch when the count hits zero — otherwise another renderer (menu,
   * lens, lightbox sharing the same engine) is still waiting and would
   * see its loading placeholder wiped out by the shared abort.
   */
  private fetchSubscribers: Map<string, number> = new Map();
  /** Last-seen error per async token. Consulted by resolveProgressive() to emit error placeholders. */
  private errorCache: Map<string, Error> = new Map();
  /** Count of fetches currently executing (including queued-but-resumed ones). */
  private activeFetchCount = 0;
  /** FIFO queue of resume functions waiting on a concurrency slot. */
  private fetchQueue: Array<() => void> = [];
  /** Protocol handler registry — populated from options.handlers and registerProtocol(). */
  private handlers: Map<string, { generate?: GenerateHandler; filter?: ProtocolHandler }> = new Map();

  constructor(config: AlapConfig, options: AlapEngineOptions = {}) {
    // Auto-validate so hand-written configs (the 95% case) get their links
    // stamped as author-tier and render with loose sanitization. Configs
    // that arrive pre-validated (e.g. from a storage adapter, which stamps
    // storage-tier) short-circuit inside validateConfig — their stamps
    // survive untouched. assertNoHandlersInConfig runs before validation
    // so the migration error message lands before anything else.
    assertNoHandlersInConfig(config);
    const validated = validateConfig(config, { provenance: options.provenance ?? 'author' });
    this.config = validated;
    this.cache = new ProtocolCache();
    if (options.handlers) {
      for (const [name, entry] of Object.entries(options.handlers)) {
        this.registerProtocol(name, entry);
      }
    }
    this.catalog = new OverlayCatalog(validated.allLinks ?? {}, this.generatedLinks);
    this.parser = new ExpressionParser(validated, (name) => this.getProtocolEntry(name), this.catalog);
  }

  /**
   * Register a protocol handler by name. Throws if `name` is already registered —
   * entries are atomic; if a protocol needs both generate and filter, pass them
   * together in one object-form entry.
   */
  registerProtocol(name: string, entry: ProtocolHandlerEntry): void {
    if (this.handlers.has(name)) {
      throw new Error(
        `Protocol "${name}" already registered. Handlers are atomic — if you need both generate and filter, pass them together in one { generate, filter } entry.`,
      );
    }
    const resolved = typeof entry === 'function' ? { generate: entry } : entry;
    this.handlers.set(name, resolved);
  }

  /**
   * Internal lookup. Returns the registered handler entry for a protocol name,
   * or undefined if no handler was registered.
   */
  private getProtocolEntry(name: string): { generate?: GenerateHandler; filter?: ProtocolHandler } | undefined {
    return this.handlers.get(name);
  }

  /** Max concurrent in-flight fetches — reads from config.settings with a default fallback. */
  private get maxConcurrentFetches(): number {
    const v = this.config.settings?.maxConcurrentFetches;
    return typeof v === 'number' && v > 0 ? v : DEFAULT_MAX_CONCURRENT_FETCHES;
  }

  /** Per-fetch timeout in ms — reads from config.settings with a default fallback. */
  private get fetchTimeoutMs(): number {
    const v = this.config.settings?.fetchTimeout;
    return typeof v === 'number' && v > 0 ? v : DEFAULT_FETCH_TIMEOUT_MS;
  }

  /**
   * Core query: expression string -> deduplicated array of item IDs.
   * For expressions that only use filter protocols (no :web: etc.), this works synchronously.
   * For generate protocols, call resolveAsync() instead.
   * @param expression - The expression to evaluate
   * @param anchorId - Optional anchor DOM ID, used for bare @ macro expansion
   */
  query(expression: string, anchorId?: string): string[] {
    return this.parser.query(expression, anchorId);
  }

  /**
   * Resolve IDs to full link objects.
   */
  getLinks(ids: string[]): ResolvedLink[] {
    return ids
      .map(id => {
        const link = this.catalog.get(id);
        if (!link) return null;
        const resolved: ResolvedLink = { id, ...link };
        cloneProvenance(link, resolved);
        return resolved;
      })
      .filter((link): link is ResolvedLink => link !== null);
  }

  /**
   * Convenience: expression -> full link objects (synchronous).
   */
  resolve(expression: string, anchorId?: string): ResolvedLink[] {
    return this.getLinks(this.query(expression, anchorId));
  }

  /**
   * Async resolve: pre-resolves generate protocols, then evaluates.
   * Use this for programmatic/headless callers that want a single awaitable
   * result rather than progressive rendering. Unlike the legacy behavior,
   * this no longer clears generated links after returning — call
   * {@link clearGenerated} explicitly if you need that.
   */
  async resolveAsync(expression: string, anchorId?: string): Promise<ResolvedLink[]> {
    await this.preResolve([expression]);
    return this.getLinks(this.query(expression, anchorId));
  }

  /**
   * Progressive resolve — for renderers that want to open immediately with
   * whatever's available and re-render as async sources settle.
   *
   * Returns synchronously: `resolved` has everything already available
   * (static matches + any cache-hit async sources), and `sources` has a
   * per-token entry for async sources that are loading, errored, or
   * settled-empty. Each loading source carries a `promise` the caller can
   * `.then()` on and re-invoke this method for the updated state.
   *
   * Side effect: for any cold async token, this method starts the fetch
   * and registers it in the in-flight map. Subsequent calls with the same
   * token attach to the existing promise (no duplicate fetch).
   */
  resolveProgressive(expression: string, anchorId?: string): ProgressiveState {
    const sources = this.prepareProgressive(expression);
    const resolved = this.getLinks(this.query(expression, anchorId));
    return { resolved, sources };
  }

  /**
   * Pre-resolve all generate protocols in the given expressions.
   * Scans for protocol tokens, calls generate handlers, injects results
   * into allLinks with temp IDs, and populates the generatedIds map.
   *
   * Must be called before query() if expressions use generate protocols.
   * The parser itself stays synchronous. Shares the in-flight dedup map
   * with resolveProgressive — if a token is already fetching, this awaits
   * the existing promise rather than starting a new fetch.
   */
  async preResolve(expressions: string[]): Promise<void> {
    const awaitables: Promise<void>[] = [];

    for (const expr of expressions) {
      for (const token of this.extractAsyncTokens(expr)) {
        const promise = this.ensureTokenResolution(token);
        if (promise) awaitables.push(promise);
      }
    }

    await Promise.allSettled(awaitables);
    this.parser.setGeneratedIds(this.generatedIds);
  }

  /**
   * Replace configuration. Auto-validates so hand-built configs (the
   * factory-rebuild-and-swap pattern) get stamped author-tier. Already-
   * validated configs short-circuit and keep their stamps.
   */
  updateConfig(config: AlapConfig): void {
    assertNoHandlersInConfig(config);
    const validated = validateConfig(config);
    this.config = validated;
    this.catalog = new OverlayCatalog(validated.allLinks ?? {}, this.generatedLinks);
    this.parser.updateConfig(validated, this.catalog);
    this.cleanupGenerated();
    this.generatedIds.clear();
  }

  /**
   * Add or replace an author link by id. The config is rebuilt and
   * re-frozen — this is the sanctioned replacement for mutating
   * `config.allLinks` at runtime. Passes through `validateConfig`, so a
   * link with an unsafe URL scheme or a hyphenated id is stripped or
   * warned just as it would be at initial load.
   */
  addLink(id: string, link: AlapLink): void {
    const nextLinks = { ...this.config.allLinks, [id]: link };
    this.updateConfig(validateConfig({ ...this.config, allLinks: nextLinks }));
  }

  /**
   * Remove an author link by id. No-op if the id isn't present. Overlay
   * entries (protocol-generated) are cleared separately by
   * {@link clearGenerated}.
   */
  removeLink(id: string): void {
    if (!this.config.allLinks || !(id in this.config.allLinks)) return;
    const nextLinks: Record<string, AlapLink> = { ...this.config.allLinks };
    delete nextLinks[id];
    this.updateConfig(validateConfig({ ...this.config, allLinks: nextLinks }));
  }

  /**
   * Merge a partial settings patch and rebuild. Author keys not named in
   * `partial` are preserved; unknown or blocked keys are dropped by
   * validateConfig.
   */
  updateSettings(partial: Partial<AlapSettings>): void {
    const nextSettings = { ...(this.config.settings ?? {}), ...partial } as AlapSettings;
    this.updateConfig(validateConfig({ ...this.config, settings: nextSettings }));
  }

  /**
   * Clear the generate protocol cache.
   */
  clearCache(): void {
    this.cache.clear();
    this.errorCache.clear();
  }

  /**
   * Remove all temp IDs that were injected by async protocol resolution.
   * Use when you want to release memory after progressive rendering work
   * or restart with a clean slate. Does not clear the protocol result
   * cache — call {@link clearCache} for that.
   */
  clearGenerated(): void {
    this.cleanupGenerated();
  }

  /**
   * Build the SourceState list for a progressive render and kick off any
   * fetches that haven't started yet. Injects already-cached results into
   * allLinks so the subsequent query() picks them up.
   */
  private prepareProgressive(expression: string): SourceState[] {
    const sources: SourceState[] = [];
    const tokens = this.extractAsyncTokens(expression);
    const parserKeyForToken = (t: string) => t.replace(/:/g, '|');

    let injectedThisCall = false;

    for (const token of tokens) {
      const protocolName = token.split(':')[0];

      // Errored on last fetch — surface as error source, no retry on this call.
      const cachedError = this.errorCache.get(token);
      if (cachedError) {
        sources.push({ token, status: 'error', error: cachedError });
        continue;
      }

      // Cache hit — inject if not yet, then mark empty if the result was [].
      const cached = this.cache.get(token);
      if (cached !== null) {
        if (!this.generatedIds.has(parserKeyForToken(token))) {
          this.injectLinks(token, protocolName, cached);
          injectedThisCall = true;
        }
        if (cached.length === 0) {
          sources.push({ token, status: 'empty' });
        }
        continue;
      }

      // In flight — attach to the existing promise.
      const existing = this.inFlight.get(token);
      if (existing) {
        this.subscribeToken(token);
        sources.push({ token, status: 'loading', promise: existing });
        continue;
      }

      // Cold — start a new fetch.
      const promise = this.ensureTokenResolution(token);
      if (promise) {
        sources.push({ token, status: 'loading', promise });
      }
    }

    if (injectedThisCall) {
      this.parser.setGeneratedIds(this.generatedIds);
    }

    return sources;
  }

  /**
   * Ensure a token has either a cached result or an in-flight fetch. Returns
   * the in-flight promise (new or existing), or undefined if the token has
   * no valid generate handler / is already cached successfully / is errored.
   */
  private ensureTokenResolution(token: string): Promise<void> | undefined {
    const parts = token.split(':');
    const protocolName = parts[0];
    const args = parts.slice(1);
    const protocol = this.config.protocols?.[protocolName];
    const entry = this.getProtocolEntry(protocolName);
    // Need either config data (for cache/keys) or a registered handler to proceed.
    if (!protocol && !entry) return undefined;
    const generate = entry?.generate;
    if (typeof generate !== 'function') return undefined;

    // Cache hit — inject if needed and return.
    const cached = this.cache.get(token);
    if (cached !== null) {
      const parserKey = token.replace(/:/g, '|');
      if (!this.generatedIds.has(parserKey)) {
        this.injectLinks(token, protocolName, cached);
      }
      return undefined;
    }

    // Already errored — don't retry implicitly.
    if (this.errorCache.has(token)) return undefined;

    // Already in flight — coalesce.
    const existing = this.inFlight.get(token);
    if (existing) {
      this.subscribeToken(token);
      return existing;
    }

    // Cold — start a fetch.
    const cacheTTL = this.getCacheTTL(protocol, args[0]);
    const promise = this.startFetch(generate, args, protocolName, token, cacheTTL);
    this.inFlight.set(token, promise);
    this.subscribeToken(token);
    return promise;
  }

  /** Increment the subscriber refcount for `token`. */
  private subscribeToken(token: string): void {
    this.fetchSubscribers.set(token, (this.fetchSubscribers.get(token) ?? 0) + 1);
  }

  /**
   * Abort an in-flight fetch for `token`. Used by renderers when
   * `settings.cancelFetchOnDismiss` is enabled and a menu is dismissed mid-fetch.
   *
   * Refcounted: each attachment to an in-flight fetch bumps a subscriber
   * count; each call here decrements. The underlying handler is only
   * aborted when the last subscriber drops — otherwise another renderer
   * (menu + lens + lightbox sharing one engine via registerConfig) could
   * still be waiting for the same token and would see its placeholder
   * wiped out mid-fetch.
   *
   * No-op if the token isn't currently being fetched or has no subscribers.
   */
  abortInFlight(token: string): void {
    const count = this.fetchSubscribers.get(token) ?? 0;
    if (count <= 1) {
      // Last (or unknown) subscriber — pull the plug.
      this.fetchSubscribers.delete(token);
      const controller = this.fetchAborts.get(token);
      if (controller) controller.abort();
    } else {
      // Other subscribers still want the result; just decrement.
      this.fetchSubscribers.set(token, count - 1);
    }
  }

  /**
   * Kick off a fetch: under the concurrency cap it invokes the handler
   * synchronously (before any microtask yields), so callers inspecting state
   * immediately after resolveProgressive() see the handler already running.
   * Above the cap, the fetch is queued and runFetch runs later. Either way
   * the returned promise settles when the fetch completes.
   */
  private startFetch(
    generate: GenerateHandler,
    args: string[],
    protocolName: string,
    tokenValue: string,
    cacheTTL: number | undefined,
  ): Promise<void> {
    if (this.activeFetchCount < this.maxConcurrentFetches) {
      this.activeFetchCount++;
      return this.runFetch(generate, args, protocolName, tokenValue, cacheTTL);
    }
    return new Promise<void>((resolve) => {
      this.fetchQueue.push(() => {
        this.activeFetchCount++;
        resolve(this.runFetch(generate, args, protocolName, tokenValue, cacheTTL));
      });
    });
  }

  /**
   * The actual fetch + cache + inject + error-handling body. Split out from
   * startFetch so `generate()` can be invoked synchronously on the happy path
   * (no await before the call). Errors (including timeouts and aborts) are
   * recorded in errorCache; the promise always resolves (never rejects) so
   * callers can Promise.all across multiple tokens without one bad handler
   * taking down the rest.
   */
  private async runFetch(
    generate: GenerateHandler,
    args: string[],
    protocolName: string,
    tokenValue: string,
    cacheTTL: number | undefined,
  ): Promise<void> {
    const controller = new AbortController();
    this.fetchAborts.set(tokenValue, controller);
    const timeoutMs = this.fetchTimeoutMs;
    const timeoutId = setTimeout(() => {
      controller.abort(new Error(`fetch timeout after ${timeoutMs}ms`));
    }, timeoutMs);

    // Invoke the handler synchronously. An async function's body runs up to
    // the first `await` before returning — so `generate(...)` is called here,
    // right now, not after a microtask yield. This matters for tests that
    // configure the handler and then settle it in the same turn.
    const inner = generate(args, this.config, { signal: controller.signal });

    try {
      const links = await this.raceWithAbort(inner, controller.signal);
      const capped = links.slice(0, MAX_GENERATED_LINKS);
      // Two-tier warning: the routine case (handler ran slightly over) gets
      // a quiet log, the anomalous case (>10× the cap) gets a louder
      // operator-facing alert. A handler returning >10× MAX_GENERATED_LINKS
      // is either a bug (e.g. forgot to respect its own limit arg) or a
      // hostile feed trying to make us hold a huge transient array. The
      // engine still slice-caps either way — this just makes the anomaly
      // visible so the operator can investigate rather than have it silently
      // swept under the slice.
      if (links.length > MAX_GENERATED_LINKS * 10) {
        warn(`:${protocolName}: returned ${links.length} links — >10× the ${MAX_GENERATED_LINKS}-item cap. This is suspicious: a well-behaved handler should respect the cap internally. Capped at ${MAX_GENERATED_LINKS}.`);
      } else if (links.length > MAX_GENERATED_LINKS) {
        warn(`:${protocolName}: returned ${links.length} links, capped at ${MAX_GENERATED_LINKS}`);
      }
      this.cache.set(tokenValue, capped, cacheTTL);
      this.errorCache.delete(tokenValue);
      if (!this.generatedIds.has(tokenValue.replace(/:/g, '|'))) {
        this.injectLinks(tokenValue, protocolName, capped);
        this.parser.setGeneratedIds(this.generatedIds);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      warn(`:${protocolName}: generate handler failed: ${error.message}`);
      this.errorCache.set(tokenValue, error);
    } finally {
      clearTimeout(timeoutId);
      this.fetchAborts.delete(tokenValue);
      this.inFlight.delete(tokenValue);
      // Clear subscriber count — the fetch is done, refcount is moot.
      // Any further abortInFlight(token) calls become no-ops.
      this.fetchSubscribers.delete(tokenValue);
      this.releaseFetchSlot();
    }
  }

  /** Release a concurrency slot and resume the next queued fetch if any. */
  private releaseFetchSlot(): void {
    this.activeFetchCount--;
    const next = this.fetchQueue.shift();
    if (next) next();
  }

  /**
   * Race a pending handler result against an AbortSignal, so a handler
   * that ignores the signal still gets surfaced as an error on timeout /
   * explicit abort. Handlers that honor the signal will usually reject
   * on their own first.
   */
  private raceWithAbort<T>(inner: Promise<T>, signal: AbortSignal): Promise<T> {
    if (signal.aborted) {
      return Promise.reject(signal.reason ?? new Error('aborted'));
    }
    return new Promise<T>((resolve, reject) => {
      const onAbort = () => {
        signal.removeEventListener('abort', onAbort);
        reject(signal.reason ?? new Error('aborted'));
      };
      signal.addEventListener('abort', onAbort);
      inner.then(
        (v) => { signal.removeEventListener('abort', onAbort); resolve(v); },
        (e) => { signal.removeEventListener('abort', onAbort); reject(e); },
      );
    });
  }

  /**
   * Extract unique protocol tokens from an expression.
   * Returns the token body (contents between the outer colons), e.g.
   * `:hn:search:ai:` → `"hn:search:ai"`.
   */
  private extractAsyncTokens(expression: string): string[] {
    const out = new Set<string>();
    PROTOCOL_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = PROTOCOL_RE.exec(expression)) !== null) {
      out.add(match[1]);
    }
    return Array.from(out);
  }

  private injectLinks(tokenValue: string, protocolName: string, links: AlapLink[]): void {
    const ids: string[] = [];
    const tier: Provenance = `protocol:${protocolName}`;
    for (const link of links) {
      const id = generateTempId(protocolName);
      // sanitizeLinkUrls returns a new link object; stamp the new identity,
      // not the incoming one (handler-returned objects may be shared refs).
      const sanitized = sanitizeLinkUrls(link);
      // Preserve `allowedSchemes` from the trusted protocol handler so the
      // renderer's tiered sanitizer can permit non-http URIs the protocol
      // legitimately emits (e.g. `obsidian://` from `:obsidian:`). Today
      // `sanitizeLinkUrls` spreads the link so this assignment is
      // technically redundant; keeping it explicit guards against future
      // refactors that move sanitizeLinkUrls to a strict-allowlist shape.
      if (Array.isArray(link.allowedSchemes)) {
        sanitized.allowedSchemes = link.allowedSchemes;
      }
      stampProvenance(sanitized, tier);
      this.generatedLinks.set(id, sanitized);
      ids.push(id);
    }
    this.generatedIds.set(tokenValue.replace(/:/g, '|'), ids);
  }

  private cleanupGenerated(): void {
    this.generatedLinks.clear();
    this.generatedIds.clear();
    this.parser.setGeneratedIds(new Map());
  }

  private getCacheTTL(protocol: AlapProtocol | undefined, keyName?: string): number | undefined {
    if (!protocol) return undefined;
    // Per-key TTL overrides protocol-level TTL
    if (keyName && protocol.keys) {
      const keyConfig = protocol.keys[keyName];
      if (keyConfig && 'cache' in keyConfig) return keyConfig.cache;
    }
    if ('cache' in protocol && typeof protocol.cache === 'number') return protocol.cache;
    return undefined; // use cache default
  }
}
