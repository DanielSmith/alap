# Styling the Menu

**[Core Concepts](README.md):** [Expressions](expressions.md) · [Macros](macros.md) · [Search Patterns](search-patterns.md) · [Protocols](protocols.md) · [Refiners](refiners.md) · **This Page**

> Live version with interactive examples: https://alap.info/core-concepts/styling

## "I just want it to blend in"

If you're using the **DOM adapter** (`AlapUI` or a framework adapter), you may not need to do anything. The menu renders as plain HTML in your page — `<div>`, `<ul>`, `<a>` — so your existing styles apply automatically. If your site already styles links and lists, the menu picks that up.

If you're using the **web component**, Shadow DOM blocks your page CSS by design — but `--alap-font` defaults to `inherit`, so the menu already picks up your page's font. For colors, set a few properties to match your site's palette:

```css
alap-link {
  --alap-bg: var(--your-surface-color);
  --alap-text: var(--your-text-color);
  --alap-hover-bg: var(--your-hover-color);
  --alap-border: var(--your-border-color);
}
```

Point the Alap properties at your existing design tokens and the menu blends in. Four lines, and it looks like it belongs.

From there, everything below is optional — for when you want to go further.

---

## Web component: CSS custom properties

The `<alap-link>` web component renders inside Shadow DOM, so your page CSS can't reach in directly. Instead, you set `--alap-*` custom properties on the element or any ancestor. There are 55+ of them, covering everything:

**Colors and box:**
```css
alap-link {
  --alap-bg: #1e1e2e;
  --alap-text: #cdd6f4;
  --alap-border: #45475a;
  --alap-radius: 12px;
  --alap-shadow: 0 8px 24px rgba(0,0,0,0.3);
}
```

**Hover and focus:**
```css
alap-link {
  --alap-hover-bg: #313244;
  --alap-hover-text: #89b4fa;
  --alap-hover-transform: translateX(4px);
  --alap-focus-ring: #89b4fa;
  --alap-transition: all 0.15s ease;
}
```

**Typography:**
```css
alap-link {
  --alap-font-size: 0.85rem;
  --alap-font-weight: 500;
  --alap-letter-spacing: 0.02em;
  --alap-text-transform: uppercase;
}
```

You can also target specific parts of the menu with `::part()`:

```css
alap-link::part(menu) { backdrop-filter: blur(12px); }
alap-link::part(link):hover { text-decoration: underline; }
```

For the full list of custom properties and `::part()` selectors, see [Web Component](../framework-guides/web-component.md).

## DOM adapter: regular CSS

When using `AlapUI` or a framework adapter, the menu renders directly into the page. No shadow boundary — your CSS applies normally.

The menu uses predictable selectors:

```css
#alapelem { background: white; border: 1px solid #e5e7eb; border-radius: 8px; }
#alapelem a { padding: 0.5rem 1rem; color: #1a1a1a; }
#alapelem a:hover { background: #eff6ff; color: #2563eb; }
```

Per-trigger styling is available when the trigger has an ID:

```css
#alapelem.alap_featured { border-color: gold; }
```

And per-item styling via the `cssClass` field in your config:

```css
#alapelem .highlighted a { font-weight: bold; }
```

## Dark mode

Set custom properties inside a media query:

```css
@media (prefers-color-scheme: dark) {
  alap-link {
    --alap-bg: #1e1e2e;
    --alap-text: #cdd6f4;
    --alap-border: #45475a;
    --alap-hover-bg: #313244;
    --alap-hover-text: #89b4fa;
  }
}
```

Light and dark themes are just two sets of property values. The component doesn't need to know which one is active.

## Transitions

Item hover transitions are controlled by `--alap-transition`:

```css
alap-link {
  --alap-transition: all 0.15s ease;
  --alap-hover-transform: translateX(4px);
}
```

For menu open/close animation, override `::part(menu)`:

```css
alap-link::part(menu) {
  opacity: 0;
  transform: translateY(6px);
  transition: opacity 0.2s, transform 0.2s;
}
```

Always respect reduced motion preferences:

```css
@media (prefers-reduced-motion: reduce) {
  alap-link {
    --alap-transition: none;
    --alap-menu-transition: none;
  }
}
```

## Corner shapes

On supported browsers (Chrome/Edge 134+), you can change the geometry of the menu's corners:

```css
alap-link {
  --alap-corner-shape: squircle;   /* iOS-style superellipse */
  --alap-radius: 20px;
}
```

Six shapes: `round` (default), `squircle`, `scoop`, `notch`, `bevel`, `straight`. Older browsers fall back to standard `border-radius` gracefully.

## Effects

The custom properties support layered visual effects:

```css
/* Glassmorphism */
alap-link {
  --alap-bg: rgba(255,255,255,0.6);
  --alap-backdrop: blur(12px) saturate(1.5);
}

/* Neon glow */
alap-link {
  --alap-bg: #0a0a0a;
  --alap-text: #0ff;
  --alap-hover-text-shadow: 0 0 8px #0ff;
  --alap-shadow: 0 0 20px rgba(0,255,255,0.3);
}

/* Dim non-hovered items */
alap-link {
  --alap-dim-unhovered: 0.5;
}
```

## The quick version

**Web component?** Set `--alap-*` properties in CSS. They cross the shadow boundary by design. Use `::part()` for anything the properties don't cover.

**DOM adapter?** Style `#alapelem` and its children with regular CSS. Full cascade, full control.

Both paths give you complete visual control — the mechanism is different, the result is the same.

## Next steps

- [Web Component](../framework-guides/web-component.md) — full list of CSS custom properties and `::part()` selectors
- [Vanilla DOM](../framework-guides/vanilla-dom.md) — DOM adapter selectors and markup
- [Images and Media](../cookbook/images-and-media.md) — image items, thumbnails, hover previews
