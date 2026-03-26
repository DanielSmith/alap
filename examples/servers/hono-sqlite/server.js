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

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from '@hono/node-server/serve-static';
import { serve } from '@hono/node-server';
import Database from 'better-sqlite3';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { validateRegex } from '../shared/validate-regex.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = resolve(__dirname, 'alap.db');
const PORT = process.env.PORT || 3000;

// --- Hyphen-in-identifiers warning ---

const warnHyphens = (config) => {
  const check = (section, keys) => {
    for (const key of keys) {
      if (key.includes('-')) {
        console.warn(`[alap] ${section} key "${key}" contains a hyphen — use underscores. "-" is the WITHOUT operator.`);
      }
    }
  };
  if (config.allLinks) check('allLinks', Object.keys(config.allLinks));
  if (config.macros) check('macros', Object.keys(config.macros));
  if (config.searchPatterns) check('searchPatterns', Object.keys(config.searchPatterns));
};

// --- Database setup ---

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS configs (
    name       TEXT PRIMARY KEY,
    config     TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

// Prepared statements
const stmts = {
  list:   db.prepare('SELECT name FROM configs ORDER BY name'),
  get:    db.prepare('SELECT config, created_at, updated_at FROM configs WHERE name = ?'),
  upsert: db.prepare(`
    INSERT INTO configs (name, config, created_at, updated_at)
    VALUES (?, ?, datetime('now'), datetime('now'))
    ON CONFLICT(name) DO UPDATE SET
      config = excluded.config,
      updated_at = datetime('now')
  `),
  remove: db.prepare('DELETE FROM configs WHERE name = ?'),
};

// --- Hono app ---

const app = new Hono();
app.use('*', cors());

// GET /configs — list all config names
app.get('/configs', (c) => {
  const rows = stmts.list.all();
  return c.json(rows.map(r => r.name));
});

// GET /configs/:name — load a config entry
app.get('/configs/:name', (c) => {
  const row = stmts.get.get(c.req.param('name'));
  if (!row) return c.json({ error: 'Not found' }, 404);

  return c.json({
    config: JSON.parse(row.config),
    meta: {
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    },
  });
});

// PUT /configs/:name — save (create or update) a config
app.put('/configs/:name', async (c) => {
  const config = await c.req.json();
  if (!config || typeof config !== 'object') {
    return c.json({ error: 'Request body must be a JSON object' }, 400);
  }

  warnHyphens(config);
  stmts.upsert.run(c.req.param('name'), JSON.stringify(config));
  return c.body(null, 204);
});

// DELETE /configs/:name — remove a config
app.delete('/configs/:name', (c) => {
  stmts.remove.run(c.req.param('name'));
  return c.body(null, 204);
});

// GET /search — search across all configs
//
// Query params:
//   tag       — match links with this tag
//   q         — match links where label, url, or description contains this text
//   regex     — match links where fields match this regex
//   fields    — comma-separated field list: label, url, tags, description, id (default: all)
//   config    — only search configs matching this regex pattern
//   limit     — max results (default: 100)
app.get('/search', (c) => {
  const tag = c.req.query('tag');
  const q = c.req.query('q');
  const regex = c.req.query('regex');
  const fields = c.req.query('fields');
  const configPattern = c.req.query('config');
  const limitStr = c.req.query('limit');
  const maxResults = Math.min(parseInt(limitStr) || 100, 1000);

  // Build field set
  const searchFields = fields
    ? String(fields).split(',').map(f => f.trim())
    : ['label', 'url', 'tags', 'description', 'id'];

  // Build matcher
  let matcher;
  if (tag) {
    matcher = (_id, link) => Array.isArray(link.tags) && link.tags.includes(tag);
  } else if (q) {
    const term = String(q).toLowerCase();
    matcher = (id, link) => {
      if (searchFields.includes('label') && link.label?.toLowerCase().includes(term)) return true;
      if (searchFields.includes('url') && link.url?.toLowerCase().includes(term)) return true;
      if (searchFields.includes('description') && link.description?.toLowerCase().includes(term)) return true;
      if (searchFields.includes('id') && id.toLowerCase().includes(term)) return true;
      if (searchFields.includes('tags') && Array.isArray(link.tags) && link.tags.some(t => t.toLowerCase().includes(term))) return true;
      return false;
    };
  } else if (regex) {
    const regexStr = String(regex);
    const check = validateRegex(regexStr);
    if (!check.safe) return c.json({ error: `Invalid regex: ${check.reason}` }, 400);
    let re;
    try { re = new RegExp(regexStr, 'i'); } catch { return c.json({ error: 'Invalid regex' }, 400); }
    matcher = (id, link) => {
      if (searchFields.includes('label') && re.test(link.label || '')) return true;
      if (searchFields.includes('url') && re.test(link.url || '')) return true;
      if (searchFields.includes('description') && re.test(link.description || '')) return true;
      if (searchFields.includes('id') && re.test(id)) return true;
      if (searchFields.includes('tags') && Array.isArray(link.tags) && link.tags.some(t => re.test(t))) return true;
      return false;
    };
  } else {
    return c.json({ error: 'Provide at least one of: tag, q, regex' }, 400);
  }

  // Filter configs
  let configRe = null;
  if (configPattern) {
    const configCheck = validateRegex(String(configPattern));
    if (!configCheck.safe) return c.json({ error: `Invalid config pattern: ${configCheck.reason}` }, 400);
    configRe = new RegExp(String(configPattern), 'i');
  }
  const rows = stmts.list.all();
  const results = [];
  let configsSearched = 0;
  let linksScanned = 0;

  for (const { name } of rows) {
    if (configRe && !configRe.test(name)) continue;
    configsSearched++;

    const row = stmts.get.get(name);
    if (!row) continue;

    const config = JSON.parse(row.config);
    if (!config.allLinks) continue;

    for (const [id, link] of Object.entries(config.allLinks)) {
      linksScanned++;
      if (matcher(id, link)) {
        results.push({ configName: name, id, link });
        if (results.length >= maxResults) break;
      }
    }
    if (results.length >= maxResults) break;
  }

  return c.json({ results, configsSearched, linksScanned });
});

// POST /cherry-pick — resolve an expression against a config and return a subset
//
// Body: { source: "configName", expression: ".coffee + .nyc" }
// Returns: { allLinks: { ... } } — a minimal AlapConfig with only matching links
app.post('/cherry-pick', async (c) => {
  const { source, expression } = await c.req.json();
  if (!source || !expression) {
    return c.json({ error: 'Provide "source" (config name) and "expression"' }, 400);
  }

  const row = stmts.get.get(source);
  if (!row) return c.json({ error: `Config "${source}" not found` }, 404);

  const config = JSON.parse(row.config);

  let AlapEngine, sanitizeUrl;
  try {
    ({ AlapEngine, sanitizeUrl } = await import('alap/core'));
  } catch {
    return c.json({ error: 'Run "pnpm build" from the repo root first — cherry-pick requires alap/core' }, 501);
  }

  const engine = new AlapEngine(config);
  const links = engine.resolve(expression);

  const allLinks = {};
  for (const { id, ...rest } of links) {
    allLinks[id] = { ...rest, url: sanitizeUrl(rest.url) };
  }

  return c.json({ allLinks });
});

// POST /query — server-side expression resolution
//
// Body: { expression: ".coffee + .nyc", configName?: "demo", configs?: ["demo", "other"] }
// If configs is provided, configs are merged before resolving.
// If configName is provided, that single config is used.
// Returns: { results: [{ id, label, url, tags, ... }] }
app.post('/query', async (c) => {
  const { expression, configName, configs: configNames } = await c.req.json();
  if (!expression) {
    return c.json({ error: 'Provide "expression"' }, 400);
  }

  let AlapEngine, mergeConfigs, sanitizeUrl;
  try {
    ({ AlapEngine, mergeConfigs, sanitizeUrl } = await import('alap/core'));
  } catch {
    return c.json({ error: 'Run "pnpm build" from the repo root first — query requires alap/core' }, 501);
  }

  // Load and optionally merge configs
  let config;
  if (configNames && Array.isArray(configNames)) {
    const loaded = configNames
      .map(name => stmts.get.get(name))
      .filter(Boolean)
      .map(row => JSON.parse(row.config));

    if (loaded.length === 0) {
      return c.json({ error: 'None of the requested configs were found' }, 404);
    }
    config = mergeConfigs(...loaded);
  } else {
    const name = configName || 'demo';
    const row = stmts.get.get(name);
    if (!row) return c.json({ error: `Config "${name}" not found` }, 404);
    config = JSON.parse(row.config);
  }

  const engine = new AlapEngine(config);
  const results = engine.resolve(expression).map(link => ({
    ...link, url: sanitizeUrl(link.url),
  }));

  return c.json({ results });
});

// Serve static files from public/
app.use('/*', serveStatic({ root: './public' }));

// --- Start ---

serve({ fetch: app.fetch, port: Number(PORT) }, (info) => {
  console.log(`Alap config server running at http://localhost:${info.port}`);
  console.log(`Database: ${DB_PATH}`);
});
