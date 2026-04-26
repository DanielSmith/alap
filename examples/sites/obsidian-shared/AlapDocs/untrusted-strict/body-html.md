---
title: A friend sent me this markdown
tags:
- shared
source: body-html.md
modified: '2026-04-25T20:35:25Z'
description: The body of this note has a few things the converter neutralises by default.
  Useful as a worked example for what the strict-default body sanitiser strips.
---
The body of this note has a few things the converter neutralises by
default. Useful as a worked example for what the strict-default body
sanitiser strips.

## What looks normal

A regular markdown link: [example](https://example.com/).

## What gets stripped

A `

An `

A click handler on an otherwise normal link:

<a href="#">A button-shaped link</a>

## What gets neutralised

A markdown link with a dangerous scheme:

[Don't click this](#)

An image with a `data:text/html` URL:

![nope](#)

A safe inline-image data URL is preserved:

![tiny png](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=)
