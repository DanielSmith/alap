# all-together

Demonstrates all three renderers — menu, lightbox, lens — wired to one `AlapConfig` and coordinated by a `RendererCoordinator` so Escape walks back through whichever renderers you opened.

## What it shows

- **Three selectors, one config.** `.alap-menu`, `.alap-lightbox`, `.alap-lens` triggers all resolve the same expression against the same config; only the renderer differs.
- **Back-stack via Escape.** `coordinator.bindKeyboard()` attaches a capture-phase Escape handler that pops the coordinator's stack instead of letting individual renderers eat the key. Open a menu, click through to a lens, then press Escape — the menu restores.
- **Explicit `transitionTo`.** Three buttons call `coordinator.transitionTo(target, {links})`. That's the path to use when you want to close one renderer and open another under coordinator control.

## Run

From the repo root:

```bash
pnpm dev
# http://localhost:5173/all-together/
```

Or standalone (if you've added a `serve.sh`):

```bash
./serve.sh
```

## Files

- `index.html` — two sections: the three-selectors demo and the transition-button demo
- `main.ts` — constructs the three renderers, registers them with the coordinator, binds keyboard, wires the transition buttons
- `config.ts` — six landmark / coffee items with images, descriptions, and meta
- `styles.css` — transition-button styling; everything else comes from `shared/styles.css`
