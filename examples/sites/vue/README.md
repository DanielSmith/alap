# Vue Adapter

`<AlapProvider>` + `<AlapLink>` + `useAlap()` composable — SFC templates with `<script setup>`.

## Run

```bash
./serve.sh                # http://localhost:9110/sites/vue/
```

Or from the alap root:
```bash
pnpm dev                  # http://localhost:5173/sites/vue/
```

## What to Try

- Click links to open menus — all rendering modes demonstrated
- Try the composable example — `useAlap()` for programmatic access
- Try dynamic config switching — swap configs at runtime
- Keyboard: Tab, Enter, ArrowDown/Up, Escape

## Key Files

- `App.vue` — main SFC with AlapProvider + AlapLink
- `ComposableExample.vue` — `useAlap()` composable usage
- `DynamicConfigExample.vue` — runtime config switching
- `main.ts` — `createApp` + mount
- `config.ts` — standard demo config
