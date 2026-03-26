# Advanced CSS — Web Component Theming

Demonstrates all 55+ CSS custom properties on the `<alap-link>` web component, organized into focused pages with progressive enhancement and graceful fallbacks.

## Pages

| Page | Focus | Key properties |
|------|-------|----------------|
| [index.html](index.html) | Overview + property reference table | All — quick reference |
| [shapes.html](shapes.html) | Corner shapes, per-corner longhands, item borders | `--alap-corner-shape`, `--alap-corner-*-shape`, `--alap-item-*` |
| [shadows.html](shadows.html) | Box shadow, drop shadow, text shadow, glassmorphism | `--alap-shadow`, `--alap-drop-shadow`, `--alap-text-shadow`, `--alap-backdrop` |
| [typography.html](typography.html) | Font weight, spacing, transform, decoration, overflow | `--alap-font-weight`, `--alap-letter-spacing`, `--alap-text-transform`, `--alap-text-overflow` |
| [motion.html](motion.html) | Transitions, transforms, cursor, open animations | `--alap-transition`, `--alap-hover-transform`, `--alap-menu-transition` |
| [themes.html](themes.html) | Complete themes + wild combinations | Dark, neon, glassmorphism, brutalist, 20+ properties at once |

## Run

```bash
cd examples/sites/advanced-css-wc
npx vite
```

## Browser Support

- All base properties work in every modern browser
- `corner-shape` properties require Chrome/Edge 134+ (progressive enhancement — falls back to `border-radius`)
- `backdrop-filter` has broad support but check [caniuse](https://caniuse.com/css-backdrop-filter) for older browsers

The index page includes a live detection banner that tells you which path your browser takes.

## Files

| File | Purpose |
|------|---------|
| `shared.css` | Base page layout, navigation, code blocks, tables |
| `shapes.css` | Corner shape and border demo styles |
| `shadows.css` | Shadow and depth demo styles |
| `typography.css` | Typography demo styles |
| `motion.css` | Transition and animation demo styles |
| `themes.css` | Theme composition demo styles |
| `config.ts` | Shared link/macro data |
| `main.ts` | Shared init (register config, define element, feature detection) |
