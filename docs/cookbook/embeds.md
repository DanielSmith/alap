# Embeds

**[Cookbook](README.md):** [Language Ports](language-ports.md) · [Editors](editors.md) · [Markdown](markdown.md) · [Rich-Text](rich-text.md) · [Accessibility](accessibility.md) · [Existing URLs](existing-urls.md) · [Images and Media](images-and-media.md) · [Placement](placement.md) · [Lightbox Renderer](lightbox.md) · [Lens Renderer](lens.md) · **This Page**

Alap's embed module renders iframes for known providers with per-domain consent management. It works standalone or integrates with the lightbox and lens renderers.

> Alap is a single-maintainer open source project that hasn't been through a third-party audit. Please do your own due diligence — especially when wiring up protocols on servers with local network access.

> Live version: https://examples.alap.info/embed/

## Supported providers

| Provider | Domain(s) | Embed type | Notes |
|---|---|---|---|
| YouTube | `youtube.com`, `youtu.be` | video | Uses `youtube-nocookie.com` for privacy |
| Vimeo | `vimeo.com` | video | |
| Spotify | `open.spotify.com` | audio | Track (152px) vs. playlist/album (352px) heights |
| CodePen | `codepen.io` | interactive | Appends `?default-tab=result` |
| CodeSandbox | `codesandbox.io` | interactive | |

Unknown domains produce a plain link fallback. The provider registry cannot be extended at runtime — only narrowed via `embedAllowlist`.

## Standalone usage

`createEmbed()` is a pure DOM builder. Pass a URL, get back an `HTMLElement` to insert anywhere.

```typescript
import { createEmbed } from 'alap/ui-embed';
import 'alap/ui-embed/embed.css';

// Default policy (prompt) — shows consent placeholder first
document.body.appendChild(
  createEmbed('https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
);

// Auto-allow — iframe loads immediately
document.body.appendChild(
  createEmbed('https://vimeo.com/126718838', undefined, {
    embedPolicy: 'allow',
  }),
);

// Unknown domain — plain link fallback
document.body.appendChild(
  createEmbed('https://example.com/video/123'),
);
```

## Consent policies

| Policy | Behavior |
|---|---|
| `prompt` (default) | Shows a placeholder with "Load" and "Always allow" buttons. User must consent before any iframe loads. |
| `allow` | Iframes load immediately for all allowlisted providers. No prompt. |
| `block` | Never loads iframes. Always renders a plain link, even for known providers. Overrides prior consent. |

Consent is stored in `localStorage` under the key `alap_embed_consent` as a JSON array of domain strings. The `grantConsent()` and `revokeConsent()` functions manage it programmatically:

```typescript
import { grantConsent, revokeConsent, hasConsent } from 'alap/ui-embed';

grantConsent('youtube.com');     // user consented
hasConsent('youtube.com');       // true
revokeConsent('youtube.com');    // withdraw consent
```

## Options

```typescript
interface AlapEmbedOptions {
  embedPolicy?: 'prompt' | 'allow' | 'block';
  embedAllowlist?: string[];     // narrow the default provider list
  maxWidth?: number;             // default: 560
  maxHeight?: number;            // overrides provider default
}
```

### Custom allowlist

The `embedAllowlist` narrows the built-in registry. It cannot add domains that aren't in the provider registry.

```typescript
// Only allow YouTube and Vimeo — Spotify, CodePen, CodeSandbox become plain links
createEmbed(url, undefined, {
  embedPolicy: 'allow',
  embedAllowlist: ['youtube.com', 'vimeo.com'],
});
```

## Integration with config

Add a `meta.embed` field to any link item. The lightbox and lens renderers detect it automatically.

```typescript
const config: AlapConfig = {
  allLinks: {
    rickroll: {
      label: 'Rick Astley — Never Gonna Give You Up',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      tags: ['video', 'youtube'],
      meta: {
        embed: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        embedType: 'video',       // optional: 'video' | 'audio' | 'interactive'
        artist: 'Rick Astley',
        year: 1987,
      },
    },
  },
};
```

The `embed` and `embedType` meta keys are filtered from the lens field list — they drive rendering, not display.

## Lightbox integration

When a link has `meta.embed` but no image, the lightbox shows the embed in the image area:

```typescript
import { AlapLightbox } from 'alap/ui-lightbox';
import 'alap/ui-lightbox/lightbox.css';

const lightbox = new AlapLightbox(config, {
  embedPolicy: 'allow',
  embedAllowlist: ['youtube.com', 'vimeo.com'],
});
```

Priority: image > embed > text-only panel.

## Lens integration

The lens renders embeds in the meta zone, above the field list:

```typescript
import { AlapLens } from 'alap/ui-lens';
import 'alap/ui-lens/lens.css';

const lens = new AlapLens(config, {
  embedPolicy: 'allow',
});
```

## Security posture

- Embed providers are an explicit per-domain allowlist. A link with an unknown `meta.embed` host falls through to a normal anchor; third-party content is never inlined uninvited.
- Each domain is opt-in twice: once when the integrator adds it to the provider list, and again when the visitor confirms the per-domain consent prompt the renderer shows on first interaction.
- Embed URLs go through the strict-tier sanitizer and are wrapped in the provider's iframe template — raw `iframe`/`script` markup from link metadata is never rendered.

Iframes use a locked-down Permissions Policy matching the providers' own oembed recommendations:

| Attribute | Value |
|---|---|
| `allow` | `accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share` |
| `referrerpolicy` | `strict-origin-when-cross-origin` |
| `loading` | `lazy` |

The `sandbox` attribute is intentionally omitted — YouTube and Spotify embed players fail (Error 153) in sandboxed iframes. Security is enforced by the Permissions Policy (`allow` attribute) and the provider allowlist instead.

## CSS custom properties

```css
:root {
  --alap-embed-max-width: 560px;
  --alap-embed-radius: 8px;
  --alap-embed-placeholder-bg: rgba(255, 255, 255, 0.06);
  --alap-embed-placeholder-color: #b8c4e8;
  --alap-embed-placeholder-hover-bg: rgba(255, 255, 255, 0.1);
  --alap-embed-btn-bg: #3a86ff;
  --alap-embed-btn-bg-hover: #2d6fdb;
  --alap-embed-btn-color: #fff;
  --alap-embed-btn-radius: 6px;
  --alap-embed-provider-color: #7888b8;
  --alap-embed-provider-size: 0.8rem;
  --alap-embed-link-color: #88bbff;
  --alap-embed-link-hover-color: #ffd666;
}
```

## Three DOM outputs

Depending on policy, provider, and consent state, `createEmbed()` returns one of three elements:

1. **`.alap-embed-wrap`** — iframe for allowlisted domains with consent
2. **`.alap-embed-placeholder`** — clickable consent prompt with "Load" and "Always allow" buttons
3. **`.alap-embed-link`** — plain `<a>` fallback for unknown domains or `block` policy
