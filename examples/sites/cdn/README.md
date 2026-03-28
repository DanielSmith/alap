# CDN / Script Tag Example

**Zero npm. Zero build step. One `<script>` tag.**

This example demonstrates Alap loaded entirely via the IIFE build — no bundler, no `node_modules`, no `package.json`. Just HTML.

## Run It

```bash
# Build the IIFE first (from project root)
pnpm build

# Serve this directory
cd examples/sites/cdn
bash serve.sh
# → http://localhost:9130
```

Or just open `index.html` in a browser (file:// works for local testing).

## What It Shows

- **Web component** — `<alap-link query=".coffee">` with `::part()` styling
- **DOM adapter** — class-based `<a class="alap" data-alap-linkitems="...">` binding
- **Programmatic engine** — `AlapEngine.query()` and `.resolve()` output displayed inline
- **Inline config** — no external file, no fetch, just a `var config = { ... }` in a `<script>` tag

## The Pattern

```html
<script src="https://cdn.jsdelivr.net/npm/alap@3/dist/alap.iife.js"></script>
<script>
  Alap.defineAlapLink();
  Alap.registerConfig({
    allLinks: {
      example: { url: 'https://example.com', label: 'Example', tags: ['demo'] },
    },
  });
</script>

<alap-link query=".demo">click me</alap-link>
```

That's it. Three elements: a script tag, a config, and a web component.

---

## Platform Recipes

The IIFE build works anywhere you can add a `<script>` tag. Here's how to integrate with common platforms:

### WordPress (Classic Editor / Theme)

**Where does the config live?** Three options:

**Option A: Static JSON file in your theme** — simplest. Build the config in an Alap editor, export JSON, drop it into your theme. Version-controllable, no database dependency.

```php
// functions.php — load config from a JSON file in the theme
function enqueue_alap() {
    wp_enqueue_script('alap', 'https://cdn.jsdelivr.net/npm/alap@3/dist/alap.iife.js', [], '3.0.0');

    $config_path = get_template_directory() . '/alap-config.json';
    $config = file_get_contents($config_path);

    wp_add_inline_script('alap', '
        Alap.defineAlapLink();
        Alap.registerConfig(' . $config . ');
    ');
}
add_action('wp_enqueue_scripts', 'enqueue_alap');
```

**Option B: WordPress database (`wp_options`)** — config stored in the DB, managed via a settings page in wp-admin. No file to deploy.

```php
// functions.php — load config from wp_options
function enqueue_alap() {
    wp_enqueue_script('alap', 'https://cdn.jsdelivr.net/npm/alap@3/dist/alap.iife.js', [], '3.0.0');

    $config = get_option('alap_config', '{}');

    wp_add_inline_script('alap', '
        Alap.defineAlapLink();
        Alap.registerConfig(' . $config . ');
    ');
}
add_action('wp_enqueue_scripts', 'enqueue_alap');
```

You'd create a simple settings page that stores the JSON:

```php
// In your plugin's admin page
update_option('alap_config', wp_unslash($_POST['alap_config']));
```

**Option C: Remote API** — config lives on a separate server (one of the 7 Alap server examples, or any REST endpoint). Useful when multiple sites share the same link library.

```php
wp_add_inline_script('alap', '
    Alap.defineAlapLink();
    fetch("https://your-api.com/configs/main")
        .then(function(r) { return r.json(); })
        .then(function(raw) {
            Alap.registerConfig(Alap.validateConfig(raw));
        });
');
```

**Shortcode** for use in posts (works with any of the three options above):

```php
add_shortcode('alap', function($atts, $content) {
    $query = esc_attr($atts['query'] ?? '');
    return '<alap-link query="' . $query . '">' . esc_html($content) . '</alap-link>';
});
```

In the editor: `[alap query=".coffee"]cafes[/alap]`

### WordPress (Gutenberg Block)

See the planned `wp-alap` plugin (separate repo). The Gutenberg block uses the same IIFE build but provides a visual block editor UI for authors. It would include a proper settings page for managing the config (option B above, with a visual editor).

### Drupal

In your theme's `*.libraries.yml`:

```yaml
alap:
  js:
    https://cdn.jsdelivr.net/npm/alap@3/dist/alap.iife.js: { type: external, minified: true }
    js/alap-setup.js: {}
```

`js/alap-setup.js`:
```js
(function() {
  Alap.defineAlapLink();
  Alap.registerConfig(drupalSettings.alap.config);
})();
```

Store the config as a JSON file in your module's directory or pass it from PHP via `drupalSettings` (Drupal's mechanism for passing PHP data to JavaScript).

