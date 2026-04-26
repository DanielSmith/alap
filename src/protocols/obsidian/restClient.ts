/**
 * Copyright 2026 Daniel Smith — Apache 2.0
 *
 * HTTP plumbing for `:obsidian:rest:`.
 *
 * Two narrow paths through one wrapper:
 *   1. Standard path — native `fetch` with `AbortController` for timeout.
 *      Used for verified TLS, plain HTTP, or when the user hasn't asked
 *      to bypass cert verification.
 *   2. Loopback-with-bypass — `node:https.request` with an explicit
 *      `Agent({ rejectUnauthorized: false })`. Used only when scheme is
 *      https, host is loopback, AND `rest.rejectUnauthorized === false`
 *      is set in config. Anything else falls through to path 1.
 *
 * Every diagnostic message that touches a URL or response body is run
 * through {@link redactKey} so the API key never leaks into logs.
 *
 * Node-only — `node:https` import means this file is excluded from
 * browser bundles via the obsidian subpath export.
 */

import { request as httpsRequest, Agent as HttpsAgent } from 'node:https';
import { Buffer } from 'node:buffer';
import type { IncomingMessage } from 'node:http';

import { warn } from '../../core/logger';
import { WEB_FETCH_TIMEOUT_MS } from '../../constants';
import { isLocalhost } from '../shared/localhostGuard';
import {
  HTTP_STATUS_OK_MAX_EXCLUSIVE,
  HTTP_STATUS_OK_MIN,
  OBSIDIAN_REST_DEFAULT_ALLOWED_HOSTS,
  OBSIDIAN_REST_HOST,
  OBSIDIAN_REST_PORT,
  OBSIDIAN_REST_SCHEME,
} from './constants';
import type { ObsidianRestConfig } from './types';

/**
 * A minimal Response-like shape that both code paths return. Callers
 * use `status`, `ok`, `text()`, and `json()` — no need for the full
 * web Response surface.
 */
export interface RestResponse {
  status: number;
  ok: boolean;
  text(): Promise<string>;
  json(): Promise<unknown>;
}

export interface RestFetchOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: string;
  /** Override the default timeout (defaults to `WEB_FETCH_TIMEOUT_MS`). */
  timeoutMs?: number;
}

const isOkStatus = (status: number): boolean =>
  status >= HTTP_STATUS_OK_MIN && status < HTTP_STATUS_OK_MAX_EXCLUSIVE;

/**
 * Strip the API key (raw or `Bearer <key>`) from any string before
 * passing to `warn()`. Empty key or text returns input unchanged so
 * callers can pipe everything through unconditionally.
 */
export const redactKey = (text: string, key: string | undefined): string => {
  if (!text || !key) return text;
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text
    .replace(new RegExp(`Bearer\\s+${escaped}`, 'g'), 'Bearer ***')
    .replace(new RegExp(escaped, 'g'), '***');
};

/**
 * Issue a request to the Obsidian Local REST API. Returns the response
 * (status + body accessors) or `null` if blocked by policy or network
 * failure. Callers treat `null` as "skip, return [] from the handler."
 *
 * @param config  REST transport config (host/port/scheme/apiKey/etc.)
 * @param path    Path including query string (e.g. `/search/simple/?query=x`)
 * @param opts    Method, headers, body, timeout override
 */
