---
title: "A friend sent me this markdown"
tags: [shared]
---

The body of this note has a few things the converter neutralises by
default. Useful as a worked example for what the strict-default body
sanitiser strips.

## What looks normal

A regular markdown link: [example](https://example.com/).

## What gets stripped

A `<script>` tag inline:

<script>console.log('this should not run');</script>

An `<iframe>` embed:

<iframe src="https://example.com/embed"></iframe>

A click handler on an otherwise normal link:

<a href="#" onclick="alert('hi')">A button-shaped link</a>

## What gets neutralised

A markdown link with a dangerous scheme:

[Don't click this](javascript:alert(1))

An image with a `data:text/html` URL:

![nope](data:text/html;charset=utf-8,<h1>hi</h1>)

A safe inline-image data URL is preserved:

![tiny png](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=)
