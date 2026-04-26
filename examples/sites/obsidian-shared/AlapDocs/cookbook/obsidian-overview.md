---
source: cookbook/obsidian-overview.md
modified: '2026-04-25T23:49:06Z'
tags:
- cookbook
title: Obsidian (`:obsidian:`) — Overview
description: '**Cookbook › Obsidian:** **Overview** · Get a Vault · Core Mode · REST
  Setup · Hardening'
---
# Obsidian (`:obsidian:`) — Overview

**[[cookbook/README|Cookbook]] › Obsidian:** **Overview** · [[cookbook/obsidian-vault|Get a Vault]] · [[cookbook/obsidian-core|Core Mode]] · [[cookbook/obsidian-rest-setup|REST Setup]] · [[cookbook/obsidian-hardening|Hardening]]

A complete walkthrough for wiring an Obsidian vault to Alap: content in, live menus out, with security-aware defaults. No prior Obsidian-plugin or self-signed-TLS experience assumed.

> Alap is a single-maintainer open source project that hasn't been through a third-party audit. Please do your own due diligence — especially when wiring up protocols on servers with local network access. See the [[cookbook/obsidian-hardening|Hardening]] chapter for the server-side checklist.

This guide is a small sub-cookbook split into five chapters. Start here.

## What you're building

```
┌────────────┐    POST     ┌──────────────┐     fs / REST       ┌────────────┐
│  browser   │◄──JSON──────┤  Node server ├─────────────────────┤  your vault│
│  page with │             │  (Alap host) │  core: readFile     │  ~/Vaults/…│
│  .alap     │             │              │  rest: HTTPS + key  │            │
│  anchors   │             │              │                     │            │
└────────────┘             └──────────────┘                     └────────────┘
     │                            │                                    │
     │     anchors carry          │   :obsidian:core:  → filesystem    │
     │   :obsidian:core:q: or     │   :obsidian:rest:  → Local REST    │
     │   :obsidian:rest:q:        │                      API plugin    │
     │                            │                                    │
     └─ never sees vault path ────┴─ resolves queries, returns links ──┘
```

The browser never sees your vault path or API key. Everything filesystem-adjacent lives on the Node server.

## The five chapters

1. **This page** — what the functionality consists of, Core vs REST, config reference, general troubleshooting
2. **[[cookbook/obsidian-vault|Get a Vault]]** — already have one · convert markdown · convert Hugo/Jekyll/MkDocs/Docusaurus · convert RSS/Atom
3. **[[cookbook/obsidian-core|Core Mode]]** — zero plugin, filesystem only; inline tags; tag aliases; core troubleshooting
4. **[[cookbook/obsidian-rest-setup|REST Setup]]** — Local REST API plugin install · API key · self-signed cert · REST troubleshooting
5. **[[cookbook/obsidian-hardening|Hardening]]** — library safeguards · six-defense server checklist · auditing an install

## Prerequisites

