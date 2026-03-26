# Astro Integration

A multi-page Astro project demonstrating Alap's web component with `::part()` theming. Zero per-page boilerplate — Alap works on every page without per-page setup.

## How to Run

### Quick start (IIFE mode)

```bash
./serve.sh                # http://localhost:9010
```

This installs Astro (first run only), copies the pre-built `alap.iife.js` into `public/`, and serves the site. No `npm install alap` needed — the IIFE build loads via `<script>` tags.

### Manual

```bash
npm install               # first time only
cp ../../../dist/alap.iife.js public/
./node_modules/.bin/astro dev --port 9010
```

**Note:** This example uses Astro's own dev server, not Vite directly. It cannot be served from the root `pnpm dev`.

## Production: Using the Integration

This example ships with a 15-line Astro integration (`integrations/alap.mjs`) that auto-injects Alap into every page via `injectScript`. In a real project with `npm install alap`:

1. Uncomment the integration in `astro.config.mjs`
2. Remove the `<script>` tags from `src/layouts/Base.astro`
3. The integration handles `defineAlapLink()` and `registerConfig()` automatically

The integration approach is cleaner — no manual `<script>` tags, no IIFE. But it requires `alap` as an npm dependency, which isn't available when running the example from the repo.

## What to Try

- Navigate between pages (home, bridges, food) — Alap works on all of them without per-page setup
- Click `<alap-link>` elements — web component menus with `::part()` theming
- View source — no Alap boilerplate in the `.astro` page files

## Clean Up

```bash
rm -rf node_modules public/alap.iife.js
```

## Key Files

- `serve.sh` — installs deps, copies IIFE build, starts Astro
- `src/pages/index.astro` — home page with Alap links
- `src/pages/bridges.astro` — bridges page
- `src/pages/food.astro` — food page
- `src/layouts/Base.astro` — shared layout with IIFE `<script>` tags
- `public/alap-config.js` — config + web component registration (IIFE mode)
- `integrations/alap.mjs` — Astro integration for production ESM usage
- `src/alap-config.ts` — config for the ESM integration (not used in IIFE mode)
- `astro.config.mjs` — integration registration (commented out for IIFE mode)