export const restFetch = async (
  config: ObsidianRestConfig,
  path: string,
  opts: RestFetchOptions = {},
): Promise<RestResponse | null> => {
  const host = (typeof config.host === 'string' && config.host.trim().length > 0)
    ? config.host.trim()
    : OBSIDIAN_REST_HOST;
  const port = config.port ?? OBSIDIAN_REST_PORT;
  const scheme = config.scheme ?? OBSIDIAN_REST_SCHEME;
  const apiKey = config.apiKey;
  const allowedHosts = config.allowedHosts ?? [...OBSIDIAN_REST_DEFAULT_ALLOWED_HOSTS];
  const timeoutMs = opts.timeoutMs ?? WEB_FETCH_TIMEOUT_MS;

  // SSRF-guard note: unlike :web:, :json:, :hn:, and :atproto:, this file
  // does NOT route through `guardedFetch` (src/protocols/guarded-fetch.ts).
  //
  // Why: `:obsidian:rest:` is loopback-first by design — the default
  // allowedHosts list is ['127.0.0.1', '::1', 'localhost'], because that's
  // where Obsidian's Local REST API plugin actually runs. `guardedFetch`'s
  // syntactic check rejects loopback, so applying it here would break the
  // protocol's primary use case. The `allowedHosts` gate above IS the SSRF
  // guard: requests to any host not on the author's explicit list are
  // refused before DNS or a socket is touched.
  //
  // Residual DNS-rebinding exposure: an author who extends allowedHosts
  // with a non-loopback hostname (e.g. a self-hosted remote Obsidian REST
  // instance) is vulnerable to that hostname being rebound to 127.0.0.1 by
  // an attacker's DNS. The attack lands on the user's local Obsidian — a
  // narrow scenario that also requires a running local instance and a
  // matching apiKey. Closing it would need a `denyLoopback` flag threaded
  // through per non-loopback allowlist entry, or a variant of guardedFetch
  // that accepts a per-request loopback carve-out. Deferred; tracked in
  // docs/3_2-dns-rebinding-plan.md.
  if (!allowedHosts.includes(host)) {
    warn(`:obsidian:rest: host "${host}" is not in allowedHosts — add it to protocols.obsidian.rest.allowedHosts to permit`);
    return null;
  }

  if (!apiKey) {
    // Belt-and-braces — resolveRest already gates on this, but restFetch
    // shouldn't blindly issue a request with no auth header either.
    warn(':obsidian:rest: restFetch called without an apiKey — request blocked');
    return null;
  }

  const url = `${scheme}://${host}:${port}${path}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    ...opts.headers,
  };

  const useUnverifiedTLS =
    scheme === 'https'
    && config.rejectUnauthorized === false
    && isLocalhost(host);

  try {
    if (useUnverifiedTLS) {
      return await fetchViaHttpsAgent(url, headers, opts, timeoutMs);
    }
    return await fetchViaNative(url, headers, opts, timeoutMs);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    warn(`:obsidian:rest: ${redactKey(msg, apiKey)}`);
    return null;
  }
};

/**
 * Standard fetch path — works for verified TLS and plain HTTP. Timeout
 * via AbortController.
 */
const fetchViaNative = async (
  url: string,
  headers: Record<string, string>,
  opts: RestFetchOptions,
  timeoutMs: number,
): Promise<RestResponse> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body,
      signal: controller.signal,
    });
    return {
      status: resp.status,
      ok: resp.ok,
      text: () => resp.text(),
      json: () => resp.json(),
    };
  } finally {
    clearTimeout(timer);
  }
};

/**
 * Loopback-with-bypass path — `node:https.request` with explicit Agent
 * so we can disable cert verification scoped to this single request.
 * Never used for non-loopback hosts (gated by caller).
 */
const fetchViaHttpsAgent = (
  url: string,
  headers: Record<string, string>,
  opts: RestFetchOptions,
  timeoutMs: number,
): Promise<RestResponse> => {
  return new Promise<RestResponse>((resolve, reject) => {
    const agent = new HttpsAgent({ rejectUnauthorized: false });
    const req = httpsRequest(
      url,
      {
        method: opts.method ?? 'GET',
        headers,
        agent,
        timeout: timeoutMs,
      },
      (res: IncomingMessage) => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => {
          const body = Buffer.concat(chunks);
          const status = res.statusCode ?? 0;
          resolve({
            status,
            ok: isOkStatus(status),
            text: async () => body.toString('utf8'),
            json: async () => JSON.parse(body.toString('utf8')) as unknown,
          });
        });
        res.on('error', reject);
      },
    );
    req.on('timeout', () => {
      req.destroy(new Error(`timeout after ${timeoutMs}ms`));
    });
    req.on('error', reject);
    if (opts.body !== undefined) req.write(opts.body);
    req.end();
  });
};
