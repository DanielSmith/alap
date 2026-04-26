---
title: "Obsidian community-plugin blocks"
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

```dataview
TABLE file.size FROM "notes"
```

```dataviewjs
dv.list(dv.pages('"notes"').file.name)
```

## Tasks

```tasks
not done
due before today
```

## Templater

Inline: `<% tp.date.now() %>`

Block: `<%* tR += "hello" %>`

## Excalidraw

```excalidraw

```

## What survives

This text. Plain code blocks (without an active-plugin language
tag). Regular markdown.
