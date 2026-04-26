---
source: README.md
modified: '2026-04-25T21:42:30Z'
title: Jekyll source — example for `--ssg jekyll`
description: A small Jekyll/Liquid food notebook — three posts and an index page about
  Italian cooking. Body content is adapted from Wikipedia (CC BY-SA 4.0); the Jekyll/Liquid
  syntax is mine.
---
# Jekyll source — example for `--ssg jekyll`

A small Jekyll/Liquid food notebook — three posts and an index page
about Italian cooking. Body content is adapted from Wikipedia
(CC BY-SA 4.0); the Jekyll/Liquid syntax is mine.

## Convert it

```bash
pnpm run vault:convert examples/sites/obsidian-shared/sources/jekyll /tmp/cooking-vault --ssg jekyll
```

## What converts

- ````lang
…
```` → fenced code block
- `…` → contents preserved verbatim, delimiters
  stripped
- `` → fully stripped
- `` → stripped
- `X`, `X` → bare ref (the wikilink
  rewriter picks them up if internal)
- ``, `` → stripped (these usually evaluate
  empty in a converted file anyway)

Unknown Liquid tags pass through.

## Sources

Body content adapted from Wikipedia under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/):

- [Italian cuisine](https://en.wikipedia.org/wiki/Italian_cuisine) — `_pages/index.md`
- [Spaghetti](https://en.wikipedia.org/wiki/Spaghetti) — `_posts/2026-03-08-spaghetti.md`
- [Carbonara](https://en.wikipedia.org/wiki/Carbonara) — `_posts/2026-04-02-carbonara.md`
- [Emulsion](https://en.wikipedia.org/wiki/Emulsion) — `_posts/2026-02-22-emulsion.md`

## Image credits

Photos sourced from Wikimedia Commons; per-image credit lines also appear inline beneath each photo.

- `pasta.jpg` — *Pasta* by [David Adam Kess](https://commons.wikimedia.org/wiki/File:(Pasta)_by_David_Adam_Kess_(pic.2).jpg), [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)
- `emulsion.jpg` — *Particles in polydimethylsiloxane (PDMS) oil-in-water emulsion seen through an optical microscope* by [Kushina Dahlia](https://commons.wikimedia.org/wiki/File:Particles_in_polydimethylsiloxane_(PDMS)_oil-in_water_emulsion_seen_through_an_optical_microscope.jpg), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)

## What to look for

After conversion, open `/tmp/cooking-vault` in Obsidian.
`_posts/2026-04-02-carbonara.md` shows several things at once:

- The Ruby code block came from `{% highlight ruby %}`.
- The `{% comment %}` block — visible in the source — is gone in
  the output.
- The `{% post_url %}` reference in `_posts/2026-03-08-spaghetti.md`
  resolves against the sibling emulsion post.
