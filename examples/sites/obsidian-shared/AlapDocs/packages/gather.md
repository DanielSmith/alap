---
source: packages/gather.md
modified: '2026-04-15T15:42:57Z'
tags:
- packages
title: alap-gather
description: Drag menu items into a collection tray to build ad-hoc sets from multiple
  Alap menus.
---
# alap-gather

Drag menu items into a collection tray to build ad-hoc sets from multiple Alap menus.

## What it does

Gather adds a side tray to any page with Alap menus. Drag a menu item sideways to collect it. Mix items from static configs and live protocol feeds (`:atproto:`, `:json:`) into a single collection. Organize with folders, then view or export.

## Features

- **Grab from menus** — pointer-drag any menu item into the tray
- **External drops** — drag regular links from the page or other tabs onto the tray
- **Folders** — create, rename, reorder, collapse; drag items between folders
- **Lightbox / Lens** — open the collection in Alap's lightbox or lens viewer
- **Export** — JSON config, Markdown with `#tags`, Netscape bookmark HTML
- **Save / Import** — full round-trip JSON with folder structure
- **Enrichment** — external drops auto-enrich via client-side oEmbed (Vimeo, Spotify)
- **Persistence** — items, folders, and cards survive page reloads via localStorage

## HighNotes

Double-click a collected item (or drag it out of the tray) to materialize a floating card on the page.

- **Draggable** — grab the header to reposition
- **Pinnable** — pin to viewport (fixed) or anchor to document (scrolls with page)
- **Collapsible** — double-click header to toggle
- **Z-stacked** — most recently touched card floats on top; auto-rebases when the stack gets deep
- **Tag navigation** — click a tag chip to open a filtered lightbox across all collected items with that tag

Lightbox and lens overlays always float above HighNotes cards.

## Status

In development. Source: [github.com/DanielSmith/alap-gather](https://github.com/DanielSmith/alap-gather)
