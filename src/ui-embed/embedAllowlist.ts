/**
 * Copyright 2026 Daniel Smith
 * SPDX-License-Identifier: Apache-2.0
 *
 * Provider registry for embed iframes. Each provider declares its domains,
 * a transform function that converts a public URL to an embeddable URL,
 * a default embed type, and a default height.
 */

import {
  EMBED_VIDEO_HEIGHT,
  EMBED_AUDIO_HEIGHT,
  EMBED_INTERACTIVE_HEIGHT,
} from '../constants';

export type EmbedType = 'video' | 'audio' | 'interactive';

export interface EmbedProvider {
  /** Human-readable provider name (e.g. "YouTube") */
  name: string;
  /** Domains this provider matches (without www prefix — matching strips www) */
  domains: string[];
  /** Convert a public URL to an embeddable iframe src. Returns null if the URL can't be transformed. */
  transform: (url: string) => string | null;
  /** Default embed content type */
  defaultType: EmbedType;
  /** Default iframe height in px */
  defaultHeight: number;
}

// ── YouTube ────────────────────────────────────────────────────────

const YOUTUBE_VIDEO_RE = /(?:youtube\.com\/watch\?.*v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

function transformYouTube(url: string): string | null {
  const match = url.match(YOUTUBE_VIDEO_RE);
  if (!match) return null;
  return `https://www.youtube-nocookie.com/embed/${match[1]}`;
}

// ── Vimeo ──────────────────────────────────────────────────────────

const VIMEO_VIDEO_RE = /vimeo\.com\/(\d+)/;

function transformVimeo(url: string): string | null {
  const match = url.match(VIMEO_VIDEO_RE);
  if (!match) return null;
  return `https://player.vimeo.com/video/${match[1]}`;
}

// ── Spotify ────────────────────────────────────────────────────────

const SPOTIFY_RE = /open\.spotify\.com\/(track|album|playlist|episode|show)\/([a-zA-Z0-9]+)/;

function transformSpotify(url: string): string | null {
  const match = url.match(SPOTIFY_RE);
  if (!match) return null;
  return `https://open.spotify.com/embed/${match[1]}/${match[2]}`;
}

function spotifyHeight(url: string): number {
  const match = url.match(SPOTIFY_RE);
  if (!match) return EMBED_AUDIO_HEIGHT;
  const type = match[1];
  return (type === 'playlist' || type === 'album') ? 352 : EMBED_AUDIO_HEIGHT;
}

// ── CodePen ────────────────────────────────────────────────────────

const CODEPEN_RE = /codepen\.io\/([^/]+)\/(?:pen|full|details)\/([a-zA-Z0-9]+)/;

function transformCodePen(url: string): string | null {
  const match = url.match(CODEPEN_RE);
  if (!match) return null;
  return `https://codepen.io/${match[1]}/embed/${match[2]}?default-tab=result`;
}

// ── CodeSandbox ────────────────────────────────────────────────────

const CODESANDBOX_RE = /codesandbox\.io\/(?:s|p)\/([a-zA-Z0-9-]+)/;

function transformCodeSandbox(url: string): string | null {
  const match = url.match(CODESANDBOX_RE);
  if (!match) return null;
  return `https://codesandbox.io/embed/${match[1]}`;
}

// ── Registry ───────────────────────────────────────────────────────

const PROVIDERS: EmbedProvider[] = [
  {
    name: 'YouTube',
    domains: ['youtube.com', 'youtu.be'],
    transform: transformYouTube,
    defaultType: 'video',
    defaultHeight: EMBED_VIDEO_HEIGHT,
  },
  {
    name: 'Vimeo',
    domains: ['vimeo.com'],
    transform: transformVimeo,
    defaultType: 'video',
    defaultHeight: EMBED_VIDEO_HEIGHT,
  },
  {
    name: 'Spotify',
    domains: ['open.spotify.com'],
    transform: transformSpotify,
    defaultType: 'audio',
    defaultHeight: EMBED_AUDIO_HEIGHT,
  },
  {
    name: 'CodePen',
    domains: ['codepen.io'],
    transform: transformCodePen,
    defaultType: 'interactive',
    defaultHeight: EMBED_INTERACTIVE_HEIGHT,
  },
  {
    name: 'CodeSandbox',
    domains: ['codesandbox.io'],
    transform: transformCodeSandbox,
    defaultType: 'interactive',
    defaultHeight: EMBED_INTERACTIVE_HEIGHT,
  },
];

/**
 * Extract the hostname from a URL, stripping leading "www.".
 * Returns null for malformed URLs.
 */
function extractDomain(url: string): string | null {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return hostname.startsWith('www.') ? hostname.slice(4) : hostname;
  } catch {
    return null;
  }
}

/**
 * Find the matching provider for a URL, or null if none match.
 */
export function matchProvider(url: string): EmbedProvider | null {
  const domain = extractDomain(url);
  if (!domain) return null;

  for (const provider of PROVIDERS) {
    if (provider.domains.some(d => domain === d || domain.endsWith('.' + d))) {
      return provider;
    }
  }
  return null;
}

/**
 * Transform a public URL to an embeddable iframe src.
 * Returns null if the URL doesn't match any provider or can't be transformed.
 */
export function transformUrl(url: string): string | null {
  const provider = matchProvider(url);
  if (!provider) return null;
  return provider.transform(url);
}

/**
 * Check if a URL is from an allowlisted provider.
 * If customAllowlist is provided, only those domains are considered allowlisted
 * (still must be a known provider — custom domains don't bypass the registry).
 */
export function isAllowlisted(url: string, customAllowlist?: string[]): boolean {
  const provider = matchProvider(url);
  if (!provider) return false;

  if (!customAllowlist) return true;

  const domain = extractDomain(url);
  if (!domain) return false;

  return customAllowlist.some(allowed => {
    const normalized = allowed.toLowerCase().replace(/^www\./, '');
    return domain === normalized || domain.endsWith('.' + normalized);
  });
}

/**
 * Get the appropriate iframe height for a URL.
 * Spotify playlists/albums get a taller player than tracks.
 */
export function getEmbedHeight(url: string): number {
  const provider = matchProvider(url);
  if (!provider) return EMBED_VIDEO_HEIGHT;

  if (provider.name === 'Spotify') return spotifyHeight(url);
  return provider.defaultHeight;
}
