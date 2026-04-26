/**
 * Copyright 2026 Daniel Smith — Apache 2.0
 *
 * Minimum Node server for the :obsidian:rest: example.
 *
 * Serves the static page plus a single POST endpoint that resolves
 * `:obsidian:rest:` expressions against a running instance of the
 * Obsidian Local REST API plugin. The browser never sees the plugin
 * URL, port, or API key — it just posts segments and receives AlapLink
 * JSON. The Node server is the proxy that knows how to talk to the
 * plugin (loopback HTTP, or HTTPS with a localhost-scoped TLS bypass).
 *
 * Prerequisite: run `pnpm build` from the repo root so that
 * `alap/protocols/obsidian` resolves to built JS.
 *
 * Environment:
 *   PORT                     — default 9179
 *   ALAP_OBSIDIAN_REST_KEY   — REQUIRED; the plugin's API key
 *   ALAP_OBSIDIAN_REST_HOST  — default 127.0.0.1
 *   ALAP_OBSIDIAN_REST_PORT  — default 27123 (HTTP, no cert dance)
 *   ALAP_OBSIDIAN_REST_SCHEME — default http (use https with port 27124
 *                              if you've trusted the plugin's self-signed
 *                              cert; we set rejectUnauthorized=false to
 *                              skip cert verification on loopback)
 *   ALAP_OBSIDIAN_VAULT      — display name used in obsidian:// URIs
 *                              (default: AlapDocs)
 */

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { dirname, extname, join, resolve as resolvePath } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Agent } from 'undici';

import { obsidianHandler } from 'alap/protocols/obsidian';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolvePath(__dirname, '../../..');

const DEFAULT_PORT = 9179;
const DEFAULT_REST_HOST = '127.0.0.1';
// HTTPS on 27124 is the plugin's default-enabled port. The HTTP port
// (27123) is opt-in via the plugin's "Enable Insecure Server" setting,
// so we default to HTTPS to work without extra plugin configuration.
// `rejectUnauthorized: false` (set below in serverConfig) bypasses the
// self-signed cert check — Alap gates that option on isLocalhost(host),
// so it can't accidentally apply to a remote host.
const DEFAULT_REST_PORT = 27124;
const DEFAULT_REST_SCHEME = 'https';
const DEFAULT_VAULT_NAME = 'AlapDocs';

const PORT = Number(process.env.PORT) || DEFAULT_PORT;
const REST_HOST = process.env.ALAP_OBSIDIAN_REST_HOST || DEFAULT_REST_HOST;
const REST_PORT = Number(process.env.ALAP_OBSIDIAN_REST_PORT) || DEFAULT_REST_PORT;
const REST_SCHEME = process.env.ALAP_OBSIDIAN_REST_SCHEME || DEFAULT_REST_SCHEME;
const REST_KEY = process.env.ALAP_OBSIDIAN_REST_KEY;
const VAULT_NAME = process.env.ALAP_OBSIDIAN_VAULT_NAME || DEFAULT_VAULT_NAME;

const IIFE_PATH = join(REPO_ROOT, 'dist', 'alap.iife.js');
const LIGHTBOX_CSS_PATH = join(REPO_ROOT, 'dist', 'lightbox.css');
const LENS_CSS_PATH = join(REPO_ROOT, 'dist', 'lens.css');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
};

// Vault attachments — proxied through the plugin's `/vault/{path}`.
// Type table mirrors the core example so wikilink images, audio, and
// video referenced inside notes resolve consistently across the two
// modes. Falls back to the upstream Content-Type for anything not listed.
const MEDIA_MIME = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.pdf': 'application/pdf',
};

const MEDIA_ROUTE = '/vault-media/';

// Obsidian's per-vault "Attachment folder path" setting. The Local
// REST API plugin's `/vault/{path}` endpoint requires an exact path —
// it doesn't replicate Obsidian's wikilink-resolution search through
// the attachment folder. So when a literal `/vault/<name>` lookup
// 404s, we retry once inside this folder before giving up.
//
// Each user picks their own value in Obsidian settings (Settings →
// Files & Links → Default location for new attachments → "In the
// folder specified below"). Common values: `Media`, `attachments`,
// `assets`, `_resources`. Override with ALAP_OBSIDIAN_ATTACHMENT_FOLDER.
// Set to an empty string to disable the fallback (only literal paths).
const DEFAULT_ATTACHMENT_FOLDER = 'Media';
const ATTACHMENT_FOLDER = process.env.ALAP_OBSIDIAN_ATTACHMENT_FOLDER ?? DEFAULT_ATTACHMENT_FOLDER;

