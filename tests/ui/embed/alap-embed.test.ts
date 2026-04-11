/**
 * Copyright 2026 Daniel Smith
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createEmbed } from '../../../src/ui-embed/AlapEmbed';
import { grantConsent } from '../../../src/ui-embed/embedConsent';
import { EMBED_ALLOW_POLICY, EMBED_REFERRER_POLICY, EMBED_VIDEO_HEIGHT, EMBED_AUDIO_HEIGHT, EMBED_INTERACTIVE_HEIGHT } from '../../../src/constants';

/*
 * NOTE: Three placeholder tests below produce "AsyncTaskManager" stderr from
 * happy-dom. This is cosmetic — happy-dom tries to navigate iframes when they
 * connect to the DOM, then complains when its task manager tears down. The
 * tests pass correctly; the stderr is a known happy-dom limitation with
 * dynamically-inserted iframes and does not indicate a real error.
 */

beforeEach(() => {
  localStorage.clear();
});

// ── Iframe output ──────────────────────────────────────────────────

describe('createEmbed — iframe mode', () => {
  it('creates iframe for YouTube with allow policy', () => {
    const el = createEmbed('https://www.youtube.com/watch?v=dQw4w9WgXcQ', undefined, {
      embedPolicy: 'allow',
    });

    expect(el.className).toBe('alap-embed-wrap');
    const iframe = el.querySelector('iframe');
    expect(iframe).not.toBeNull();
    expect(iframe!.src).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
  });

  it('sets allow policy on iframe', () => {
    const el = createEmbed('https://www.youtube.com/watch?v=dQw4w9WgXcQ', undefined, {
      embedPolicy: 'allow',
    });
    const iframe = el.querySelector('iframe')!;
    expect(iframe.allow).toBe(EMBED_ALLOW_POLICY);
  });

  it('sets referrer policy on iframe', () => {
    const el = createEmbed('https://www.youtube.com/watch?v=dQw4w9WgXcQ', undefined, {
      embedPolicy: 'allow',
    });
    const iframe = el.querySelector('iframe')!;
    expect(iframe.referrerPolicy).toBe(EMBED_REFERRER_POLICY);
  });

  it('sets lazy loading on iframe', () => {
    const el = createEmbed('https://www.youtube.com/watch?v=dQw4w9WgXcQ', undefined, {
      embedPolicy: 'allow',
    });
    const iframe = el.querySelector('iframe')!;
    expect(iframe.loading).toBe('lazy');
  });

  it('sets allowfullscreen on iframe', () => {
    const el = createEmbed('https://www.youtube.com/watch?v=dQw4w9WgXcQ', undefined, {
      embedPolicy: 'allow',
    });
    const iframe = el.querySelector('iframe')!;
    expect(iframe.hasAttribute('allowfullscreen')).toBe(true);
  });

  it('uses provider default height for video', () => {
    const el = createEmbed('https://www.youtube.com/watch?v=dQw4w9WgXcQ', undefined, {
      embedPolicy: 'allow',
    });
    const iframe = el.querySelector('iframe')!;
    expect(iframe.height).toBe(String(EMBED_VIDEO_HEIGHT));
  });

  it('respects maxHeight override', () => {
    const el = createEmbed('https://www.youtube.com/watch?v=dQw4w9WgXcQ', undefined, {
      embedPolicy: 'allow',
      maxHeight: 200,
    });
    const iframe = el.querySelector('iframe')!;
    expect(iframe.height).toBe('200');
  });

  it('respects maxWidth override', () => {
    const el = createEmbed('https://www.youtube.com/watch?v=dQw4w9WgXcQ', undefined, {
      embedPolicy: 'allow',
      maxWidth: 800,
    });
    expect(el.style.maxWidth).toBe('800px');
  });

  it('creates iframe for prompt policy with prior consent', () => {
    grantConsent('youtube.com');
    const el = createEmbed('https://www.youtube.com/watch?v=dQw4w9WgXcQ', undefined, {
      embedPolicy: 'prompt',
    });
    expect(el.querySelector('iframe')).not.toBeNull();
  });

  it('creates iframe for Vimeo', () => {
    const el = createEmbed('https://vimeo.com/123456789', undefined, { embedPolicy: 'allow' });
    const iframe = el.querySelector('iframe')!;
    expect(iframe.src).toBe('https://player.vimeo.com/video/123456789');
  });

  it('creates iframe for Spotify track', () => {
    const el = createEmbed('https://open.spotify.com/track/abc123', undefined, { embedPolicy: 'allow' });
    const iframe = el.querySelector('iframe')!;
    expect(iframe.src).toBe('https://open.spotify.com/embed/track/abc123');
    expect(iframe.height).toBe(String(EMBED_AUDIO_HEIGHT));
  });

  it('creates iframe for CodePen', () => {
    const el = createEmbed('https://codepen.io/dsmith/pen/abcXYZ', undefined, { embedPolicy: 'allow' });
    const iframe = el.querySelector('iframe')!;
    expect(iframe.src).toBe('https://codepen.io/dsmith/embed/abcXYZ?default-tab=result');
    expect(iframe.height).toBe(String(EMBED_INTERACTIVE_HEIGHT));
  });

  it('creates iframe for CodeSandbox', () => {
    const el = createEmbed('https://codesandbox.io/s/my-proj', undefined, { embedPolicy: 'allow' });
    const iframe = el.querySelector('iframe')!;
    expect(iframe.src).toBe('https://codesandbox.io/embed/my-proj');
  });
});

