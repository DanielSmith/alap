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

import type { AlapConfig, AlapLink, AlapProtocol, GenerateHandler, ResolvedLink, ResolveResult } from './types';
import { ExpressionParser } from './ExpressionParser';
import { ProtocolCache } from '../protocols/cache';
import { MAX_GENERATED_LINKS } from '../constants';
import { warn } from './logger';

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
  private injectedIds: Set<string> = new Set();

  constructor(config: AlapConfig) {
    this.config = config;
    this.parser = new ExpressionParser(config);
    this.cache = new ProtocolCache();
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
        const link = this.config.allLinks[id];
        return link ? { id, ...link } : null;
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
   * Use this when expressions may contain external protocols like :web:.
   */
  async resolveAsync(expression: string, anchorId?: string): Promise<ResolvedLink[]> {
    await this.preResolve([expression]);
    try {
      return this.getLinks(this.query(expression, anchorId));
    } finally {
      this.cleanupGenerated();
    }
  }

  /**
   * Pre-resolve all generate protocols in the given expressions.
   * Scans for protocol tokens, calls generate handlers, injects results
   * into allLinks with temp IDs, and populates the generatedIds map.
   *
   * Must be called before query() if expressions use generate protocols.
   * The parser itself stays synchronous.
   */
  async preResolve(expressions: string[]): Promise<void> {
    const tokens = new Set<string>();

    for (const expr of expressions) {
      PROTOCOL_RE.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = PROTOCOL_RE.exec(expr)) !== null) {
        tokens.add(match[1]);
      }
    }

    const promises: Array<{ tokenValue: string; promise: Promise<AlapLink[]> }> = [];

    for (const tokenValue of tokens) {
      const segments = tokenValue.split(':');
      const protocolName = segments[0];
      const args = segments.slice(1);
      const protocol = this.config.protocols?.[protocolName];
      if (!protocol) continue;

      const generate = protocol.generate;
      if (typeof generate !== 'function') continue;

      // Check cache
      const cacheTTL = this.getCacheTTL(protocol, args[0]);
      const cached = this.cache.get(tokenValue);
      if (cached) {
        this.injectLinks(tokenValue, protocolName, cached);
        continue;
      }

      promises.push({
        tokenValue,
        promise: this.callGenerate(generate, args, protocolName, tokenValue, cacheTTL),
      });
    }

    // Resolve all generate calls in parallel
    const results = await Promise.allSettled(
      promises.map(async ({ tokenValue, promise }) => {
        const links = await promise;
        return { tokenValue, links };
      }),
    );

    for (const result of results) {
      if (result.status === 'fulfilled') {
        const { tokenValue, links } = result.value;
        const protocolName = tokenValue.split(':')[0];
        this.injectLinks(tokenValue, protocolName, links);
      }
    }

    // Pass the generated IDs to the parser
    this.parser.setGeneratedIds(this.generatedIds);
  }

  /**
   * Replace configuration.
   */
  updateConfig(config: AlapConfig): void {
    this.config = config;
    this.parser.updateConfig(config);
    this.cleanupGenerated();
    this.generatedIds.clear();
  }

  /**
   * Clear the generate protocol cache.
   */
  clearCache(): void {
    this.cache.clear();
  }

  private async callGenerate(
    generate: GenerateHandler,
    args: string[],
    protocolName: string,
    tokenValue: string,
    cacheTTL: number | undefined,
  ): Promise<AlapLink[]> {
    try {
      const links = await generate(args, this.config);
      const capped = links.slice(0, MAX_GENERATED_LINKS);
      if (links.length > MAX_GENERATED_LINKS) {
        warn(`:${protocolName}: returned ${links.length} links, capped at ${MAX_GENERATED_LINKS}`);
      }
      this.cache.set(tokenValue, capped, cacheTTL);
      return capped;
    } catch (err) {
      warn(`:${protocolName}: generate handler failed: ${err instanceof Error ? err.message : String(err)}`);
      return [];
    }
  }

  private injectLinks(tokenValue: string, protocolName: string, links: AlapLink[]): void {
    const ids: string[] = [];
    for (const link of links) {
      const id = generateTempId(protocolName);
      this.config.allLinks[id] = link;
      this.injectedIds.add(id);
      ids.push(id);
    }
    this.generatedIds.set(tokenValue.replace(/:/g, '|'), ids);
  }

  private cleanupGenerated(): void {
    for (const id of this.injectedIds) {
      delete this.config.allLinks[id];
    }
    this.injectedIds.clear();
    this.generatedIds.clear();
    this.parser.setGeneratedIds(new Map());
  }

  private getCacheTTL(protocol: AlapProtocol, keyName?: string): number | undefined {
    // Per-key TTL overrides protocol-level TTL
    if (keyName && protocol.keys) {
      const keyConfig = protocol.keys[keyName];
      if (keyConfig && 'cache' in keyConfig) return keyConfig.cache;
    }
    if ('cache' in protocol && typeof protocol.cache === 'number') return protocol.cache;
    return undefined; // use cache default
  }
}
