# Embeds API

**[API Reference](README.md):** [Engine](engine.md) · [Types](types.md) · [Storage](storage.md) · [Events](events.md) · [Security](security.md) · [Servers](servers.md) · [Placement](placement.md) · [Lightbox](lightbox.md) · [Lens](lens.md) · **This Page** · [Coordinators](coordinators.md) · [Config Registry](config-registry.md)

Iframe rendering for rich media (YouTube, Vimeo, Spotify, CodePen, CodeSandbox) with consent management and provider detection.

> See also: [Cookbook: Embeds](../cookbook/embeds.md) for usage patterns.

## Quick start

```typescript
import { createEmbed } from 'alap';

const el = createEmbed('https://youtu.be/dQw4w9WgXcQ', 'video', {
  embedPolicy: 'prompt',
});
document.body.appendChild(el);
```

## `createEmbed(url, embedType?, options?)`

DOM builder for embed iframes. Returns one of three results depending on policy and consent:

1. **Iframe wrapper** — for allowlisted domains with consent
2. **Consent placeholder** — clickable prompt that replaces itself with an iframe on click
3. **Plain link** — fallback for unknown domains or blocked policy

```typescript
function createEmbed(
  url: string,
  embedType?: EmbedType,
  options?: AlapEmbedOptions,
): HTMLElement
```

### `AlapEmbedOptions`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `embedPolicy` | `EmbedPolicy` | `'prompt'` | Consent policy for this embed |
| `embedAllowlist` | `string[]` | all providers | Restrict to these domains only |
| `maxWidth` | `number` | none | Maximum iframe width |
| `maxHeight` | `number` | none | Maximum iframe height |

## Provider functions

### `matchProvider(url)`

Finds the matching provider for a URL.

```typescript
function matchProvider(url: string): EmbedProvider | null

matchProvider('https://youtu.be/abc123')           // → YouTube provider
matchProvider('https://example.com/random')         // → null
```

### `transformUrl(url)`

Transforms a public URL to an embeddable iframe src.

```typescript
function transformUrl(url: string): string | null

transformUrl('https://youtu.be/dQw4w9WgXcQ')
// → 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'

transformUrl('https://vimeo.com/123456')
// → 'https://player.vimeo.com/video/123456'

transformUrl('https://example.com')
// → null
```

### `isAllowlisted(url, customAllowlist?)`

Checks if a URL is from an allowlisted provider. If `customAllowlist` is provided, only those domains are considered.

```typescript
function isAllowlisted(url: string, customAllowlist?: string[]): boolean
```

### `getEmbedHeight(url)`

Gets the appropriate iframe height for a URL. Spotify playlists and albums get a taller player than individual tracks.

```typescript
function getEmbedHeight(url: string): number
```

## Consent management

Consent is stored per-domain in localStorage. The `EmbedPolicy` controls behavior:

| Policy | Behavior |
|--------|----------|
| `'prompt'` | **Privacy-first (default):** Shows a placeholder and only loads the iframe after the user clicks to grant consent. |
| `'allow'` | Always load for allowlisted domains |
| `'block'` | Never load; ignores stored consent |

### Functions

```typescript
function shouldLoadEmbed(domain: string, policy: EmbedPolicy): boolean
function grantConsent(domain: string): void
function revokeConsent(domain: string): void
function hasConsent(domain: string): boolean
```

::: details Example: consent flow
```typescript
import { shouldLoadEmbed, grantConsent, hasConsent } from 'alap';

// Check before loading
if (shouldLoadEmbed('youtube.com', 'prompt')) {
  // User previously granted consent, load iframe
}

// Grant consent (persists in localStorage)
grantConsent('youtube.com');

// Check consent directly
hasConsent('youtube.com'); // → true

// Revoke
revokeConsent('youtube.com');
```
:::

## Types

### `EmbedType`

```typescript
type EmbedType = 'video' | 'audio' | 'interactive';
```

### `EmbedPolicy`

```typescript
type EmbedPolicy = 'prompt' | 'allow' | 'block';
```

### `EmbedProvider`

```typescript
interface EmbedProvider {
  name: string;                            // e.g. "YouTube"
  domains: string[];                       // matching domains (www stripped)
  transform: (url: string) => string | null; // public URL → iframe src
  defaultType: EmbedType;
  defaultHeight: number;                   // iframe height in px
}
```

## Supported providers

| Provider | Domains | Type | Transform |
|----------|---------|------|-----------|
| YouTube | youtube.com, youtu.be | video | `youtube-nocookie.com/embed/{id}` |
| Vimeo | vimeo.com | video | `player.vimeo.com/video/{id}` |
| Spotify | open.spotify.com | audio | `open.spotify.com/embed/{type}/{id}` |
| CodePen | codepen.io | interactive | `codepen.io/{user}/embed/{id}` |
| CodeSandbox | codesandbox.io | interactive | `codesandbox.io/embed/{id}` |

YouTube uses the `youtube-nocookie.com` domain for privacy-enhanced embedding.

## Security posture

Embeds are scoped by three layers working together:

- **Provider allowlist.** `isAllowlisted()` gates which URLs `createEmbed` accepts. The built-in list covers only the supported providers above; extend it per-page via the `customAllowlist` argument if needed.
- **Per-domain consent.** `createEmbed` returns a placeholder until `grantConsent(domain)` opts in — domain by domain, revocable at any time.
- **Iframe hardening.** Iframes render with `referrerpolicy="strict-origin-when-cross-origin"`, `loading="lazy"`, and a locked `allow` attribute scoped to the providers' oembed needs. `sandbox` is intentionally not set — several providers fail in sandboxed iframes; hardening relies on the `allow` policy and the provider allowlist instead. See [Security in the cookbook](../cookbook/embeds.md#security) for the full list.

Embeds are protected by Alap's standard URL sanitization. For more on how Alap ensures that data from different sources is handled safely, see our [Security Trust Model](security.md#trust-model-how-alap-handles-data).
