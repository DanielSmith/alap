# Lightbox Renderer

Same Alap config, different renderer. Click any link to open a fullscreen lightbox instead of a dropdown menu.

## Run

From the alap root:
```bash
pnpm dev                  # http://localhost:5173/sites/lightbox/
```

## What it shows

- **Lightbox renderer** — `AlapLightbox` opens a fullscreen overlay instead of a dropdown
- **Side-by-side comparison** — same config rendered as lightbox (top) and standard menu (bottom)
- **Thumbnail previews** — items with `thumbnail` show image cards in the lightbox
- **Text fallback** — items without thumbnails show a text card with description
- **One-line swap** — the only code difference is `new AlapLightbox(config)` vs `new AlapUI(config)`

## Key Files

- `index.html` — two sets of links: `.alap` (lightbox) and `.alap-menu` (standard menu)
- `main.ts` — creates both `AlapLightbox` and `AlapUI` on the same config
- `config.ts` — shared link data with thumbnails, descriptions, and photo credits
- `styles.css` — lightbox-specific overrides
- `images/` — thumbnail photos for lightbox previews
