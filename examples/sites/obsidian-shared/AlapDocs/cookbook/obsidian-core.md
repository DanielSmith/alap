---
source: cookbook/obsidian-core.md
modified: '2026-04-23T01:27:44Z'
tags:
- cookbook
title: Obsidian — Core Mode
description: '**Cookbook › Obsidian:** Overview · Get a Vault · **Core Mode** · REST
  Setup · Hardening'
---
# Obsidian — Core Mode

**[[cookbook/README|Cookbook]] › Obsidian:** [[cookbook/obsidian-overview|Overview]] · [[cookbook/obsidian-vault|Get a Vault]] · **Core Mode** · [[cookbook/obsidian-rest-setup|REST Setup]] · [[cookbook/obsidian-hardening|Hardening]]

Core mode reads your vault directly from the filesystem. No Obsidian plugin required; works at build time or runtime; runs whether or not Obsidian is open. This is the usual starting point.

If you don't have a vault yet, see [[cookbook/obsidian-vault|Get a Vault]] first.

## 1. Build Alap once

The `alap/protocols/obsidian` subpath is Node-only and shipped as built JS — compile once after cloning:

```bash
cd /path/to/alap
pnpm install
pnpm build
```

You only need to repeat this if you change core library code.

## 2. Start from the example server

The minimal Core-mode server lives at [`examples/sites/obsidian/`](../../examples/sites/obsidian/). Copy it to a new directory you can edit:

```bash
cp -r examples/sites/obsidian ~/my-obsidian-site
cd ~/my-obsidian-site
```

The three files that matter:

| File | Role |
|------|------|
| `server.mjs` | Node HTTP server. Handles `/api/obsidian/query` (POST) and `/vault-media/*` (GET). |
| `config.mjs` | Browser-side Alap config — note the *absence* of any vault path. |
| `index.html` | Page with `.alap` triggers whose `data-alap-linkitems` use `:obsidian:core:...`. |

The server's `serverConfig` holds all the protocol *data* (cache TTLs, presets, vault paths). The handler itself is passed at engine construction. Look for the `protocols.obsidian` block in `server.mjs`:

```js
// config (data only)
protocols: {
  obsidian: {
    vault: VAULT_NAME,           // display name used in obsidian:// URIs
    vaultPath: VAULT_PATH,       // absolute path on disk — server-only
    searches: {
      meta:  { fields: 'title;tags' },
      daily: { fields: 'path' },
      small: { maxFiles: 20 },
    },
  },
},

// handler (behavior)
import { AlapEngine } from 'alap';
import { obsidianHandler } from 'alap/protocols/obsidian';
const engine = new AlapEngine(serverConfig, { handlers: { obsidian: obsidianHandler } });
```

## 3. Point it at your vault

The default example config uses a shipped demo vault generated from Alap's own docs. To use your own vault, set two env vars:

```bash
export ALAP_OBSIDIAN_VAULT=/Users/you/Vaults/myVault
export ALAP_OBSIDIAN_VAULT_NAME=MyVault
```

`ALAP_OBSIDIAN_VAULT_NAME` is only used inside the generated `obsidian://open?vault=NAME&file=PATH` URIs — it must match a vault your Obsidian app knows about, otherwise clicking a link does nothing. You can find the name in Obsidian's vault-switcher dropdown (top-left of the app).

## 4. Run it

```bash
./serve.sh
```

Then open http://localhost:9178/.

The page shows several `.alap` triggers. Clicking one opens a menu populated from your vault — titles and tags from frontmatter, thumbnails resolved from `cover:` / `image:` frontmatter or the first wikilink image in the body. Each item's URL is `obsidian://open?vault=MyVault&file=path/to/note.md`; clicking hands that off to your OS, which opens Obsidian to the note.

## 5. Writing queries

The query format is `:obsidian:core:<text>:<key=value>:...`. Examples you can drop into `data-alap-linkitems`:

```
:obsidian:core:bridges:              notes mentioning "bridges" anywhere
:obsidian:core::                     list every note (empty query = no filter)
:obsidian:core:crossing:fields=body: substring-match body only
:obsidian:core:music:$meta:          $meta preset → fields=title;tags
:obsidian:core::$small:              cap to 20 files via the $small preset
```

`$preset` names come from `protocols.obsidian.searches` in the server config. The preset is a named set of key/values; the segment `:obsidian:core:query:$small:` expands to `:obsidian:core:query:maxFiles=20:`. Later segments win over earlier ones, so an inline `fields=body` overrides a preset's `fields=title`.

