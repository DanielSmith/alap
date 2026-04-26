---
source: cookbook/obsidian-rest-setup.md
modified: '2026-04-23T01:28:01Z'
tags:
- cookbook
title: Obsidian — REST Setup
description: '**Cookbook › Obsidian:** Overview · Get a Vault · Core Mode · **REST
  Setup** · Hardening'
---
# Obsidian — REST Setup

**[[cookbook/README|Cookbook]] › Obsidian:** [[cookbook/obsidian-overview|Overview]] · [[cookbook/obsidian-vault|Get a Vault]] · [[cookbook/obsidian-core|Core Mode]] · **REST Setup** · [[cookbook/obsidian-hardening|Hardening]]

Wiring Alap's `:obsidian:rest:` sub-mode to the **Obsidian Local REST API** plugin. This chapter is setup only — install, API key, self-signed cert, server config, and verification. For server-hardening guidance (which applies to both Core and REST), see [[cookbook/obsidian-hardening|Hardening]].

If you haven't chosen between Core and REST yet, read [[cookbook/obsidian-overview#core-vs-rest|Overview — Core vs REST]] first. If you just want to get data in, [[cookbook/obsidian-vault|Get a Vault]] is upstream of this chapter.

---

## 1. Install the Local REST API plugin

REST mode talks to the **Obsidian Local REST API** plugin over HTTPS on your loopback interface. This section assumes you've never installed an Obsidian plugin before.

