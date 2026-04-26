---
title: "<b>Bold post</b>"
author: "Alex <alex@example.com>"
tags:
  - "<i>style</i>"
  - "normal"
description: "An <abbr title='HyperText Markup Language'>HTML</abbr> snippet in YAML"
---

The frontmatter on this file has HTML inside string values — both
escaped attributes and full tags. The converter's frontmatter-HTML
sanitiser strips tags from string values while preserving plain
text.

`title` becomes "Bold post". `author` becomes "Alex". `tags[0]`
becomes "style". `description` keeps the word "HTML" without the
abbreviation markup.

A safe `mailto:` URL would be preserved. A `javascript:`-scheme
value in a URL field would be neutralised at the URL-scheme stage —
that's covered separately in `body-html.md`.