// ── Placeholder output ─────────────────────────────────────────────

describe('createEmbed — placeholder mode', () => {
  it('creates placeholder for prompt policy without consent', () => {
    const el = createEmbed('https://www.youtube.com/watch?v=dQw4w9WgXcQ');

    expect(el.className).toBe('alap-embed-placeholder');
    expect(el.querySelector('iframe')).toBeNull();
  });

  it('shows provider name in placeholder', () => {
    const el = createEmbed('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    const provider = el.querySelector('.alap-embed-placeholder-provider');
    expect(provider).not.toBeNull();
    expect(provider!.textContent).toBe('YouTube');
  });

  it('shows load button in placeholder', () => {
    const el = createEmbed('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    const btn = el.querySelector('.alap-embed-load-btn');
    expect(btn).not.toBeNull();
    expect(btn!.textContent).toBe('Load');
  });

  it('shows always-allow button with domain', () => {
    const el = createEmbed('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    const btn = el.querySelector('.alap-embed-always-btn');
    expect(btn).not.toBeNull();
    expect(btn!.textContent).toBe('Always allow youtube.com');
  });

  it('load button replaces placeholder with iframe', () => {
    const el = createEmbed('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    document.body.appendChild(el);

    const btn = el.querySelector('.alap-embed-load-btn') as HTMLButtonElement;
    btn.click();

    // Placeholder should be replaced
    expect(document.querySelector('.alap-embed-placeholder')).toBeNull();
    const wrap = document.querySelector('.alap-embed-wrap');
    expect(wrap).not.toBeNull();
    expect(wrap!.querySelector('iframe')).not.toBeNull();

    wrap!.remove();
  });

  it('always-allow button grants consent and loads iframe', () => {
    const el = createEmbed('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    document.body.appendChild(el);

    const btn = el.querySelector('.alap-embed-always-btn') as HTMLButtonElement;
    btn.click();

    expect(document.querySelector('.alap-embed-placeholder')).toBeNull();
    expect(document.querySelector('.alap-embed-wrap iframe')).not.toBeNull();

    // Consent should be persisted
    const stored = JSON.parse(localStorage.getItem('alap_embed_consent') ?? '[]');
    expect(stored).toContain('youtube.com');

    document.querySelector('.alap-embed-wrap')!.remove();
  });

  it('clicking placeholder itself loads the iframe', () => {
    const el = createEmbed('https://vimeo.com/123456789');
    document.body.appendChild(el);

    el.click();

    expect(document.querySelector('.alap-embed-placeholder')).toBeNull();
    expect(document.querySelector('.alap-embed-wrap iframe')).not.toBeNull();

    document.querySelector('.alap-embed-wrap')!.remove();
  });
});

// ── Plain link output ──────────────────────────────────────────────

describe('createEmbed — plain link mode', () => {
  it('returns link for unknown domains', () => {
    const el = createEmbed('https://example.com/video/123');
    expect(el.tagName).toBe('A');
    expect(el.className).toBe('alap-embed-link');
    expect((el as HTMLAnchorElement).href).toBe('https://example.com/video/123');
  });

  it('returns link for block policy even on known provider', () => {
    const el = createEmbed('https://www.youtube.com/watch?v=dQw4w9WgXcQ', undefined, {
      embedPolicy: 'block',
    });
    expect(el.tagName).toBe('A');
    expect(el.className).toBe('alap-embed-link');
  });

  it('returns link when provider is known but not in custom allowlist', () => {
    const el = createEmbed('https://www.youtube.com/watch?v=dQw4w9WgXcQ', undefined, {
      embedPolicy: 'allow',
      embedAllowlist: ['vimeo.com'],
    });
    expect(el.tagName).toBe('A');
  });

  it('link has noopener noreferrer rel', () => {
    const el = createEmbed('https://example.com/video') as HTMLAnchorElement;
    expect(el.rel).toBe('noopener noreferrer');
  });

  it('link opens in new tab', () => {
    const el = createEmbed('https://example.com/video') as HTMLAnchorElement;
    expect(el.target).toBe('_blank');
  });

  it('returns link for URL that matches provider domain but cannot be transformed', () => {
    // YouTube channel page — matchProvider returns YouTube but transform returns null
    const el = createEmbed('https://www.youtube.com/channel/UCxyz', undefined, {
      embedPolicy: 'allow',
    });
    expect(el.tagName).toBe('A');
  });
});

// ── Default policy ─────────────────────────────────────────────────

describe('createEmbed — default behavior', () => {
  it('defaults to prompt policy', () => {
    const el = createEmbed('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    // No consent given, so should be placeholder
    expect(el.className).toBe('alap-embed-placeholder');
  });
});
