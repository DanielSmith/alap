# Hugo source — example for `--ssg hugo`

A small personal birding journal — four entries with Hugo shortcodes
around them. Body content is adapted from Wikipedia (CC BY-SA 4.0);
the Hugo shortcodes are mine.

## Convert it

```bash
pnpm run vault:convert examples/sites/obsidian-shared/sources/hugo /tmp/birds-vault --ssg hugo
```

## What converts

- `{{< note >}}…{{< /note >}}` (and warning / tip / caution / danger,
  both `<…>` and `%…%` forms) → Obsidian callouts (`> [!note]`)
- `{{% pageinfo %}}…{{% /pageinfo %}}` → blockquote
- `{{< figure src="…" alt="…" >}}` → `![alt](src)`
- `{{% heading "…" %}}` → `## …`
- `{{< toc >}}` → stripped (Obsidian has its own outline pane)

Unknown shortcodes pass through unchanged — `wren.md` includes one on
purpose to show the converter doesn't try to be a Hugo transpiler.

## Sources

Body content adapted from Wikipedia under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/):

- [Birdwatching](https://en.wikipedia.org/wiki/Birdwatching) — `_index.md`
- [Northern cardinal](https://en.wikipedia.org/wiki/Northern_cardinal) — `cardinal.md`
- [Carolina wren](https://en.wikipedia.org/wiki/Carolina_wren) — `wren.md`
- [Bird vocalization](https://en.wikipedia.org/wiki/Bird_vocalization) — `songs.md`

## Image credits

Photos sourced from Wikimedia Commons; per-image credit lines also appear inline beneath each photo.

- `cardinal.jpg` — *Male northern cardinal in Central Park* by [Rhododendrites](https://commons.wikimedia.org/wiki/File:Male_northern_cardinal_in_Central_Park_(52612).jpg), [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)
- `wren.jpg` — *Carolina wren in south meadows* by [Paul Danese](https://commons.wikimedia.org/wiki/File:20240619_carolina_wren_south_meadows_PD201410.jpg), [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)

## What to look for

After conversion, open `/tmp/birds-vault` in Obsidian. The shortcodes
are gone, replaced by native callouts and figures. The unknown
shortcode in `wren.md` survives as literal text.
