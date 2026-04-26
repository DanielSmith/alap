# Vanilla source — no `--ssg` flag

Plain markdown. The simplest possible input — no shortcodes, no
admonitions, no Liquid templating. A small listening journal about
Bach. Body content is adapted from Wikipedia (CC BY-SA 4.0).

## Convert it

```bash
pnpm run vault:convert examples/sites/obsidian-shared/sources/vanilla /tmp/bach-vault
```

That's it — no `--ssg`. Without plugin transforms, the converter
still:

- Normalises frontmatter (writes a consistent YAML shape).
- Sanitises body URL schemes by default (drops `javascript:`, etc.
  — see `untrusted-demo/` for that surface).
- Rewrites internal `[text](file.md)` links into `[[file]]`
  wikilinks if the target is in scope.
- Applies tag rules if you pass `--tags rules.yaml`.

## Sources

Body content adapted from Wikipedia under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/):

- [Johann Sebastian Bach](https://en.wikipedia.org/wiki/Johann_Sebastian_Bach) — `index.md`
- [Brandenburg Concertos](https://en.wikipedia.org/wiki/Brandenburg_Concertos) — `brandenburg.md`
- [The Well-Tempered Clavier](https://en.wikipedia.org/wiki/The_Well-Tempered_Clavier) — `well-tempered.md`
- [Goldberg Variations](https://en.wikipedia.org/wiki/Goldberg_Variations) — `goldberg.md`

## Image credits

Photo sourced from Wikimedia Commons; per-image credit line also appears inline beneath the photo.

- `brandenburg.jpg` — *A lute, cello, violin, guitar, musical manuscript and books on a draped table* (workshop of Bartolomeo Bettera) — [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Studio_of_Bartolomeo_Bettera_-_A_lute,_cello,_violin,_guitar,_musical_manuscript_and_books_on_a_draped_table.jpg), public domain

## What to look for

After conversion, open `/tmp/bach-vault` in Obsidian. Internal
markdown links between notes are rewritten into `[[wikilinks]]` —
Obsidian's native form.
