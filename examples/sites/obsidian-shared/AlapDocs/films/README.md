---
source: README.md
modified: '2026-04-25T21:42:30Z'
title: MkDocs source — example for `--ssg mkdocs`
description: A small MkDocs-Material site — guide to selected Alfred Hitchcock films.
  Body content is adapted from Wikipedia (CC BY-SA 4.0); the MkDocs admonition syntax
  is mine.
---
# MkDocs source — example for `--ssg mkdocs`

A small MkDocs-Material site — guide to selected Alfred Hitchcock
films. Body content is adapted from Wikipedia (CC BY-SA 4.0); the
MkDocs admonition syntax is mine.

## Convert it

```bash
pnpm run vault:convert examples/sites/obsidian-shared/sources/mkdocs /tmp/hitchcock-vault --ssg mkdocs
```

## What converts

- `!!! note`, `!!! warning`, `!!! tip`, `!!! danger`, etc. → Obsidian
  callouts (`> [!note]`)
- `!!! warning "Pay Attention"` → callout with title (`> [!warning] Pay Attention`)
- `??? note` → collapsed callout (`> [!note]-`)
- `???+ note` → collapsible-but-open callout (`> [!note]+`)
- `[TOC]` → stripped (Obsidian has an outline pane)

Multi-paragraph admonitions with blank lines between paragraphs are
preserved as one continuous callout.

## Sources

Body content adapted from Wikipedia under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/):

- [Alfred Hitchcock](https://en.wikipedia.org/wiki/Alfred_Hitchcock) — `index.md`
- [Vertigo (film)](https://en.wikipedia.org/wiki/Vertigo_(film)) — `vertigo.md`
- [Rear Window](https://en.wikipedia.org/wiki/Rear_Window) — `rear-window.md`
- [Psycho (1960 film)](https://en.wikipedia.org/wiki/Psycho_(1960_film)) — `psycho.md`

## Image credits

Photo sourced from Wikimedia Commons; per-image credit line also appears inline beneath the photo.

- `vertigo.jpg` — *Golden Gate Bridge at sunset* by [Brocken Inaglory](https://commons.wikimedia.org/wiki/File:Golden_Gate_Bridge_at_sunset_1.jpg), [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/)

## What to look for

After conversion, open `/tmp/hitchcock-vault` in Obsidian. The
MkDocs admonition syntax should be gone — replaced with native
callouts. The collapsible variants in `rear-window.md` and
`psycho.md` keep their open/closed state in Obsidian's callout UI.
