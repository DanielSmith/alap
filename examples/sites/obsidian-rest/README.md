# Obsidian REST API Menus (`:obsidian:rest:`)

Browser menus powered by a running Obsidian vault, accessed via the
[Obsidian Local REST API](https://github.com/coddingtonbear/obsidian-local-rest-api)
plugin. The page uses the `:obsidian:rest:` protocol to drive dynamic
menus from live note search results. The plugin URL and API key never
leave the Node server.

For the no-plugin version (reads Markdown directly off disk), see
[../obsidian/](../obsidian/).

## Architecture

```
 browser                Node server                 Obsidian app
┌────────┐  POST   ┌──────────────────┐  HTTP+Bearer  ┌──────────┐
│  main  ├────────►│ /api/obsidian/   ├──────────────►│ Local    │
│  .mjs  │◄────────┤    query         │◄──────────────┤ REST API │
└────────┘  JSON   └──────────────────┘     JSON      │ plugin   │
            links           ▲                         └──────────┘
                            │ obsidianHandler
                            │ (REST mode)
                            ▼
                     alap/protocols/obsidian
```

The browser sees only a generic POST to your own server. The Node
server is the only thing that knows the plugin URL or holds the API
key.

## Prerequisites

1. **Build the library** so the IIFE bundle and the obsidian protocol
   exist on disk:

   ```bash
   cd /usr/local/projects/Alap/alap
   pnpm build
   ```

2. **Install the plugin in Obsidian**, by following its
   [setup guide](https://github.com/coddingtonbear/obsidian-local-rest-api).
   The plugin enables HTTPS on port `27124` by default; HTTP on `27123`
   is opt-in via the plugin's "Enable Insecure Server" setting. This
   example defaults to HTTPS — no cert install needed (the Node server
   sets `rejectUnauthorized: false`, scoped to loopback).

3. **Copy the API key** from the plugin's settings tab in Obsidian.

## Running

```bash
ALAP_OBSIDIAN_REST_KEY=your-key-here ./serve.sh
```

Then open <http://localhost:9179>.

### Optional environment overrides

| Variable | Default | Notes |
|----------|---------|-------|
| `PORT` | `9179` | The example server's port |
| `ALAP_OBSIDIAN_REST_KEY` | _(none — required)_ | Plugin API key |
| `ALAP_OBSIDIAN_REST_HOST` | `127.0.0.1` | Plugin host |
| `ALAP_OBSIDIAN_REST_PORT` | `27124` | Use `27123` if you've enabled the plugin's HTTP server |
| `ALAP_OBSIDIAN_REST_SCHEME` | `https` | Use `http` if you switched the port |
| `ALAP_OBSIDIAN_VAULT_NAME` | `AlapDocs` | Display name in `obsidian://` URIs (must match what your installed Obsidian app calls the vault for click-through to work) |
| `ALAP_OBSIDIAN_ATTACHMENT_FOLDER` | `Media` | Per-vault setting from Obsidian's "Attachment folder path" (Settings → Files & Links). Used when the proxy falls back from a literal `/vault/<name>` lookup. Set to empty string to disable the fallback. |

### HTTP mode (optional)

If you've turned on the plugin's "Enable Insecure Server" setting and
want to skip TLS entirely on loopback:

```bash
ALAP_OBSIDIAN_REST_SCHEME=http \
ALAP_OBSIDIAN_REST_PORT=27123 \
ALAP_OBSIDIAN_REST_KEY=your-key-here \
./serve.sh
```

### Why `rejectUnauthorized: false` is safe here

The example server sets `rejectUnauthorized: false` on its REST config
so the self-signed cert on loopback doesn't trip Node's TLS verifier.
Alap's REST client only honors that option when
`scheme === 'https' && isLocalhost(host)`, so it can't accidentally
apply to a remote host. You don't need to install the plugin's
self-signed cert in your OS keychain. (Direct browser fetches to the
plugin would still need it, but this example never does that.)

## Why a Node proxy?

Three reasons the browser doesn't talk to the plugin directly:

1. **API key stays out of the browser.** Anyone with the page can read
   any string you embed in client-side code. Keeping the key on the
   server means the page works for any visitor without leaking creds.
2. **No cert install needed.** The browser can use plain HTTP to your
   own dev server while the server uses whatever scheme makes sense to
   reach the plugin (HTTP loopback or HTTPS-with-bypass).
3. **Easier audit story.** One server-side place to log, rate-limit, or
   add allowlists. The browser-side code is generic.

## Comparison to `:obsidian:core:`

| | `:obsidian:core:` | `:obsidian:rest:` |
|--|--|--|
| Vault access | Reads Markdown files via `fs.readFile` | Calls plugin's HTTP API |
| Obsidian app running? | Not required | Required |
| Plugin install? | Not required | Required |
| Vault path on server | Required | Not required (plugin owns it) |
| API key | Not used | Required |
| Server-only | Yes (Node `fs`) | Yes (HTTP fetch + key) |
| Stays current with Obsidian edits | After file save | Live |

The `:core:` mode is lighter to set up; `:rest:` mode lets the
authoritative copy stay inside Obsidian (so the app's own caches,
sync, and indexes are the source of truth).
