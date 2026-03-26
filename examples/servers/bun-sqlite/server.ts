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

import { Database } from "bun:sqlite";
import { join } from "path";
import { validateRegex } from "../shared/validate-regex.js";

const DB_PATH = join(import.meta.dir, "alap.db");
const PORT = parseInt(Bun.env.PORT ?? "3000");

// --- Database setup ---

const db = new Database(DB_PATH);
db.exec("PRAGMA journal_mode = WAL");
db.exec(`
  CREATE TABLE IF NOT EXISTS configs (
    name       TEXT PRIMARY KEY,
    config     TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

const stmts = {
  list:   db.prepare("SELECT name FROM configs ORDER BY name"),
  get:    db.prepare("SELECT config, created_at, updated_at FROM configs WHERE name = ?"),
  upsert: db.prepare(`
    INSERT INTO configs (name, config, created_at, updated_at)
    VALUES (?, ?, datetime('now'), datetime('now'))
    ON CONFLICT(name) DO UPDATE SET
      config = excluded.config,
      updated_at = datetime('now')
  `),
  remove: db.prepare("DELETE FROM configs WHERE name = ?"),
};

// --- Hyphen-in-identifiers warning ---

const warnHyphens = (config: Record<string, any>) => {
  const check = (section: string, keys: string[]) => {
    for (const key of keys) {
      if (key.includes("-")) {
        console.warn(`[alap] ${section} key "${key}" contains a hyphen — use underscores. "-" is the WITHOUT operator.`);
      }
    }
  };
  if (config.allLinks) check("allLinks", Object.keys(config.allLinks));
  if (config.macros) check("macros", Object.keys(config.macros));
  if (config.searchPatterns) check("searchPatterns", Object.keys(config.searchPatterns));
};

// --- Helpers ---

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function noContent(): Response {
  return new Response(null, { status: 204 });
}

function notFound(msg: string): Response {
  return json({ error: msg }, 404);
}

function badRequest(msg: string): Response {
  return json({ error: msg }, 400);
}

// --- Router ---

const server = Bun.serve({
  port: PORT,

  async fetch(req) {
    const url = new URL(req.url);
    const { pathname } = url;
    const method = req.method;

    // CORS headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, PUT, DELETE, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    if (method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    let response: Response;

    // --- Static files (serve everything in public/) ---
    if (method === "GET") {
      const filePath = pathname === "/" ? "/index.html" : pathname;
      const file = Bun.file(join(import.meta.dir, "public" + filePath));
      if (await file.exists()) return new Response(file);
    }

    // --- GET /configs ---
    if (method === "GET" && pathname === "/configs") {
      const rows = stmts.list.all() as { name: string }[];
      response = json(rows.map(r => r.name));
    }

    // --- GET /configs/:name ---
    else if (method === "GET" && pathname.startsWith("/configs/")) {
      const name = decodeURIComponent(pathname.slice("/configs/".length));
      const row = stmts.get.get(name) as { config: string; created_at: string; updated_at: string } | null;
      if (!row) {
        response = notFound("Not found");
      } else {
        response = json({
          config: JSON.parse(row.config),
          meta: { createdAt: row.created_at, updatedAt: row.updated_at },
        });
      }
    }

    // --- PUT /configs/:name ---
    else if (method === "PUT" && pathname.startsWith("/configs/")) {
      const name = decodeURIComponent(pathname.slice("/configs/".length));
      const body = await req.json().catch(() => null);
      if (!body || typeof body !== "object") {
        response = badRequest("Request body must be a JSON object");
      } else {
        warnHyphens(body as Record<string, any>);
        stmts.upsert.run(name, JSON.stringify(body));
        response = noContent();
      }
    }

    // --- DELETE /configs/:name ---
    else if (method === "DELETE" && pathname.startsWith("/configs/")) {
      const name = decodeURIComponent(pathname.slice("/configs/".length));
      stmts.remove.run(name);
      response = noContent();
    }

    // --- GET /search ---
    else if (method === "GET" && pathname === "/search") {
      response = handleSearch(url.searchParams);
    }

    // --- POST /cherry-pick ---
    else if (method === "POST" && pathname === "/cherry-pick") {
      const body = await req.json().catch(() => null);
      response = await handleCherryPick(body);
    }

    // --- POST /query ---
    else if (method === "POST" && pathname === "/query") {
      const body = await req.json().catch(() => null);
      response = await handleQuery(body);
    }

    // --- 404 ---
    else {
      response = notFound("Not found");
    }

    // Apply CORS headers to all responses
    for (const [key, value] of Object.entries(corsHeaders)) {
      response.headers.set(key, value);
    }
    return response;
  },
});

// --- Search ---

function handleSearch(params: URLSearchParams): Response {
  const tag = params.get("tag");
  const q = params.get("q");
  const regex = params.get("regex");
  const fields = params.get("fields");
  const configPattern = params.get("config");
  const maxResults = Math.min(parseInt(params.get("limit") ?? "100") || 100, 1000);

  const searchFields = fields
    ? fields.split(",").map(f => f.trim())
    : ["label", "url", "tags", "description", "id"];

  let matcher: (id: string, link: any) => boolean;

  if (tag) {
    matcher = (_id, link) => Array.isArray(link.tags) && link.tags.includes(tag);
  } else if (q) {
    const term = q.toLowerCase();
    matcher = (id, link) => {
      if (searchFields.includes("label") && link.label?.toLowerCase().includes(term)) return true;
      if (searchFields.includes("url") && link.url?.toLowerCase().includes(term)) return true;
      if (searchFields.includes("description") && link.description?.toLowerCase().includes(term)) return true;
      if (searchFields.includes("id") && id.toLowerCase().includes(term)) return true;
      if (searchFields.includes("tags") && Array.isArray(link.tags) && link.tags.some((t: string) => t.toLowerCase().includes(term))) return true;
      return false;
    };
  } else if (regex) {
    const check = validateRegex(regex);
    if (!check.safe) return badRequest(`Invalid regex: ${check.reason}`);
    let re: RegExp;
    try { re = new RegExp(regex, "i"); } catch { return badRequest("Invalid regex"); }
    matcher = (id, link) => {
      if (searchFields.includes("label") && re.test(link.label || "")) return true;
      if (searchFields.includes("url") && re.test(link.url || "")) return true;
      if (searchFields.includes("description") && re.test(link.description || "")) return true;
      if (searchFields.includes("id") && re.test(id)) return true;
      if (searchFields.includes("tags") && Array.isArray(link.tags) && link.tags.some((t: string) => re.test(t))) return true;
      return false;
    };
  } else {
    return badRequest("Provide at least one of: tag, q, regex");
  }

  let configRe: RegExp | null = null;
  if (configPattern) {
    const configCheck = validateRegex(configPattern);
    if (!configCheck.safe) return badRequest(`Invalid config pattern: ${configCheck.reason}`);
    configRe = new RegExp(configPattern, "i");
  }
  const rows = stmts.list.all() as { name: string }[];
  const results: { configName: string; id: string; link: any }[] = [];
  let configsSearched = 0;
  let linksScanned = 0;

  for (const { name } of rows) {
    if (configRe && !configRe.test(name)) continue;
    configsSearched++;

    const row = stmts.get.get(name) as { config: string } | null;
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

  return json({ results, configsSearched, linksScanned });
}

// --- Cherry-Pick ---

async function handleCherryPick(body: any): Promise<Response> {
  if (!body?.source || !body?.expression) {
    return badRequest('Provide "source" (config name) and "expression"');
  }

  const row = stmts.get.get(body.source) as { config: string } | null;
  if (!row) return notFound(`Config "${body.source}" not found`);

  const config = JSON.parse(row.config);

  let AlapEngine: any, sanitizeUrl: any;
  try {
    ({ AlapEngine, sanitizeUrl } = await import("alap/core"));
  } catch {
    return json({ error: 'Run "pnpm build" from the repo root first — cherry-pick requires alap/core' }, 501);
  }

  const engine = new AlapEngine(config);
  const links = engine.resolve(body.expression);

  const allLinks: Record<string, any> = {};
  for (const { id, ...rest } of links) {
    allLinks[id] = { ...rest, url: sanitizeUrl(rest.url) };
  }

  return json({ allLinks });
}

// --- Query ---

async function handleQuery(body: any): Promise<Response> {
  if (!body?.expression) {
    return badRequest('Provide "expression"');
  }

  let AlapEngine: any, mergeConfigs: any, sanitizeUrl: any;
  try {
    ({ AlapEngine, mergeConfigs, sanitizeUrl } = await import("alap/core"));
  } catch {
    return json({ error: 'Run "pnpm build" from the repo root first — query requires alap/core' }, 501);
  }

  let config;
  if (body.configs && Array.isArray(body.configs)) {
    const loaded = body.configs
      .map((name: string) => stmts.get.get(name) as { config: string } | null)
      .filter(Boolean)
      .map((row: any) => JSON.parse(row.config));

    if (loaded.length === 0) {
      return notFound("None of the requested configs were found");
    }
    config = mergeConfigs(...loaded);
  } else {
    const name = body.configName || "demo";
    const row = stmts.get.get(name) as { config: string } | null;
    if (!row) return notFound(`Config "${name}" not found`);
    config = JSON.parse(row.config);
  }

  const engine = new AlapEngine(config);
  const results = engine.resolve(body.expression).map((link: any) => ({
    ...link, url: sanitizeUrl(link.url),
  }));

  return json({ results });
}

console.log(`Alap config server (Bun) running at http://localhost:${server.port}`);
console.log(`Database: ${DB_PATH}`);
