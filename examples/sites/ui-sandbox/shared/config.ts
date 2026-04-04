/**
 * Shared config for placement sandbox tests.
 *
 * Intentionally uses long labels that mimic real-world metadata extraction
 * (the kind of titles TTT gets from sites like HuffPost, Astro docs, etc.)
 * to stress-test menu width vs. viewport overflow.
 */

import type { AlapConfig } from 'alap/core';

export const sandboxConfig: AlapConfig = {
  settings: {
    listType: 'ul',
    menuTimeout: 8000,
  },

  allLinks: {
    // --- Short labels (happy path) ---
    brooklyn: {
      label: 'Brooklyn Bridge',
      url: 'https://en.wikipedia.org/wiki/Brooklyn_Bridge',
      tags: ['bridge', 'short'],
    },
    goldengate: {
      label: 'Golden Gate Bridge',
      url: 'https://en.wikipedia.org/wiki/Golden_Gate_Bridge',
      tags: ['bridge', 'short'],
    },
    bluebottle: {
      label: 'Blue Bottle Coffee',
      url: 'https://bluebottlecoffee.com',
      tags: ['coffee', 'short'],
    },

    // --- Long labels (TTT-style metadata titles) ---
    portless: {
      label: 'portless | Named Routes with Vite and Vue Router',
      url: 'https://portless.dev',
      tags: ['long', 'tech'],
    },
    astro_editor: {
      label: 'Astro Editor \u2014 Schema-Driven Content Management for Static Sites',
      url: 'https://astro.build',
      tags: ['long', 'tech'],
    },
    huffpost_1: {
      label: 'HuffPost \u2014 Breaking News, U.S. and World News Coverage',
      url: 'https://huffpost.com',
      tags: ['long', 'news'],
    },
    huffpost_2: {
      label: 'HuffPost \u2014 Breaking News and Entertainment Analysis',
      url: 'https://huffpost.com/entertainment',
      tags: ['long', 'news'],
    },
    nyt_cooking: {
      label: 'NYT Cooking \u2014 Recipes and Tips from The New York Times',
      url: 'https://cooking.nytimes.com',
      tags: ['long', 'news'],
    },
    mdn_intersection: {
      label: 'IntersectionObserver API \u2014 Web APIs | MDN Web Docs',
      url: 'https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserver',
      tags: ['long', 'tech'],
    },
    rust_book: {
      label: 'The Rust Programming Language \u2014 Comprehensive Guide (2024 Edition)',
      url: 'https://doc.rust-lang.org/book/',
      tags: ['long', 'tech'],
    },
    wiki_quantum: {
      label: 'Quantum entanglement \u2014 Wikipedia, the free encyclopedia',
      url: 'https://en.wikipedia.org/wiki/Quantum_entanglement',
      tags: ['long', 'science'],
    },

    // --- Many items for scroll clamping ---
    mercury: { label: 'Mercury', url: '#', tags: ['planet'] },
    venus: { label: 'Venus', url: '#', tags: ['planet'] },
    earth: { label: 'Earth', url: '#', tags: ['planet'] },
    mars: { label: 'Mars', url: '#', tags: ['planet'] },
    jupiter: { label: 'Jupiter', url: '#', tags: ['planet'] },
    saturn: { label: 'Saturn', url: '#', tags: ['planet'] },
    uranus: { label: 'Uranus', url: '#', tags: ['planet'] },
    neptune: { label: 'Neptune', url: '#', tags: ['planet'] },
    pluto: { label: 'Pluto (dwarf planet)', url: '#', tags: ['planet'] },
    ceres: { label: 'Ceres (dwarf planet)', url: '#', tags: ['planet'] },
    eris: { label: 'Eris (dwarf planet)', url: '#', tags: ['planet'] },
    moon: { label: 'The Moon', url: '#', tags: ['planet'] },
    europa: { label: 'Europa', url: '#', tags: ['planet'] },
    titan: { label: 'Titan', url: '#', tags: ['planet'] },
  },
};