const MAX_REQUEST_BYTES = 8_192;

// Loopback check matching the obsidian REST client's policy: this is the
// scope under which we trust `rejectUnauthorized: false` to bypass the
// plugin's self-signed cert. If REST_HOST has been pointed at anything
// non-loopback, we use the default verifying agent — same posture as the
// protocol's own restClient.ts.
const isLoopbackHost = (host) =>
  host === '127.0.0.1' || host === '::1' || host === 'localhost';

// undici Agent that skips cert verification for HTTPS-on-loopback. We
// reuse a single instance for connection pooling. Construction is gated
// below — only used when the active scheme/host warrant it.
const loopbackTlsAgent = new Agent({ connect: { rejectUnauthorized: false } });
const useTlsBypass = REST_SCHEME === 'https' && isLoopbackHost(REST_HOST);

// Construct the single AlapConfig used by the server. The generate handler
// reads protocol config from here on every invocation.
const serverConfig = {
  allLinks: {},
  protocols: {
    obsidian: {
      generate: obsidianHandler,
      vault: VAULT_NAME,
      rest: {
        host: REST_HOST,
        port: REST_PORT,
        scheme: REST_SCHEME,
        apiKey: REST_KEY,
        // HTTPS-on-loopback uses a self-signed cert; the obsidian REST
        // client gates this option on (scheme=https + isLocalhost) so
        // it can't accidentally be applied to a remote host.
        rejectUnauthorized: false,
        // Default allowedHosts already permits 127.0.0.1, ::1, and
        // localhost. Override here only if you're proxying to a non-
        // loopback Obsidian instance (uncommon).
      },
    },
  },
};

const readBody = (req) => new Promise((resolve, reject) => {
  let size = 0;
  const chunks = [];
  req.on('data', (chunk) => {
    size += chunk.length;
    if (size > MAX_REQUEST_BYTES) {
      reject(new Error('Request body too large'));
      req.destroy();
      return;
    }
    chunks.push(chunk);
  });
  req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  req.on('error', reject);
});

const handleQuery = async (req, res) => {
  let payload;
  try {
    const body = await readBody(req);
    payload = JSON.parse(body);
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid JSON' }));
    return;
  }

  const segments = Array.isArray(payload?.segments)
    ? payload.segments.filter((s) => typeof s === 'string')
    : null;
  if (!segments || segments.length === 0) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'segments[] required' }));
    return;
  }

  const links = await obsidianHandler(segments, serverConfig);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ links }));
};

const serveFile = async (res, absPath, contentType) => {
  try {
    const data = await readFile(absPath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
};

/**
 * One upstream fetch attempt against the plugin's `/vault/{path}`. Used
 * twice from `handleVaultMedia` — first against the literal path, then
 * (on 404) against the configured attachment folder.
 */
const fetchVaultPath = async (decoded) => {
  const upstreamPath = decoded.split('/').map(encodeURIComponent).join('/');
  const upstreamUrl = `${REST_SCHEME}://${REST_HOST}:${REST_PORT}/vault/${upstreamPath}`;
  return fetch(upstreamUrl, {
    headers: { Authorization: `Bearer ${REST_KEY}` },
    ...(useTlsBypass ? { dispatcher: loopbackTlsAgent } : {}),
  });
};

/**
 * Proxy a vault-relative attachment through the plugin's `/vault/{path}`
 * endpoint. The browser fetches `/vault-media/<encoded path>` from this
 * server (no auth required); this handler authenticates upstream with
 * the plugin's Bearer key and streams the binary back. Keeps the API
 * key off the wire to the browser.
 *
 * Path safety: we URL-decode once, reject absolute paths and `..`
 * segments, then re-encode each segment when constructing the upstream
 * URL. The plugin itself confines reads to the vault directory.
 *
 * Wikilink-resolution fallback: bare wikilinks like `![[Pasted image
 * 23.png]]` are author-side shorthand that Obsidian itself resolves by
 * searching the configured "Attachment folder path" (set per-vault
 * under Settings → Files & Links). The REST plugin's `/vault/{path}`
 * is path-literal — it doesn't replicate that search. So when the
 * literal lookup 404s and an attachment folder is configured, we
 * retry once inside it.
 */
const handleVaultMedia = async (req, res) => {
  const urlPath = (req.url || '/').split('?')[0];
  const requested = urlPath.slice(MEDIA_ROUTE.length);
  if (!requested) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
    return;
  }

  let decoded;
  try {
    decoded = decodeURIComponent(requested);
  } catch {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('Bad path');
    return;
  }

  if (decoded.startsWith('/') || decoded.split('/').includes('..')) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  try {
    let upstream = await fetchVaultPath(decoded);
    if (upstream.status === 404 && ATTACHMENT_FOLDER) {
      // Drain the failed body so the connection is reusable, then retry
      // inside the configured attachment folder.
      await upstream.body?.cancel();
      upstream = await fetchVaultPath(`${ATTACHMENT_FOLDER}/${decoded}`);
    }
    if (!upstream.ok) {
      res.writeHead(upstream.status, { 'Content-Type': 'text/plain' });
      res.end('Upstream not OK');
      return;
    }
    const ext = extname(decoded).toLowerCase();
    const upstreamType = upstream.headers.get('content-type');
    const type = MEDIA_MIME[ext] || upstreamType || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': type,
      'Cache-Control': 'private, max-age=60',
    });
    if (upstream.body) {
      const reader = upstream.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
    }
    res.end();
  } catch (err) {
    console.error('[obsidian-rest-example] media fetch error:', err);
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end('Upstream error');
  }
};

