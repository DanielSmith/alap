# Advanced CSS — DOM Mode

Mirrors the web component CSS gallery (`advanced-css-wc/`) using DOM mode (`AlapUI`). Shows that the same visual effects are achievable with plain light-DOM CSS — no custom elements, no shadow DOM.

## Key Difference from Web Component

| Aspect | Web Component (`advanced-css-wc`) | DOM Mode (here) |
|--------|-----------------------------------|-----------------|
| Trigger | `<alap-link query="...">` | `<a class="alap" data-alap-linkitems="...">` |
| Menu | Shadow DOM inside element | Global `#alapelem` in `<body>` |
| Styling | CSS custom properties (`--alap-*`) | Direct CSS on `.alapelem` |
| Per-trigger | Ancestor selector | `.alap_${anchorId}` class |

## Pages

| Page | Focus |
|------|-------|
| [index.html](index.html) | Overview and approach comparison |
| [shapes.html](shapes.html) | Border radius, corner-shape, per-item borders |
| [shadows.html](shadows.html) | Box shadow, text shadow, glassmorphism |
| [typography.html](typography.html) | Font weight, spacing, transform, ellipsis |
| [motion.html](motion.html) | Transitions, transforms, cursor |
| [themes.html](themes.html) | Dark, neon, glass, brutalist, warm |

## Run

```bash
cd examples/sites/advanced-css-dom
npx vite
```

Or from `alap/`:
```bash
pnpm dev  # then open /sites/advanced-css-dom/
```
