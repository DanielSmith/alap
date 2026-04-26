# Docusaurus source — example for `--ssg docusaurus`

A small Docusaurus 3.x site — reading notes on three 19th-century
English novels. Body content is adapted from Wikipedia (CC BY-SA
4.0); the Docusaurus syntax is mine.

## Convert it

```bash
pnpm run vault:convert examples/sites/obsidian-shared/sources/docusaurus /tmp/novels-vault --ssg docusaurus
```

## What converts

- `:::note`, `:::caution`, `:::tip`, etc. → Obsidian callouts
- `:::caution[Reading status]` (3.10+ directive form) → callout with title
- `import X from '...';` at body top → stripped
- `{/* MDX comment */}` → stripped
- `<!-- HTML comment -->` → stripped
- `<Tabs>…</Tabs>` and `<TabItem>…</TabItem>` → outer tags stripped,
  inner content kept
- `## Heading {#anchor}` and `## Heading {/* #anchor */}` → anchor
  syntax stripped, heading preserved

Unknown JSX components pass through as literal text.

## Sources

Body content adapted from Wikipedia under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/):

- [Jane Austen](https://en.wikipedia.org/wiki/Jane_Austen) — `intro.md`
- [Pride and Prejudice](https://en.wikipedia.org/wiki/Pride_and_Prejudice) — `pride-and-prejudice.md`
- [Jane Eyre](https://en.wikipedia.org/wiki/Jane_Eyre) — `jane-eyre.md`
- [Middlemarch](https://en.wikipedia.org/wiki/Middlemarch) — `middlemarch.md`

## Image credits

Photo sourced from Wikimedia Commons; per-image credit line also appears inline beneath the photo.

- `jane-eyre.jpg` — *Book, rose, and candle on teak* by [Liam Quin](https://commons.wikimedia.org/wiki/File:Book-rose-and-candle-on-teak.jpg), public domain

## What to look for

After conversion, open `/tmp/novels-vault` in Obsidian. The MDX
imports at the top of `intro.md` and `pride-and-prejudice.md` are
gone, the `:::` admonitions render as native callouts, and the
`<Tabs>` wrapping in `pride-and-prejudice.md` is gone — leaving the
three edition notes in sequence.
