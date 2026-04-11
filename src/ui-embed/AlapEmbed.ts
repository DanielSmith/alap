/**
 * Copyright 2026 Daniel Smith
 * SPDX-License-Identifier: Apache-2.0
 *
 * DOM builder for embed iframes. Does NOT manage its own lifecycle —
 * returns an HTMLElement that the caller (lens or lightbox) appends.
 *
 * Three possible outputs:
 *   1. Iframe wrapper — sandboxed iframe for allowlisted domains with consent
 *   2. Placeholder — clickable consent prompt, replaces itself with iframe on click
 *   3. Plain link — fallback for unknown domains or blocked policy
 */

import {
  EMBED_ALLOW_POLICY,
  EMBED_REFERRER_POLICY,
  EMBED_DEFAULT_MAX_WIDTH,
} from '../constants';
import { matchProvider, transformUrl, isAllowlisted, getEmbedHeight } from './embedAllowlist';
import type { EmbedType } from './embedAllowlist';
import { shouldLoadEmbed, grantConsent } from './embedConsent';
import type { EmbedPolicy } from './embedConsent';

export interface AlapEmbedOptions {
  embedPolicy?: EmbedPolicy;
  embedAllowlist?: string[];
  maxWidth?: number;
  maxHeight?: number;
}

/**
 * Create an embed element for the given URL.
 *
 * @param url       The public URL (e.g. youtube.com/watch?v=...)
 * @param embedType Optional override for the embed type
 * @param options   Policy, allowlist, and size overrides
 * @returns         An HTMLElement to insert into the DOM
 */
export function createEmbed(
  url: string,
  embedType?: EmbedType,
  options?: AlapEmbedOptions,
): HTMLElement {
  const policy = options?.embedPolicy ?? 'prompt';
  const maxWidth = options?.maxWidth ?? EMBED_DEFAULT_MAX_WIDTH;

  const provider = matchProvider(url);

  // Not a known provider or not in custom allowlist → plain link
  if (!provider || !isAllowlisted(url, options?.embedAllowlist)) {
    return createLink(url);
  }

  const embedSrc = transformUrl(url);
  if (!embedSrc) return createLink(url);

  const type = embedType ?? provider.defaultType;
  const height = options?.maxHeight ?? getEmbedHeight(url);
  const domain = extractDomain(url);

  // Policy check
  if (shouldLoadEmbed(domain, policy)) {
    return createIframe(embedSrc, height, maxWidth);
  }

  // Policy is 'block' → plain link (shouldLoadEmbed returns false, but no prompt either)
  if (policy === 'block') {
    return createLink(url);
  }

  // Policy is 'prompt' and no consent → placeholder
  return createPlaceholder(url, embedSrc, provider.name, type, height, maxWidth, domain);
}

/**
 * Extract hostname from URL, stripping www prefix.
 */
function extractDomain(url: string): string {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return hostname.startsWith('www.') ? hostname.slice(4) : hostname;
  } catch {
    return '';
  }
}

/**
 * Build a sandboxed iframe element.
 */
function createIframe(src: string, height: number, maxWidth: number): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'alap-embed-wrap';
  wrap.style.maxWidth = `${maxWidth}px`;

  const iframe = document.createElement('iframe');
  iframe.src = src;
  iframe.height = String(height);
  iframe.allow = EMBED_ALLOW_POLICY;
  iframe.referrerPolicy = EMBED_REFERRER_POLICY as ReferrerPolicy;
  iframe.loading = 'lazy';
  iframe.setAttribute('allowfullscreen', '');

  wrap.appendChild(iframe);
  return wrap;
}

/**
 * Build a consent placeholder with "Load" and "Always allow" buttons.
 */
function createPlaceholder(
  originalUrl: string,
  embedSrc: string,
  providerName: string,
  _type: EmbedType,
  height: number,
  maxWidth: number,
  domain: string,
): HTMLElement {
  const placeholder = document.createElement('div');
  placeholder.className = 'alap-embed-placeholder';
  placeholder.style.minHeight = `${Math.min(height, 160)}px`;
  placeholder.style.maxWidth = `${maxWidth}px`;

  const providerLabel = document.createElement('span');
  providerLabel.className = 'alap-embed-placeholder-provider';
  providerLabel.textContent = providerName;

  const label = document.createElement('span');
  label.className = 'alap-embed-placeholder-label';
  label.textContent = `Load ${providerName} content`;

  const loadBtn = document.createElement('button');
  loadBtn.className = 'alap-embed-load-btn';
  loadBtn.textContent = 'Load';
  loadBtn.type = 'button';

  const alwaysBtn = document.createElement('button');
  alwaysBtn.className = 'alap-embed-always-btn';
  alwaysBtn.textContent = `Always allow ${domain}`;
  alwaysBtn.type = 'button';

  placeholder.appendChild(providerLabel);
  placeholder.appendChild(label);
  placeholder.appendChild(loadBtn);
  placeholder.appendChild(alwaysBtn);

  // Load once — replace placeholder with iframe
  loadBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    replacePlaceholder(placeholder, embedSrc, height, maxWidth);
  });

  // Always allow — grant consent, then load
  alwaysBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    grantConsent(domain);
    replacePlaceholder(placeholder, embedSrc, height, maxWidth);
  });

  // Clicking the placeholder itself also loads once
  placeholder.addEventListener('click', () => {
    replacePlaceholder(placeholder, embedSrc, height, maxWidth);
  });

  return placeholder;
}

/**
 * Replace a placeholder element with an iframe in-place.
 */
function replacePlaceholder(
  placeholder: HTMLElement,
  embedSrc: string,
  height: number,
  maxWidth: number,
): void {
  const iframe = createIframe(embedSrc, height, maxWidth);
  placeholder.replaceWith(iframe);
}

/**
 * Build a plain link fallback.
 */
function createLink(url: string): HTMLElement {
  const link = document.createElement('a');
  link.className = 'alap-embed-link';
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = url;
  return link;
}
