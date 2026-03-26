# SolidJS Adapter

`<AlapProvider>` + `<AlapLink>` + `useAlap()` — fine-grained reactivity with SolidJS signals and `Dynamic` component.

## Run

```bash
./serve.sh                # http://localhost:9070/sites/solid/
```

Or from the alap root:
```bash
pnpm dev                  # http://localhost:5173/sites/solid/
```

## What to Try

- Click links to open menus — SolidJS signals drive updates with minimal re-renders
- Try the composable example — `useAlap()` for programmatic access
- Try dynamic config switching
- Keyboard: Tab, Enter, ArrowDown/Up, Escape

## Key Files

- `App.tsx` — main component with AlapProvider + AlapLink
- `main.tsx` — `render(() => <App />, ...)`
- `config.ts` — standard demo config
