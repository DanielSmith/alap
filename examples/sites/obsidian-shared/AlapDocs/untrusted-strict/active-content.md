---
title: Obsidian community-plugin blocks
source: active-content.md
modified: '2026-04-25T20:35:42Z'
description: Some Obsidian plugins activate on note view — Dataview queries run on
  open, Templater can execute snippets when notes are created, and so on. The converter
  strips these by default because the source…
---
Some Obsidian plugins activate on note view — Dataview queries run
on open, Templater can execute snippets when notes are created,
and so on. The converter strips these by default because the source
might be content from a third party that you don't want to give
code-execution when you open it.

## Dataview

Inline:

`= dv.current().file.name`

Block:



## Tasks


## Templater

Inline: ``

Block: ``

## Excalidraw


## What survives

This text. Plain code blocks (without an active-plugin language
tag). Regular markdown.