const routeStatic = async (req, res) => {
  const urlPath = (req.url || '/').split('?')[0];

  if (urlPath === '/alap.iife.js') {
    await serveFile(res, IIFE_PATH, MIME_TYPES['.js']);
    return;
  }

  if (urlPath === '/lightbox.css') {
    await serveFile(res, LIGHTBOX_CSS_PATH, MIME_TYPES['.css']);
    return;
  }

  if (urlPath === '/lens.css') {
    await serveFile(res, LENS_CSS_PATH, MIME_TYPES['.css']);
    return;
  }

  const pathname = urlPath === '/' ? '/index.html' : urlPath;

  // Only serve files from the example dir itself — no `..` escapes.
  const safePath = resolvePath(__dirname, pathname.replace(/^\/+/, ''));
  if (!safePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  const ext = extname(safePath);
  const type = MIME_TYPES[ext] || 'application/octet-stream';
  await serveFile(res, safePath, type);
};

const server = createServer(async (req, res) => {
  try {
    if (req.method === 'POST' && req.url === '/api/obsidian/query') {
      await handleQuery(req, res);
      return;
    }
    if (
      (req.method === 'GET' || req.method === 'HEAD')
      && (req.url || '').startsWith(MEDIA_ROUTE)
    ) {
      await handleVaultMedia(req, res);
      return;
    }
    if (req.method === 'GET' || req.method === 'HEAD') {
      await routeStatic(req, res);
      return;
    }
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    res.end('Method not allowed');
  } catch (err) {
    console.error('[obsidian-rest-example] server error:', err);
    res.writeHead(500);
    res.end('Server error');
  }
});

// Fail loud if prerequisites aren't met.
if (!REST_KEY) {
  console.error('[obsidian-rest-example] ALAP_OBSIDIAN_REST_KEY not set');
  console.error('                         set it to the API key from the');
  console.error('                         Obsidian Local REST API plugin settings');
  process.exit(1);
}

const iifeCheck = await stat(IIFE_PATH).catch(() => null);
if (!iifeCheck?.isFile()) {
  console.error(`[obsidian-rest-example] alap.iife.js not found at ${IIFE_PATH}`);
  console.error('                         run \`pnpm build\` from the repo root first');
  process.exit(1);
}

server.listen(PORT, () => {
  console.log(`Alap — Obsidian REST example   →  http://localhost:${PORT}`);
  console.log(`Plugin                         →  ${REST_SCHEME}://${REST_HOST}:${REST_PORT}`);
  console.log(`Vault display name             →  ${VAULT_NAME}`);
  console.log(
    `Wikilink attachment fallback   →  ${
      ATTACHMENT_FOLDER ? `"${ATTACHMENT_FOLDER}/" (override via ALAP_OBSIDIAN_ATTACHMENT_FOLDER)` : 'disabled'
    }`,
  );
});
