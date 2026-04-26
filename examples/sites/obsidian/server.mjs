/**
 * Copyright 2026 Daniel Smith — Apache 2.0
 *
 * Minimum Node server for the :obsidian:core: example.
 *
 * Serves the static page plus a single POST endpoint that resolves
 * `:obsidian:` expressions against a real vault on disk. The browser
 * never sees the vault path — it just posts segments and receives
 * AlapLink JSON.
 *
 * Prerequisite: run `pnpm build` from the repo root so that
 * `alap/protocols/obsidian` resolves to built JS.
 *
 * Environment:
 *   PORT                   — default 9178
 *   ALAP_OBSIDIAN_VAULT    — absolute path to the vault (default: /example/path/ExampleVault)
 *   ALAP_OBSIDIAN_VAULT_NAME — display name used in obsidian:// URIs
 */

import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { readFile, realpath, stat } from 'node:fs/promises';
import { dirname, extname, join, resolve as resolvePath, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { obsidianHandler } from 'alap/protocols/obsidian';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolvePath(__dirname, '../../..');

const DEFAULT_PORT = 9178;
// The generated demo vault lives at `../obsidian-shared/AlapDocs/`
// so the filesystem-mode site here and the REST-mode site next door
// can both point at the same content. The directory name doubles as
// the Obsidian vault name — opening it in Obsidian without renaming
// gives you a vault called "AlapDocs", which matches the
// obsidian://open?vault=AlapDocs URIs this server emits.
// `pnpm -w run vault:docs` populates the alap-docs portion;
// `pnpm -w run vault:demo` populates the topical-source portion.
// Users who want to point at their own vault override via
// ALAP_OBSIDIAN_VAULT.
const DEFAULT_VAULT_PATH = join(__dirname, '..', 'obsidian-shared', 'AlapDocs');
const DEFAULT_VAULT_NAME = 'AlapDocs';

const PORT = Number(process.env.PORT) || DEFAULT_PORT;
const VAULT_PATH = process.env.ALAP_OBSIDIAN_VAULT || DEFAULT_VAULT_PATH;
const VAULT_NAME = process.env.ALAP_OBSIDIAN_VAULT_NAME || DEFAULT_VAULT_NAME;

const IIFE_PATH = join(REPO_ROOT, 'dist', 'alap.iife.js');
const LIGHTBOX_CSS_PATH = join(REPO_ROOT, 'dist', 'lightbox.css');
const LENS_CSS_PATH = join(REPO_ROOT, 'dist', 'lens.css');

const MEDIA_ROUTE = '/vault-media/';

// Obsidian's default attachment folder for wikilink images. If the
// literal URL-decoded path isn't in the vault root, we retry inside
// this folder before giving up.
const VAULT_ATTACHMENT_FALLBACK = 'Media';

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

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
};

const MAX_REQUEST_BYTES = 8_192;

// Construct the single AlapConfig used by the server. The generate handler
// reads protocol config from here on every invocation.
const serverConfig = {
  allLinks: {},
  protocols: {
    obsidian: {
      generate: obsidianHandler,
      vault: VAULT_NAME,
      vaultPath: VAULT_PATH,

      // Named presets referenced from expressions via `$name`. Keeps
      // query strings short and readable in HTML. `$` (not `@`) because
      // `@` is taken by expression-level macros.
      searches: {
        meta:  { fields: 'title;tags' },
        daily: { fields: 'path' },
        small: { maxFiles: 20 },
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
 * Resolve a requested vault-media path to an absolute file on disk inside
 * `VAULT_PATH`. Tries the literal decoded path first; falls back to
 * `${VAULT_ATTACHMENT_FALLBACK}/<basename>` to match Obsidian's wikilink
 * resolution convention. Returns null on miss or any escape attempt.
 */
const resolveVaultMediaPath = async (rawPathname) => {
  let decoded;
  try {
    decoded = decodeURIComponent(rawPathname);
  } catch {
    return null;
  }

  // Reject absolute paths or explicit `..` segments before touching fs.
  if (decoded.startsWith('/') || decoded.split('/').includes('..')) return null;

  const candidates = [
    resolvePath(VAULT_PATH, decoded),
    resolvePath(VAULT_PATH, VAULT_ATTACHMENT_FALLBACK, decoded),
  ];

  for (const candidate of candidates) {
    let real;
    try {
      real = await realpath(candidate);
    } catch {
      continue;
    }
    const realVault = await realpath(VAULT_PATH).catch(() => null);
    if (!realVault) return null;
    if (real !== realVault && !real.startsWith(realVault + sep)) continue;
    const s = await stat(real).catch(() => null);
    if (s?.isFile()) return real;
  }
  return null;
};

const handleVaultMedia = async (req, res) => {
  const urlPath = (req.url || '/').split('?')[0];
  const requested = urlPath.slice(MEDIA_ROUTE.length);
  if (!requested) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  const absPath = await resolveVaultMediaPath(requested);
  if (!absPath) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
    return;
  }

  const ext = extname(absPath).toLowerCase();
  const type = MEDIA_MIME[ext] || 'application/octet-stream';
  res.writeHead(200, {
    'Content-Type': type,
    'Cache-Control': 'private, max-age=60',
  });
  createReadStream(absPath).pipe(res);
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
    if ((req.method === 'GET' || req.method === 'HEAD') && (req.url || '').startsWith(MEDIA_ROUTE)) {
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
    console.error('[obsidian-example] server error:', err);
    res.writeHead(500);
    res.end('Server error');
  }
});

// Fail loudly if prerequisites aren't met.
const vaultCheck = await stat(VAULT_PATH).catch(() => null);
if (!vaultCheck?.isDirectory()) {
  console.error(`[obsidian-example] vault not found: ${VAULT_PATH}`);
  console.error('                    set ALAP_OBSIDIAN_VAULT to an existing directory');
  process.exit(1);
}
const iifeCheck = await stat(IIFE_PATH).catch(() => null);
if (!iifeCheck?.isFile()) {
  console.error(`[obsidian-example] alap.iife.js not found at ${IIFE_PATH}`);
  console.error('                    run `pnpm build` from the repo root first');
  process.exit(1);
}

server.listen(PORT, () => {
  console.log(`Alap — Obsidian example   →  http://localhost:${PORT}`);
  console.log(`Vault                     →  ${VAULT_PATH}  (${VAULT_NAME})`);
});
