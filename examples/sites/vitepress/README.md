# VitePress + Alap Example

Uses `vitepress-alap` to add `<alap-link>` web components to VitePress markdown pages.

## Run

```bash
pnpm install   # from workspace root
cd examples/sites/vitepress
pnpm dev
```

Open http://localhost:5173 and click the example links to see menus.

## How it works

- `docs/.vitepress/config.mjs` — adds `alapPlugin()` with a config path
- `alap-config.ts` — link data (items, tags, macros)
- `docs/examples.md` — uses `<alap-link query="...">` in markdown

The plugin registers `<alap-link>` as a Vue custom element and injects the config automatically.
