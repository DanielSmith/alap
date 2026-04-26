---
source: cookbook/obsidian-vault.md
modified: '2026-04-25T16:25:35Z'
tags:
- cookbook
title: Obsidian — Get a Vault
description: '**Cookbook › Obsidian:** Overview · **Get a Vault** · Core Mode · REST
  Setup · Hardening'
---
# Obsidian — Get a Vault

**[[cookbook/README|Cookbook]] › Obsidian:** [[cookbook/obsidian-overview|Overview]] · **Get a Vault** · [[cookbook/obsidian-core|Core Mode]] · [[cookbook/obsidian-rest-setup|REST Setup]] · [[cookbook/obsidian-hardening|Hardening]]

Four starting points for getting notes into an Obsidian vault Alap can query. Pick whichever matches your situation.

## A. You already have an Obsidian vault

Skip to [[cookbook/obsidian-core|Core Mode]] or [[cookbook/obsidian-rest-setup|REST Setup]], depending on which sub-mode you want. Note the vault's absolute path on disk — you'll pass it to the server as `ALAP_OBSIDIAN_VAULT`.

On macOS the default vault lives somewhere like `~/Documents/MyVault/`. The "vault" is just the directory — Obsidian doesn't hide files elsewhere.

## B. You have loose markdown files

`scripts/vault_convert.py` turns a directory of ordinary markdown into an Obsidian-flavoured vault: YAML frontmatter, path-derived tags, wikilinks, mirrored media. Source is never modified — conversion always writes to a new destination.

```bash
# from the alap repo root
pnpm run vault:convert ~/writing/notes ~/Vaults/writing
```

What happens:

1. **Preview.** The script scans the source and prints counts — files, sizes, inferred tags, directory stats — then stops and asks `proceed? [y/N]`. Nothing is written until you confirm.
2. **Security banner.** Before the prompt, the CLI lists every active strict default (unsafe HTML stripped, Obsidian active-content blocks stripped, frontmatter HTML stripped, dangerous URL schemes neutralised). Each has an opt-out flag if the source is genuinely yours and you want to preserve it.
3. **Write.** After confirmation, files land under the destination in a mirrored tree. A post-run security summary reports what was stripped and replay-hints the `--allow-*` flags you'd pass to keep each category next time.

**Trust model.** The converter treats the source as potentially untrusted by default — strict defaults strip or neutralise anything in the source that could behave actively when the resulting vault is opened in Obsidian. For your own markdown, the `--allow-*` flags restore full fidelity:

| Flag | Preserves |
|------|-----------|
| `--allow-unsafe-html` | `<script>`, `<iframe>`, event handlers, `javascript:` URLs in body |
| `--allow-frontmatter-html` | HTML tags inside YAML frontmatter string values |
| `--allow-active-content` | Obsidian community-plugin blocks (dataview, dataviewjs, tasks, excalidraw, templater) |

Other useful flags:

| Flag | Effect |
|------|--------|
| `-y` / `--yes` | Skip the confirm prompt (for automation) |
| `--dry-run` | Print the preview and exit without writing |
| `--force` | With `--yes`, overwrite a non-empty destination |
| `--include GLOB` | Only process matching paths (repeatable) |
| `--exclude GLOB` | Additional excludes past the defaults (repeatable) |
| `--tags rules.yaml` | Custom tag-derivation rules (see `scripts/README.md`) |
| `--augment-only` | If source is already a vault (`.obsidian/` present), only add missing frontmatter; never rewrite structure |

## C. You have a Hugo / Jekyll / MkDocs / Docusaurus site

Same converter, plus one flag per SSG. The `--ssg` option teaches the converter to neutralise shortcode syntax so it renders as ordinary text in Obsidian instead of leaking template braces.

```bash
# Hugo
pnpm run vault:convert ~/sites/myblog/content ~/Vaults/myblog --ssg hugo

# Jekyll
pnpm run vault:convert ~/sites/myjekyll/_posts ~/Vaults/myjekyll --ssg jekyll

# MkDocs
pnpm run vault:convert ~/sites/mkdocs/docs ~/Vaults/mkdocs --ssg mkdocs

# Docusaurus
pnpm run vault:convert ~/sites/docusaurus/docs ~/Vaults/docusaurus --ssg docusaurus

# Stack multiple (rare but supported — comma or repeated)
pnpm run vault:convert ~/mixed ~/Vaults/mixed --ssg hugo,jekyll
```

Auto-detection: if you forget the flag, the preview pass tells you which SSG it thinks it found (based on config files at the source root — `config.toml`/`hugo.toml` for Hugo, `_config.yml` for Jekyll, `mkdocs.yml`, `docusaurus.config.js`) and hints the exact `--ssg NAME` to add.

Known plugins: `hugo`, `jekyll`, `mkdocs`, `docusaurus`. Unknown names warn and are dropped.

## D. You have an RSS or Atom feed

Two-step: turn the feed XML into a markdown directory first, then convert that directory.

```bash
# 1. Download the feed (any RSS 0.92/2.0 or Atom 1.0 XML)
curl -o /tmp/blog.xml https://example.com/feed.xml

# 2. Feed → markdown
pnpm run feed:to-md /tmp/blog.xml /tmp/blog-md/

# 3. Markdown → vault
pnpm run vault:convert /tmp/blog-md/ ~/Vaults/blog
```

Each feed item becomes one `YYYY-MM-DD-slug.md` file with feed-native frontmatter (`title`, `item_url`, `published`, `author`, `tags`, `feed_title`, `guid`, `body_source`). The main converter then adds its own fields (`source`, `modified`, `description`) without clobbering what the feed step produced — the two layers compose cleanly.

Same strict defaults apply: feed XML is treated as untrusted by default; its active content gets stripped unless you opt in via `--allow-unsafe-html` etc. Feeds cap at `MAX_FEED_BYTES = 100 MB` and `MAX_ITEMS = 50_000` by default; overridable with `--max-feed-size` and `--max-items`.

## Next

→ [[cookbook/obsidian-core|Core Mode]] if you want zero-plugin filesystem access (the usual starting point).
→ [[cookbook/obsidian-rest-setup|REST Setup]] if you've decided on REST for fuzzy search.
→ [[cookbook/obsidian-overview#core-vs-rest|Overview — Core vs REST]] if you're still deciding.