### Joomla

Add to your template's `index.php`. The config can be a JSON file in your template directory or loaded from the database:

```php
$doc = JFactory::getDocument();
$doc->addScript('https://cdn.jsdelivr.net/npm/alap@3/dist/alap.iife.js');

// Load config from a JSON file in the template
$config = file_get_contents(JPATH_THEMES . '/' . $doc->template . '/alap-config.json');

$doc->addScriptDeclaration('
  Alap.defineAlapLink();
  Alap.registerConfig(' . $config . ');
');
```

### Squarespace (Code Injection)

In Settings → Advanced → Code Injection → Footer:

```html
<script src="https://cdn.jsdelivr.net/npm/alap@3/dist/alap.iife.js"></script>
<script>
  Alap.defineAlapLink();
  Alap.registerConfig({
    allLinks: {
      // your links here
    },
  });
</script>
```

Then use `<alap-link query="...">` in Code Blocks throughout your site. The config is inline here — for larger libraries, host a JSON file on your domain and `fetch()` it.

### Shopify (Liquid)

In your theme's `layout/theme.liquid`, before `</body>`:

```html
<script src="https://cdn.jsdelivr.net/npm/alap@3/dist/alap.iife.js"></script>
<script>
  Alap.defineAlapLink();
  Alap.registerConfig({{ 'alap-config.json' | asset_url | json }});
</script>
```

Or inline the config directly. For Shopify, the config JSON file goes in your theme's `assets/` directory.

### Hugo / Jekyll / Static Site Generators

Add to your base template (`baseof.html`, `_layouts/default.html`, etc.):

```html
<script src="https://cdn.jsdelivr.net/npm/alap@3/dist/alap.iife.js"></script>
<script>
  Alap.defineAlapLink();
  fetch('/alap-config.json')
    .then(r => r.json())
    .then(config => Alap.registerConfig(config));
</script>
```

Place `alap-config.json` in your static assets directory (`static/` for Hugo, `assets/` for Jekyll). The `fetch()` runs on page load and registers the config. Then use `<alap-link query="...">` in any page or template. The config is a plain JSON file you build in an Alap editor and commit to your repo.

### GitHub Pages

Same as Hugo/Jekyll — add the script tag to your layout, host the config JSON alongside your pages. Works with any static site generator that outputs HTML.

### CodePen / JSFiddle

In the JS panel settings, add as an external script:
```
https://cdn.jsdelivr.net/npm/alap@3/dist/alap.iife.js
```

Then in JS:
```js
Alap.defineAlapLink();
Alap.registerConfig({ allLinks: { ... } });
```

In HTML:
```html
<alap-link query=".coffee">cafes</alap-link>
```

### Google Sites / Notion / Wikis

Most managed platforms don't allow custom `<script>` tags. For these, you'd need to embed Alap in an iframe pointing to a page you control, or use one of the server examples to generate static menu HTML.

---

## Remote Config Loading

Instead of inlining the config, fetch it from your API:

```html
<script src="https://cdn.jsdelivr.net/npm/alap@3/dist/alap.iife.js"></script>
<script>
  fetch('https://your-api.com/configs/main')
    .then(function(r) { return r.json(); })
    .then(function(raw) {
      var config = Alap.validateConfig(raw);  // sanitize untrusted input
      Alap.defineAlapLink();
      Alap.registerConfig(config);
    });
</script>
```

This works with any of the 9 server examples (Express, Hono, Bun, Flask, Django, FastAPI, Laravel, Gin, Axum).

## What's on `window.Alap`

| Export | What |
|--------|------|
| `defineAlapLink()` | Register the `<alap-link>` custom element |
| `registerConfig(config, name?)` | Feed a config to the web component registry |
| `updateRegisteredConfig(config, name?)` | Update a previously registered config |
| `AlapLinkElement` | The custom element class |
| `AlapUI` | DOM adapter — `new AlapUI(config, '.alap')` |
| `AlapEngine` | Programmatic engine — `new AlapEngine(config)` |
| `validateConfig(raw)` | Sanitize untrusted configs (remote API, JSON files) |
| `mergeConfigs(...configs)` | Compose multiple configs into one |

## Key Files

| File | What |
|------|------|
| `index.html` | The entire example — HTML, CSS, config, and Alap setup in one file |
| `serve.sh` | Python HTTP server on port 9130 (no npm needed) |
