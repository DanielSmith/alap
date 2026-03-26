# React Adapter

`<AlapProvider>` + `<AlapLink>` + `useAlap()` hook — demonstrates all three rendering modes (DOM, web component, popover).

## Run

```bash
./serve.sh                # http://localhost:9050/sites/react/
```

Or from the alap root:
```bash
pnpm dev                  # http://localhost:5173/sites/react/
```

## What to Try

- Click links in each rendering mode section — same behavior, different DOM output
- Use keyboard navigation: Tab to trigger, Enter to open, ArrowDown/Up, Escape to close
- Open browser devtools — compare DOM structure between modes
- Try the `useAlap()` composable example — programmatic query/resolve

## Key Files

- `App.tsx` — React components showing all three modes
- `main.tsx` — `createRoot` + render
- `config.ts` — standard demo config
- `index.html` — mount point
