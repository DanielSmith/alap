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

import { describe, it, expect } from 'vitest';
import { matchProvider, transformUrl, isAllowlisted, getEmbedHeight } from '../../../src/ui-embed/embedAllowlist';
import { EMBED_VIDEO_HEIGHT, EMBED_AUDIO_HEIGHT, EMBED_INTERACTIVE_HEIGHT } from '../../../src/constants';

// ── matchProvider ──────────────────────────────────────────────────

describe('matchProvider', () => {
  it('matches youtube.com', () => {
    const p = matchProvider('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(p).not.toBeNull();
    expect(p!.name).toBe('YouTube');
  });

  it('matches youtu.be short links', () => {
    const p = matchProvider('https://youtu.be/dQw4w9WgXcQ');
    expect(p).not.toBeNull();
    expect(p!.name).toBe('YouTube');
  });

  it('matches vimeo.com', () => {
    const p = matchProvider('https://vimeo.com/123456789');
    expect(p).not.toBeNull();
    expect(p!.name).toBe('Vimeo');
  });

  it('matches open.spotify.com', () => {
    const p = matchProvider('https://open.spotify.com/track/abc123');
    expect(p).not.toBeNull();
    expect(p!.name).toBe('Spotify');
  });

  it('matches codepen.io', () => {
    const p = matchProvider('https://codepen.io/user/pen/abc123');
    expect(p).not.toBeNull();
    expect(p!.name).toBe('CodePen');
  });

  it('matches codesandbox.io', () => {
    const p = matchProvider('https://codesandbox.io/s/abc123');
    expect(p).not.toBeNull();
    expect(p!.name).toBe('CodeSandbox');
  });

  it('returns null for unknown domains', () => {
    expect(matchProvider('https://example.com/video')).toBeNull();
  });

  it('returns null for malformed URLs', () => {
    expect(matchProvider('not a url')).toBeNull();
  });

  it('strips www prefix when matching', () => {
    const p = matchProvider('https://www.vimeo.com/123456');
    expect(p).not.toBeNull();
    expect(p!.name).toBe('Vimeo');
  });

  it('is case insensitive on hostname', () => {
    const p = matchProvider('https://WWW.YOUTUBE.COM/watch?v=dQw4w9WgXcQ');
    expect(p).not.toBeNull();
    expect(p!.name).toBe('YouTube');
  });
});

// ── transformUrl ───────────────────────────────────────────────────

describe('transformUrl', () => {
  describe('YouTube', () => {
    it('transforms standard watch URL', () => {
      expect(transformUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ'))
        .toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
    });

    it('transforms youtu.be short link', () => {
      expect(transformUrl('https://youtu.be/dQw4w9WgXcQ'))
        .toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
    });

    it('handles URL with extra query params', () => {
      expect(transformUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30'))
        .toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
    });

    it('returns null for YouTube channel page (no video ID)', () => {
      expect(transformUrl('https://www.youtube.com/channel/UCxyz')).toBeNull();
    });
  });

  describe('Vimeo', () => {
    it('transforms standard video URL', () => {
      expect(transformUrl('https://vimeo.com/123456789'))
        .toBe('https://player.vimeo.com/video/123456789');
    });

    it('returns null for non-video Vimeo page', () => {
      expect(transformUrl('https://vimeo.com/features')).toBeNull();
    });
  });

  describe('Spotify', () => {
    it('transforms track URL', () => {
      expect(transformUrl('https://open.spotify.com/track/abc123'))
        .toBe('https://open.spotify.com/embed/track/abc123');
    });

    it('transforms album URL', () => {
      expect(transformUrl('https://open.spotify.com/album/xyz789'))
        .toBe('https://open.spotify.com/embed/album/xyz789');
    });

    it('transforms playlist URL', () => {
      expect(transformUrl('https://open.spotify.com/playlist/list1'))
        .toBe('https://open.spotify.com/embed/playlist/list1');
    });

    it('transforms episode URL', () => {
      expect(transformUrl('https://open.spotify.com/episode/ep1'))
        .toBe('https://open.spotify.com/embed/episode/ep1');
    });

    it('transforms show URL', () => {
      expect(transformUrl('https://open.spotify.com/show/show1'))
        .toBe('https://open.spotify.com/embed/show/show1');
    });
  });

  describe('CodePen', () => {
    it('transforms pen URL', () => {
      expect(transformUrl('https://codepen.io/dsmith/pen/abcXYZ'))
        .toBe('https://codepen.io/dsmith/embed/abcXYZ?default-tab=result');
    });

    it('transforms full view URL', () => {
      expect(transformUrl('https://codepen.io/dsmith/full/abcXYZ'))
        .toBe('https://codepen.io/dsmith/embed/abcXYZ?default-tab=result');
    });

    it('transforms details URL', () => {
      expect(transformUrl('https://codepen.io/dsmith/details/abcXYZ'))
        .toBe('https://codepen.io/dsmith/embed/abcXYZ?default-tab=result');
    });
  });

  describe('CodeSandbox', () => {
    it('transforms sandbox URL', () => {
      expect(transformUrl('https://codesandbox.io/s/my-project-abc'))
        .toBe('https://codesandbox.io/embed/my-project-abc');
    });

    it('transforms project URL', () => {
      expect(transformUrl('https://codesandbox.io/p/my-project-abc'))
        .toBe('https://codesandbox.io/embed/my-project-abc');
    });
  });

  it('returns null for unknown domains', () => {
    expect(transformUrl('https://example.com/video/123')).toBeNull();
  });
});

// ── isAllowlisted ──────────────────────────────────────────────────

describe('isAllowlisted', () => {
  it('returns true for known providers with no custom allowlist', () => {
    expect(isAllowlisted('https://www.youtube.com/watch?v=abc')).toBe(true);
    expect(isAllowlisted('https://vimeo.com/123')).toBe(true);
  });

  it('returns false for unknown domains', () => {
    expect(isAllowlisted('https://evil.com/video')).toBe(false);
  });

  it('respects custom allowlist — included domain', () => {
    expect(isAllowlisted('https://www.youtube.com/watch?v=abc', ['youtube.com'])).toBe(true);
  });

  it('respects custom allowlist — excluded known provider', () => {
    expect(isAllowlisted('https://www.youtube.com/watch?v=abc', ['vimeo.com'])).toBe(false);
  });

  it('custom allowlist does not bypass registry — unknown domain rejected', () => {
    expect(isAllowlisted('https://evil.com/video', ['evil.com'])).toBe(false);
  });

  it('custom allowlist normalizes www prefix', () => {
    expect(isAllowlisted('https://www.youtube.com/watch?v=abc', ['www.youtube.com'])).toBe(true);
  });
});

// ── getEmbedHeight ─────────────────────────────────────────────────

describe('getEmbedHeight', () => {
  it('returns video height for YouTube', () => {
    expect(getEmbedHeight('https://www.youtube.com/watch?v=abc')).toBe(EMBED_VIDEO_HEIGHT);
  });

  it('returns video height for Vimeo', () => {
    expect(getEmbedHeight('https://vimeo.com/123')).toBe(EMBED_VIDEO_HEIGHT);
  });

  it('returns audio height for Spotify track', () => {
    expect(getEmbedHeight('https://open.spotify.com/track/abc')).toBe(EMBED_AUDIO_HEIGHT);
  });

  it('returns taller height for Spotify playlist', () => {
    expect(getEmbedHeight('https://open.spotify.com/playlist/abc')).toBe(352);
  });

  it('returns taller height for Spotify album', () => {
    expect(getEmbedHeight('https://open.spotify.com/album/abc')).toBe(352);
  });

  it('returns interactive height for CodePen', () => {
    expect(getEmbedHeight('https://codepen.io/user/pen/abc')).toBe(EMBED_INTERACTIVE_HEIGHT);
  });

  it('returns interactive height for CodeSandbox', () => {
    expect(getEmbedHeight('https://codesandbox.io/s/abc')).toBe(EMBED_INTERACTIVE_HEIGHT);
  });

  it('returns video height for unknown domains', () => {
    expect(getEmbedHeight('https://example.com/vid')).toBe(EMBED_VIDEO_HEIGHT);
  });
});
