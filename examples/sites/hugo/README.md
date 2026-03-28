# Alap + Hugo

Demonstrates the `alap` shortcode with Hugo. All expressions are handled client-side by the `<alap-link>` web component — tags, macros, operators, regex, protocols, refiners all work.

## Run

```bash
./run.sh                  # http://localhost:9170
```

Requires Podman (or Docker). The container runs Hugo's dev server.

## How It Works

The `alap` shortcode wraps content in `<alap-link>` web components. The `alap-head` partial injects the IIFE runtime and config.

Content files use the shortcode:

```markdown
{{</* alap ".coffee" */>}}cafes{{</* /alap */>}}
{{</* alap ".nyc + .bridge" */>}}NYC bridges{{</* /alap */>}}
{{</* alap "@favorites" */>}}my links{{</* /alap */>}}
```

## Production

In a real project, use the Hugo module instead of bundled shortcodes:

```toml
[module]
  [[module.imports]]
    path = "github.com/DanielSmith/alap/integrations/hugo-alap"
```

See `integrations/hugo-alap/` for full setup instructions.