- **Obsidian** — install from [obsidian.md](https://obsidian.md). Free for personal use.
- **Node 18+** and **pnpm** — `corepack enable && corepack prepare pnpm@latest --activate` on a fresh machine.
- **Python 3.9+** — only if you're converting content ([[cookbook/obsidian-vault|Get a Vault]] paths B–D). Included on macOS and every Linux distro.
- **An Alap clone** — `git clone https://github.com/DanielSmith2017/alap && cd alap && pnpm install`.

No Obsidian plugin is required for Core mode. REST mode needs one — walked through in [[cookbook/obsidian-rest-setup|REST Setup]].

## Core vs REST

Alap's `:obsidian:` protocol has two sub-modes. Both talk to the same vault. Different plumbing.

| | `:obsidian:core:` | `:obsidian:rest:` |
|---|---|---|
| **Moving parts** | Node server only | Node server + Obsidian + plugin running |
| **Search style** | Substring grep over frontmatter + body | Plugin's fuzzy search |
| **When Obsidian isn't running** | Still works | Returns `[]` |
| **Setup cost** | Zero config beyond vault path | Install plugin, enable, copy API key, pass key via env |
| **Best for** | SSG builds · static sites · servers where the vault is a file-system fixture | Interactive workflows where Obsidian is already open and you want fuzzy search |
| **Runs at** | Build time or runtime | Runtime only (Obsidian must be open) |

**Rule of thumb.** Start with Core. Add REST later if you want fuzzy search or you've specifically built a workflow around the plugin's live view of your open vault.

You can run both on the same server — keep `vaultPath` set for Core and add a `rest` block for REST; the sub-mode is picked per expression segment.

## Config reference

Every knob under `protocols.obsidian.*`.

### Shared (Core + REST)

| Key | Type | Default | Notes |
|-----|------|---------|-------|
| `generate` | function | — | Required. `obsidianHandler` from `alap/protocols/obsidian`. |
| `vault` | string | — | Display name for `obsidian://open?vault=…` URIs. Must match a vault Obsidian knows. |
| `vaultPath` | string | — | Absolute path to the vault on disk (Core mode). |
| `searches` | `Record<string, ObsidianSearchPreset>` | `{}` | Named presets referenced via `$name` in expressions. |
| `searchFields` | `'title'\|'tags'\|'body'\|'path'[]` | `['title','tags','body','path']` | Default field set when no `fields=` arg is given. |
| `linkTemplate` | string | `obsidian://open?vault={vault}&file={path}` | URI template for emitted links. Useful for Obsidian URL schemes other than `open`. |
| `thumbnailFields` | `string[]` | `['cover','image']` | Frontmatter keys to check for thumbnail images. |
| `mediaBaseUrl` | string\|null | null | Prefix for thumbnail URLs. Usually `/vault-media/`. |
| `tagAliases` | `Record<string,string>` | `{}` | Bridge Alap-safe handles to raw Obsidian tag strings. See [[cookbook/obsidian-core#tag-aliases|Core Mode — Tag aliases]]. |

### Core-mode only

| Key | Type | Default | Notes |
|-----|------|---------|-------|
| `globs` | `string[]` | `['**/*.md']` | Patterns included by the file walker. |
| `ignore` | `string[]` | merged with `.obsidian/**`, `.trash/**`, `node_modules/**`, `**/.DS_Store` | Additional ignore globs. |
| `maxFiles` | number | `MAX_FILESYSTEM_FILES` (500) | Cap on files walked per query. |

### REST-mode only (`rest.*`)

| Key | Type | Default | Notes |
|-----|------|---------|-------|
| `rest.apiKey` | string | `process.env.OBSIDIAN_API_KEY` | Prefer env. The library reads the env var automatically if the config field is omitted. |
| `rest.host` | string | `'127.0.0.1'` | Plugin host. Loopback recommended. |
| `rest.port` | number | `27124` | Plugin port. |
| `rest.scheme` | `'http'\|'https'` | `'https'` | Must be `https` unless the plugin is configured otherwise (not recommended). |
| `rest.allowedHosts` | `string[]` | `['127.0.0.1','::1','localhost']` | Host allowlist for the library's transport layer. |
| `rest.rejectUnauthorized` | boolean | `true` | TLS cert verification. `false` is honoured only on loopback. |
| `rest.timeoutMs` | number | `3000` | Per-request timeout. |

## General troubleshooting

Mode-specific troubleshooting lives with each mode chapter — see [[cookbook/obsidian-core#core-specific-troubleshooting|Core Mode]] and [[cookbook/obsidian-rest-setup#rest-specific-troubleshooting|REST Setup]]. This section collects issues that apply regardless of which sub-mode you're running.

### "Cannot find module 'alap/protocols/obsidian'"

You didn't build. From the repo root: `pnpm build`. Or you're running from a directory that doesn't have `alap` as a dependency — check the example's `package.json`.

### Clicking a menu item does nothing

The URL opens as `obsidian://open?vault=MyVault&file=path.md`. Two causes:

1. **Vault name mismatch.** The `vault` config value must match exactly what Obsidian calls the vault. Check the vault switcher in the Obsidian sidebar (top-left) — that's the name.
2. **OS URL handler not registered.** Fresh Obsidian installs register `obsidian://` on first launch. If it's not registered, re-opening Obsidian once fixes it on macOS and Windows; on Linux, check your `.desktop` file.

### Images in lens/lightbox don't load

Thumbnails are served from `/vault-media/` on the same server. Check:

1. The server has a `/vault-media/*` handler (the example server includes one).
2. `mediaBaseUrl` in config is set to `/vault-media/` or similar.
3. The frontmatter `cover:` or `image:` path is relative to the vault root (e.g., `attachments/cover.jpg`, not `/Users/you/.../cover.jpg`).
4. If the image lives in Obsidian's default attachment folder (`Media/`), the example server checks there as a fallback — matches Obsidian's own wikilink resolution.

### Is the handler even loaded?

Add `console.log('config', serverConfig)` at the top of `server.mjs`. You should see `protocols.obsidian.generate` as a function. If not, the handler import failed — re-run `pnpm build`, then check `package.json` has `alap` as a dependency.

## See also

- [[core-concepts/protocols#obsidiancore--search-a-local-obsidian-vault|Core Concepts — Protocols]]
- [examples/sites/obsidian/](../../examples/sites/obsidian/) — minimal Core-only reference
- [[security/threat-model|Threat model]] — orientation on what the library does, doesn't do, and assumes from integrators
- [[api-reference/security|Security reference]] — full per-feature security model
