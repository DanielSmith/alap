# Svelte Adapter

`<AlapProvider>` + `<AlapLink>` + `useAlap()` — Svelte 5 runes (`$state`, `$derived`, `$effect`).

## Run

```bash
./serve.sh                # http://localhost:9090/sites/svelte/
```

Or from the alap root:
```bash
pnpm dev                  # http://localhost:5173/sites/svelte/
```

## What to Try

- Click links to open menus — Svelte 5 reactivity drives the UI
- Try the composable example — `useAlap()` for programmatic access
- Try dynamic config switching — reactive config updates
- Keyboard: Tab, Enter, ArrowDown/Up, Escape

## Key Files

- `App.svelte` — main component with AlapProvider + AlapLink
- `ComposableExample.svelte` — `useAlap()` usage
- `DynamicConfigExample.svelte` — runtime config switching
- `main.ts` — `mount(App, ...)`
- `config.ts` — standard demo config
