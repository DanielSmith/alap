# Alap for WordPress

WordPress plugin that adds the `[alap]` shortcode for multi-target link menus. No npm, no build step — just a PHP file and the IIFE build.

Both options below use SQLite — single container, no MySQL or MariaDB.

## Quick Start

### (not yet.. in progress) Option A — Instant demo (recommended for first look)

Pre-seeded WordPress with Alap active and demo content ready. No wizard, no activation step.

```bash
cd plugins/wordpress/demo
./run.sh

# → "Alap WordPress demo running at http://localhost:8090"
# → Open browser, see a working page with Alap menus
# → Admin at http://localhost:8090/wp-admin (demo / demo)
```

Stop with:
```bash
podman compose down
```

### Option B — Fresh install (your own site)

Empty WordPress with SQLite. You run the install wizard and set it up yourself.

```bash
cd plugins/wordpress
./run.sh

# → Asks: "Persist database across restarts? [y/N]"
# → "Starting WordPress (SQLite) with Alap plugin..."
# → Open http://localhost:8080, complete the install wizard
# → Activate "Alap" in WP Admin → Plugins
```

Stop with:
```bash
podman compose down
```

Both options use [Podman](https://podman.io/) (or Docker — just replace `podman` with `docker` in the commands).

## Usage

In any post or page:

```
Check out some [alap query=".coffee"]coffee spots[/alap] in the city.

Famous [alap query=".bridge"]bridges[/alap] you should visit.

A macro: [alap query="@cars"]favorite cars[/alap].
```

Each shortcode becomes an `<alap-link>` web component. Readers click to see a menu of destinations.

## Install (manual, no containers)

1. Copy the `wordpress/` directory to `wp-content/plugins/alap/`
2. Copy `dist/alap.iife.js` from the Alap build into the plugin directory
3. Edit `alap-config.js` with your link library (see [Configuration](#configuration) below)
4. Activate "Alap" in WP Admin → Plugins

## Configuration

### How it works

The link library is stored as a JavaScript file (`alap-config.js`) in the plugin directory. This is a deliberate choice for the beta:

- **No database tables** — nothing to migrate, back up separately, or lose during DB restores
- **No admin UI** — no settings page to build, no PHP serialization edge cases
- **Portable** — the same config file works in every Alap example, server, and integration
- **Version-controllable** — commit it alongside your theme, track changes in git
- **No WordPress lock-in** — if you move to a different CMS, the config file goes with you unchanged

The file is a plain JavaScript object assigned to `var alapConfig`. It's loaded as a `<script>` tag before the Alap runtime, so it's available when the web component initializes.

### The config file

Edit `alap-config.js` in the plugin directory (`wp-content/plugins/alap/alap-config.js`):

```js
var alapConfig = {
  settings: {
    listType: "ul",        // "ul" or "ol"
    menuTimeout: 5000,     // auto-dismiss after 5 seconds
    placement: "S"         // menu appears below the link (compass: N, NE, E, SE, S, SW, W, NW, C)
  },

  macros: {
    // Named shortcuts for complex expressions.
    // Use these in shortcodes: [alap query="@bridges"]...[/alap]
    bridges:    { linkItems: ".nyc + .bridge" },
    favorites:  { linkItems: "golden, bluebottle, highline" },
    cars:       { linkItems: ".car" }
  },

  allLinks: {
    // Each entry is a menu item. The key is the item ID.
    brooklyn: {
      label: "Brooklyn Bridge",
      url: "https://en.wikipedia.org/wiki/Brooklyn_Bridge",
      tags: ["nyc", "bridge", "landmark"]
    },
    golden: {
      label: "Golden Gate Bridge",
      url: "https://en.wikipedia.org/wiki/Golden_Gate_Bridge",
      tags: ["sf", "bridge", "landmark"]
    },
    bluebottle: {
      label: "Blue Bottle Coffee",
      url: "https://bluebottlecoffee.com",
      tags: ["coffee", "sf"]
    }
    // ... add your own links here
  }
};
```

### Config structure

| Section | Purpose | Example |
|---------|---------|---------|
| `settings` | Global defaults — list type, timeout, menu placement | `{ menuTimeout: 5000, placement: "S" }` |
| `macros` | Named expressions for reuse in shortcodes | `{ bridges: { linkItems: ".nyc + .bridge" } }` |
| `allLinks` | The link library — every item that can appear in a menu | `{ brooklyn: { label: "...", url: "...", tags: [...] } }` |

### Link entry fields

| Field | Required | Description |
|-------|----------|-------------|
| `label` | Yes | Display text in the menu |
| `url` | Yes | Destination URL |
| `tags` | No | Array of tags for expression queries |
| `cssClass` | No | CSS class added to this menu item |
| `image` | No | Image URL (renders `<img>` instead of text label) |
| `altText` | No | Alt text for image items |
| `targetWindow` | No | Link target — `"_self"`, `"_blank"`, `"fromAlap"` (default: `"fromAlap"`, opens in a named window) |

### Updating the config

1. Edit `alap-config.js` directly (via FTP, file manager, or SSH)
2. Changes take effect on the next page load — no cache to clear, no settings to save
3. WordPress plugin updates will **not** overwrite your config file (it's in `.gitignore` and not part of the plugin distribution)

### Multiple configs

For sites with separate link libraries (e.g., blog vs. docs):

```js
// In alap-config.js
var alapConfig = { /* ... main config ... */ };
var docsConfig = { /* ... docs config ... */ };
```

Update `alap.php` to register both:

```php
wp_add_inline_script('alap-config',
    'Alap.registerConfig(alapConfig);' .
    'Alap.registerConfig(docsConfig, "docs");' .
    'Alap.defineAlapLink();'
);
```

Then use the `config` attribute in shortcodes:

```
[alap query=".api" config="docs"]API reference[/alap]
```

### Future: Admin UI

A future version may add a WordPress settings page for editing the config in the admin dashboard, stored in `wp_options`. The file-based approach will continue to work — the settings page would simply generate the same JavaScript output.

## Shortcode Reference

### Basic usage

```
[alap query=".coffee"]coffee spots[/alap]
```

### All attributes

| Attribute | Description | Example |
|-----------|-------------|---------|
| `query` | Alap expression | `.coffee`, `@bridges`, `brooklyn`, `.nyc + .bridge` |
| `config` | Named config (optional) | `"docs"` |

### Expression syntax

| Syntax | Meaning | Example |
|--------|---------|---------|
| `.tag` | All items with this tag | `.coffee` → all coffee items |
| `itemId` | Specific item by ID | `brooklyn` → Brooklyn Bridge |
| `@macro` | Expand a named macro | `@bridges` → whatever the macro defines |
| `.a + .b` | Intersection (both tags) | `.nyc + .bridge` → NYC bridges |
| `.a \| .b` | Union (either tag) | `.nyc \| .sf` → NYC or SF items |
| `.a - .b` | Subtraction | `.nyc - .tourist` → NYC without tourist tag |

### Examples in posts

```
<!-- Simple tag query -->
Here are some [alap query=".coffee"]great cafes[/alap] to try.

<!-- Specific item -->
Don't miss the [alap query="brooklyn"]Brooklyn Bridge[/alap].

<!-- Macro (best for complex expressions) -->
Check out these [alap query="@favorites"]personal picks[/alap].

<!-- Inline in a sentence -->
The city has amazing [alap query=".park"]parks[/alap],
iconic [alap query=".bridge"]bridges[/alap],
and world-class [alap query=".coffee"]coffee[/alap].
```

## Styling

The plugin adds minimal default styles (dotted underline, pointer cursor) that inherit the theme's link color. Override in your theme's `style.css` or the WordPress Customizer:

### Trigger (the clickable text)

```css
alap-link {
  color: #0073aa;
  text-decoration: underline;
  text-decoration-style: dotted;
  text-underline-offset: 3px;
  cursor: pointer;
}

alap-link:hover {
  text-decoration-style: solid;
}
```

### Menu (Shadow DOM via `::part()`)

The menu renders inside a Shadow DOM, so you style it with `::part()` selectors:

```css
/* Menu container */
alap-link::part(menu) {
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

/* Individual menu items */
alap-link::part(link) {
  color: #333;
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
}

alap-link::part(link):hover {
  background: #f0f0f0;
  color: #0073aa;
}
```

### Available `::part()` names

| Part | Element |
|------|---------|
| `menu` | The menu container |
| `list` | The `<ul>` or `<ol>` inside the menu |
| `item` | Each `<li>` |
| `link` | Each `<a>` inside a list item |
| `image` | Image elements inside items (when using image items) |

### Dark theme example

```css
alap-link::part(menu) {
  background: #1e1e2e;
  border-color: #444;
}

alap-link::part(link) {
  color: #cdd6f4;
}

alap-link::part(link):hover {
  background: #313244;
  color: #89b4fa;
}
```

## Accessibility

The web component handles accessibility automatically:

- `role="button"` and `aria-haspopup="true"` on the trigger
- `role="menu"` and `aria-label` on the menu
- `role="menuitem"` on each link
- Keyboard navigation: Enter/Space to open, arrow keys to navigate, Escape to close
- Focus management: first item receives focus on open, focus returns to trigger on close

No additional WordPress configuration needed.

## How SQLite Works

Both container options use the [SQLite Database Integration](https://github.com/WordPress/sqlite-database-integration) plugin from the WordPress Performance Team. This is an official WordPress project on the path to core inclusion — the same technology behind [WordPress Playground](https://playground.wordpress.net/).

The Dockerfile downloads the plugin at build time and places its `db.php` drop-in into `wp-content/`. WordPress then uses SQLite instead of MySQL for all database operations. Same tables (`wp_options`, `wp_posts`, `wp_users`), same queries, different backend.

### Inspecting the database

The `.ht.sqlite` file is a standard SQLite database:

```bash
sqlite3 wp-content/database/.ht.sqlite
sqlite> .tables
sqlite> SELECT option_name, option_value FROM wp_options
        WHERE option_name IN ('siteurl', 'blogname', 'active_plugins');
sqlite> SELECT post_title, post_status FROM wp_posts WHERE post_status = 'publish';
sqlite> .quit
```

### Regenerating the demo seed database

The demo's `.ht.sqlite` is committed to the repo. To regenerate it:

1. Boot Option B: `./run.sh`
2. Complete the install wizard (site: "Alap Demo", user: `demo`, password: `demo`)
3. Activate the Alap plugin
4. Set permalinks to `/%postname%/` (Settings → Permalinks)
5. Create a page with the demo shortcode content (see `demo/seed/` for reference)
6. Set it as the static front page (Settings → Reading)
7. Delete "Hello World" post, sample page, sample comment
8. Disable comments (Settings → Discussion)
9. Extract the database:

```bash
podman cp <container>:/var/www/html/wp-content/database/.ht.sqlite demo/seed/.ht.sqlite
```

## Files

```
plugins/wordpress/
  alap.php                       Plugin — shortcode, script enqueue, styles
  alap-config.js                 Link library (edit this)
  alap.iife.js                   Alap runtime (copy from dist/)

  Dockerfile                     Option B — fresh WordPress + SQLite
  docker-compose.yml             Option B — single service, port 8080
  docker-compose.persist.yml     Option B — volume override for persistence
  run.sh                         Option B — build and start

  seed/
    wp-config.php                WordPress config for SQLite

  demo/
    Dockerfile                   Option A — pre-seeded instant demo
    docker-compose.yml           Option A — single service, port 8090
    run.sh                       Option A — build and start
    seed/
      wp-config.php              Demo-specific WordPress config
      .ht.sqlite                 Pre-seeded database (committed)
```

## Requirements

- WordPress 6.4+
- PHP 7.4+
- Podman or Docker
- Modern browser (Chrome, Firefox, Safari, Edge — all support web components)

## License

Apache-2.0
