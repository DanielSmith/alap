# Untrusted-demo source — strict-default sanitisation

Three small sources, each demonstrating one strip category that's
on by default in the converter. Useful for understanding what the
tool does to content from a third-party feed, a collaborator's
vault, a public sample, or any source you don't fully control.

This isn't Wikipedia content like the other flavours — these are
hand-crafted inputs that exercise the converter's strict-default
sanitisation paths.

## Convert it (strict — defaults)

```bash
pnpm run vault:convert examples/sites/obsidian-shared/sources/untrusted-demo /tmp/untrusted-strict
```

After conversion, look at:

- `body-html.md` — `<script>`, `<iframe>`, and the `onclick`
  handler are gone. The `javascript:` markdown link's URL is
  replaced with `#`. The `data:text/html` image URL is replaced
  with `#`. The safe `data:image/png;base64,…` URL is preserved.
- `frontmatter-html.md` — string values in YAML frontmatter have
  their HTML tags stripped while plain text survives.
- `active-content.md` — Dataview, Tasks, Templater, and Excalidraw
  blocks are removed entirely.

## Convert it (preserving each category)

To see what gets restored when you opt back in:

```bash
pnpm run vault:convert examples/sites/obsidian-shared/sources/untrusted-demo /tmp/untrusted-loose \
  --allow-unsafe-html \
  --allow-frontmatter-html \
  --allow-active-content
```

Each `--allow-*` flag is independent. The CLI's preview pass tells
you what each is currently set to before you confirm.

## When to opt in

- Your own content. If you wrote the markdown, the strict defaults
  are friction, not protection.
- Trusted sources you've already reviewed. If you've read the file
  and know it's safe, opt back into the categories you need.

The defaults exist so the *first* conversion of an unfamiliar
source doesn't surprise you.