The searchable fields are `title`, `tags`, `body`, `path`. Default is all four. Narrow with `fields=title;tags` (semicolon-separated because `,` is reserved at the expression level).

## Inline tags and tag aliases

Two features that make tagged-note workflows more ergonomic. Both apply to Core *and* [[cookbook/obsidian-rest-setup|REST]] — consumers get the same emitted tags regardless of sub-mode.

### Inline body tags

Obsidian users tag primarily in the note body (`This is about #techno and #ambient.`), not just frontmatter. Alap picks these up.

For every note the handler loads, it scans the body for `#tag` tokens and stores them as `note.inlineTags`. Both Core and REST modes surface them identically.

Rules the scanner applies:

- `#` must start a line or be preceded by whitespace (URL fragments and wikilink section refs like `[[note#heading]]` don't match).
- First char after `#` must be a letter or `_` — rejects `#123`, `#-foo`, headings like `# Title`.
- Tag body can contain letters, digits, `_`, `-`, `/` — preserved whole (nested tags like `#work/project/q2` stay intact).
- Tags inside fenced code blocks (``` ``` ```) or inline code (`` `…` ``) are skipped.
- Capped at 500 tags per note.

Inline tags participate in the `fields=tags` narrow the same way frontmatter tags do:

```
:obsidian:core:techno:fields=tags:
```

…matches notes with either `tags: [techno]` in frontmatter or `#techno` in the body.

### Tag aliases

Alap expressions use `.className`-style tag atoms with the shape `[A-Za-z_]\w*`. Obsidian tags can legally contain `-` and `/`. `#this-tag` and `#work/project` are valid in Obsidian but unreachable by `.class` atoms in Alap.

`protocols.obsidian.tagAliases` bridges the gap. Declare Alap-safe handles mapped to raw Obsidian tag strings:

```js
protocols: {
  obsidian: {
    // … other config …
    tagAliases: {
      thisDashTag:  'this-tag',        // .thisDashTag  → matches #this-tag
      work_project: 'work/project',    // .work_project → matches #work/project
      q2_planning:  'work/project/q2', // deep nesting, flat handle
      techno:       '#techno',         // leading '#' accepted and stripped
    },
  },
}
```

It works **symmetrically** — on the way out and on the way in:

- **Emit side.** When a note is tagged `#work/project`, the emitted `AlapLink.tags` contains `'work_project'` (the handle) instead of the raw `'work/project'`. Now `.work_project` in any Alap expression can match it.
- **Match side.** When you query `:obsidian:core:work_project:fields=tags:`, the matcher recognises `work_project` as a declared handle and also tries `work/project` against the tag pool. So the handle works both in emitted links and in query segments.

Rules:

- **Key shape:** must match `[A-Za-z_]\w*` (same as a `.className` atom). Invalid keys warn and are skipped.
- **Value shape:** valid Obsidian tag body (leading `#` accepted and stripped; `[A-Za-z_][\w/-]*`). Invalid values warn and are skipped.
- **Selective override.** Tags without an alias entry fall through verbatim. An unaliased `#freetext` stays `'freetext'` on emission. The alias map is a selective bridge, not a required translation table.
- **Tie-break.** If two handles map to the same raw tag (`{ one: 'x', two: 'x' }`), both work as match atoms but reverse-rewrite picks the first declared. Don't do this on purpose.
- **Forward alias is exact-key only.** `work_proj` (prefix of `work_project`) does **not** alias-expand. Keeps the map from leaking into surprising substring matches.

## Core-specific troubleshooting

See [[cookbook/obsidian-overview#general-troubleshooting|Overview — General troubleshooting]] for issues that apply to both modes (module not found, vault name mismatch, images not loading).

### The menu is empty

Order of things to check:

1. **Is the vault path right?** `ls "$ALAP_OBSIDIAN_VAULT"` from the same shell you start the server in.
2. **Any `.md` files?** `find "$ALAP_OBSIDIAN_VAULT" -name '*.md' | head`. If empty, the walker has nothing to return.
3. **Is something in the ignore list?** The default ignore hides `.obsidian/`, `.trash/`, `node_modules/`. Your notes aren't in one of those, right?

## Next

→ [[cookbook/obsidian-rest-setup|REST Setup]] if you also want fuzzy search via the Local REST API plugin.
→ [[cookbook/obsidian-hardening|Hardening]] if you're shipping this past a personal dev box.
