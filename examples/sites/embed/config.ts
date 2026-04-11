/**
 * Copyright 2026 Daniel Smith
 * SPDX-License-Identifier: Apache-2.0
 */

import type { AlapConfig } from 'alap/core';

export const demoConfig: AlapConfig = {
  settings: {
    listType: 'ul',
    menuTimeout: 5000,
  },

  allLinks: {
    // ── Video ──────────────────────────────────────────────────

    rickroll: {
      label: 'Rick Astley — Never Gonna Give You Up',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      tags: ['video', 'youtube'],
      thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg',
      description: 'The classic.',
      meta: {
        embed: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        artist: 'Rick Astley',
        year: 1987,
      },
    },

    ok_go: {
      label: 'OK Go — Here It Goes Again',
      url: 'https://www.youtube.com/watch?v=dTAAsCNK7RA',
      tags: ['video', 'youtube'],
      thumbnail: 'https://img.youtube.com/vi/dTAAsCNK7RA/mqdefault.jpg',
      description: 'Treadmill choreography that launched a thousand memes.',
      meta: {
        embed: 'https://www.youtube.com/watch?v=dTAAsCNK7RA',
        artist: 'OK Go',
        year: 2006,
      },
    },

    vimeo_nature: {
      label: 'A Taste of Iceland',
      url: 'https://vimeo.com/126718838',
      tags: ['video', 'vimeo'],
      description: 'Stunning aerial footage of Iceland landscapes.',
      meta: {
        embed: 'https://vimeo.com/126718838',
        source: 'Vimeo',
      },
    },

    // ── Audio ──────────────────────────────────────────────────

    spotify_track: {
      label: 'Miles Davis — So What',
      url: 'https://open.spotify.com/track/4vLYewWIvqHfKtJDk8c8tq',
      tags: ['audio', 'spotify'],
      description: 'The opening track of Kind of Blue.',
      meta: {
        embed: 'https://open.spotify.com/track/4vLYewWIvqHfKtJDk8c8tq',
        embedType: 'audio',
        artist: 'Miles Davis',
        album: 'Kind of Blue',
      },
    },

    spotify_playlist: {
      label: 'Jazz Classics Playlist',
      url: 'https://open.spotify.com/playlist/37i9dQZF1DXbITWG1ZJKYt',
      tags: ['audio', 'spotify'],
      description: 'A curated collection of essential jazz recordings.',
      meta: {
        embed: 'https://open.spotify.com/playlist/37i9dQZF1DXbITWG1ZJKYt',
        embedType: 'audio',
      },
    },

    // ── Interactive ────────────────────────────────────────────

    codepen_css: {
      label: 'Pure CSS Parallax Scrolling',
      url: 'https://codepen.io/keithclark/pen/JycFw',
      tags: ['interactive', 'codepen'],
      description: 'No JavaScript, just CSS transforms and perspective.',
      meta: {
        embed: 'https://codepen.io/keithclark/pen/JycFw',
        embedType: 'interactive',
        author: 'Keith Clark',
      },
    },

    codesandbox_react: {
      label: 'React Counter Example',
      url: 'https://codesandbox.io/s/new',
      tags: ['interactive', 'codesandbox'],
      description: 'A basic React starter sandbox.',
      meta: {
        embed: 'https://codesandbox.io/s/new',
        embedType: 'interactive',
      },
    },

    // ── No embed (regular links for comparison) ────────────────

    wikipedia_jazz: {
      label: 'Jazz — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Jazz',
      tags: ['reference'],
    },

    wikipedia_rick: {
      label: 'Rickrolling — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Rickrolling',
      tags: ['reference'],
    },
  },
};