1. Open Obsidian.
2. Open settings — gear icon in the bottom-left of the sidebar, or `⌘ ,` / `Ctrl+,`.
3. In the settings pane, click **Community plugins** in the left rail.
4. **If you see "Community plugins are currently disabled":** click **Turn on community plugins**. Obsidian shows a warning about third-party code — acknowledge it. (This flag is per-vault; enabling it for this vault doesn't affect others.)
5. Click **Browse** (under the "Community plugins" heading).
6. In the search box at the top of the browse dialog, type: `Local REST API`.
7. The first result is "Local REST API" by **coddingtonbear**. Click it.
8. Click **Install**. Wait for the "installed" confirmation.
9. Click **Enable** (the button replaces **Install** after install finishes).
10. Close the browse dialog.

## 2. Configure the plugin

After enable, the plugin adds itself to the left rail under "Community plugins" with an entry named **Local REST API**. Click that entry.

You'll see the plugin's settings page. The important fields:

- **API Key.** A long hex string auto-generated on first run. This is the secret that lets any caller talk to the plugin. **Treat it like a password.**
- **Enable Non-encrypted (HTTP) Server.** Leave this **OFF**. The default is HTTPS-only, which is what you want.
- **Encrypted (HTTPS) Server Port.** Default `27124`. Leave it unless it collides with something.
- **Certificate SHA Fingerprint.** Displayed for reference. Alap doesn't need it — the library handles cert validation.

Click the copy-to-clipboard icon next to **API Key** and save the value somewhere you can paste it from in the next step.

## 3. The self-signed cert — what it is and why Alap handles it

The plugin serves over HTTPS on `127.0.0.1:27124`. To do that on loopback, it generates a **self-signed certificate** at install time. Self-signed means: no public certificate authority ever vouched for it. A browser will warn you loudly if you visit `https://127.0.0.1:27124/` manually.

Alap's REST client accepts this cert automatically, but **only** when the target host is a loopback address (`127.0.0.1`, `::1`, or `localhost`). If you ever point `rest.host` at a non-loopback address, the self-signed bypass is silently ignored and ordinary TLS verification applies. You can't accidentally MITM yourself against a remote endpoint.

**You don't need to trust the cert in your OS keychain or browser.** Alap's Node-side HTTPS agent handles the verification bypass per-request, scoped to loopback, and never touches your system trust store.

## 4. Store the API key safely

**Never commit the key.** Never paste it into a browser-visible config. The only correct place is an environment variable the server reads at startup.

The recommended pattern: a `.env` file next to your server, loaded on boot and `.gitignore`-d.

```bash
# .env (next to server.mjs)
OBSIDIAN_API_KEY=paste-the-long-hex-string-here
```

```gitignore
# .gitignore
.env
.env.local
```

Load it in `server.mjs` before importing anything that uses the key:

```js
import 'dotenv/config';  // requires: pnpm add dotenv
```

Or, skip `dotenv` and set the variable inline when starting the server:

```bash
OBSIDIAN_API_KEY=xxx ./serve.sh
```

Alap reads `process.env.OBSIDIAN_API_KEY` automatically when `protocols.obsidian.rest.apiKey` is not set in config. Passing it via config works too, but env is strictly preferred — a stray `console.log(config)` in a debug session won't print the key if it lives in `process.env`.

## 5. Update the server config

Swap the `protocols.obsidian` block in `server.mjs`. Config holds the data; the handler is passed at engine construction (see the `new AlapEngine(...)` line elsewhere in `server.mjs`):

```js
protocols: {
  obsidian: {
    vault: VAULT_NAME,       // display name for obsidian:// URIs

    // REST mode
    rest: {
      // apiKey is read from process.env.OBSIDIAN_API_KEY if omitted
      host: '127.0.0.1',
      port: 27124,
      scheme: 'https',
      // allowedHosts gates where the library is willing to talk.
      // Default is ['127.0.0.1', '::1', 'localhost'] — don't widen
      // unless you know you're tunnelling through an SSH forward or
      // similar. Never add a public hostname here.
      allowedHosts: ['127.0.0.1', '::1', 'localhost'],
      timeoutMs: 3000,
    },
  },
},
```

You can keep `vaultPath` set too — core mode will still work. The sub-mode is picked per expression segment: `:obsidian:core:...` runs filesystem; `:obsidian:rest:...` runs REST.

## 6. Flip the page to use REST

In `index.html`, any trigger you want to go through REST changes prefix:

```html
<!-- was: -->
<a class="alap" data-alap-linkitems=":obsidian:core:bridges:">bridges</a>
<!-- now: -->
<a class="alap" data-alap-linkitems=":obsidian:rest:bridges:">bridges</a>
```

## 7. Start it up

Keep Obsidian running (the plugin only serves while Obsidian is open).

```bash
OBSIDIAN_API_KEY=xxx ./serve.sh
```

Open http://localhost:9178/. Click a `:obsidian:rest:` trigger. You should see fuzzy-ranked results.

## 8. Verify it's REST, not Core

Quick smoke test — break the plugin's connection deliberately:

1. Quit Obsidian.
2. Click a `:obsidian:rest:` trigger on your page.
3. Expected: empty menu or "no results".
4. Your server's console should show a warning like `:obsidian:rest: ECONNREFUSED` or similar — the library refusing to fall back silently.
5. Reopen Obsidian. Reload the page. Results return.

If step 3 shows results anyway, you're running Core by mistake — the trigger is still using `:obsidian:core:`.

## 9. REST-specific errors you'll see

| Warning | Meaning | Fix |
|---------|---------|-----|
| `no API key — set protocols.obsidian.rest.apiKey in config or the OBSIDIAN_API_KEY env var` | Key not found | Set the env var before starting |
| `auth rejected (HTTP 401) — check apiKey` | Key is present but wrong | Copy it again from the plugin settings |
| `auth rejected (HTTP 403)` | Authenticated but denied | Plugin may have a per-endpoint restriction — check its settings |
| `host "X" is not in allowedHosts` | Misconfigured host | Fix `rest.host` or add the name to `rest.allowedHosts` |
| `refusing unsafe vault path — ...` | Plugin returned a suspicious path | The library's path-traversal guard fired; investigate the plugin response |
| `ECONNREFUSED` | Plugin isn't running | Open Obsidian |
| `aborted` | Request hit `timeoutMs` | Increase `timeoutMs` or check plugin health |

All REST warnings pass through the library's `redactKey()` redactor — the API key is never printed to logs.

---

## REST-specific troubleshooting

See [[cookbook/obsidian-overview#general-troubleshooting|Overview — General troubleshooting]] for issues that apply to both modes, and [[cookbook/obsidian-core#core-specific-troubleshooting|Core Mode — Core-specific troubleshooting]] for filesystem-side checks.

### The menu is empty (REST side)

1. **Is Obsidian running?** The plugin only serves while Obsidian is open.
2. **Is the API key set?** `echo "$OBSIDIAN_API_KEY" | wc -c` — should be ≥ 64.
3. **Check the server console.** The library `warn()`s on every failure mode (auth rejected, host blocked, connection refused, timeout). The warning tells you which — see the error table in [step 9 above](#9-rest-specific-errors-youll-see).

### "NODE_TLS_REJECT_UNAUTHORIZED=0 warning"

You don't need to set this. The library's REST client handles the self-signed cert per-request via a scoped `https.Agent({ rejectUnauthorized: false })`, gated to loopback. If you set the env var, you're disabling TLS verification for your **whole Node process**, which is strictly worse.

### DNS rebinding — am I actually vulnerable?

This depends on your server hardening, not your REST setup. See [[cookbook/obsidian-hardening#the-six-defenses-for-your-node-server|Hardening — The six defenses]], particularly host-header validation.

### I want to run this on a remote machine

Then REST mode over SSH-tunnelled loopback is the path:

```bash
# on your laptop
ssh -L 27124:127.0.0.1:27124 remote-host
# Alap on remote-host sees 127.0.0.1:27124 → tunnels to your local Obsidian
```

Adding the remote hostname to `rest.allowedHosts` directly would work technically, but you lose the library's loopback TLS-bypass gate. Tunnelled loopback keeps every safety invariant intact.

---

## Next

→ [[cookbook/obsidian-hardening|Hardening]] — server-level defenses that apply to both Core and REST. If you're exposing this past a personal dev box, read it.
