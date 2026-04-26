---
source: cookbook/existing-urls.md
modified: '2026-04-15T15:42:57Z'
tags:
- cookbook
title: Existing URL Handling
description: '**Cookbook:** Language Ports · Editors · Markdown · Rich-Text · Accessibility
  · **This Page** · Images & Media'
---
# Existing URL Handling

**[[cookbook/README|Cookbook]]:** [[cookbook/language-ports|Language Ports]] · [[cookbook/editors|Editors]] · [[cookbook/markdown|Markdown]] · [[cookbook/rich-text|Rich-Text]] · [[cookbook/accessibility|Accessibility]] · **This Page** · [[cookbook/images-and-media|Images & Media]]

What happens when a link already has an `href`?

Most menu libraries would ignore it — the link becomes a trigger now, not a destination. Alap takes a different approach: **the original URL is still a valid choice.**

> Live version: https://alap.info/cookbook/existing-urls

## The problem

Say you have a link to a Wikipedia article about the Brooklyn Bridge. You enhance it with an Alap menu — related bridges, photo galleries, map links. But the original URL is still good. Someone clicking that link *wanted* the Brooklyn Bridge article. Should they lose that just because you added a menu?

## Three options

The `existingUrl` setting controls this:

**`prepend`** (the default) — The original URL becomes the **first item** in the menu. Your Alap results follow it.

**`append`** — The original URL becomes the **last item**. Your curated menu leads; the original link is there if they want it.

**`ignore`** — The original URL is dropped. The menu replaces it entirely.

```json
{
  "settings": {
    "existingUrl": "prepend"
  }
}
```

### Per-link override

Override the global setting on individual triggers:

```html
<!-- Uses global setting (prepend by default) -->
<a class="alap" href="https://example.com" data-alap-linkitems=".coffee">cafes</a>

<!-- Override: append on this one -->
<a class="alap" href="https://example.com" data-alap-linkitems=".coffee" data-alap-existing="append">cafes</a>

<!-- Override: ignore on this one -->
<a class="alap" href="https://example.com" data-alap-linkitems=".coffee" data-alap-existing="ignore">cafes</a>
```

For the web component:

```html
<alap-link query=".bridge" href="https://en.wikipedia.org/wiki/Brooklyn_Bridge">
  Brooklyn Bridge and more
</alap-link>
```

## Progressive enhancement

This is really about graceful degradation. When JavaScript doesn't run — slow connection, corporate firewall, bot crawler, screen reader in simplified mode — the link still has its `href`. It still goes somewhere. The page still works.

Alap enhances the link. It doesn't replace it. And when the menu appears, the original destination isn't lost — it's right there in the list, exactly where the `existingUrl` setting puts it.

This is the difference between "this link requires JavaScript" and "this link works with or without JavaScript, and gets better with it."
