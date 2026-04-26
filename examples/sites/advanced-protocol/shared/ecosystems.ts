/**
 * Copyright 2026 Daniel Smith — Apache 2.0
 */

/**
 * Per-adapter ecosystem data. Each entry is a "personality" for that
 * adapter's demo page — the keyword seeds Algolia HN searches, the links
 * populate static menus/lens/lightbox panels, and the hero image set feeds
 * the lightbox with material that matches the adapter's identity.
 *
 * Keeping this centralized avoids 10 near-identical demo pages while
 * giving each adapter something distinct to browse.
 */

import type { AlapLink } from 'alap/core';

export type EcosystemId =
  | 'dom'
  | 'web-component'
  | 'react'
  | 'vue'
  | 'svelte'
  | 'solid'
  | 'qwik'
  | 'alpine'
  | 'astro';

export interface Ecosystem {
  /** Display label for h1 / nav. */
  label: string;

  /** Algolia HN search alias — multi-word queries routed through $alias. */
  hnSearchAlias: string;
  hnSearchQuery: string;

  /** Static `allLinks` for this adapter — tagged `.ecosystem` by default. */
  links: Record<string, AlapLink>;

  /** Lens-friendly items (have description + meta for the card layout). */
  lensLinks: Record<string, AlapLink>;

  /** Lightbox items (have image + altText for fullscreen media). */
  lightboxLinks: Record<string, AlapLink>;

  /** One-liner shown in the adapter's page intro. */
  tagline: string;
}

/**
 * Stamp every link in `obj` with the adapter's ecosystem tag plus a
 * bucket tag (`menu` / `lens` / `image`) so expressions can target each
 * group independently. Tags already on the link are preserved.
 *
 *   buildConfig('dom') → `.dom` matches every static link in the page
 *   `.dom + .menu`     → just the plain menu rows
 *   `.dom + .lens`     → just the lens-shaped entries (with description + meta)
 *   `.dom + .image`    → just the lightbox-shaped entries (with image URL)
 */
function tagged(
  obj: Record<string, AlapLink>,
  ecosystem: string,
  bucket: string,
): Record<string, AlapLink> {
  const out: Record<string, AlapLink> = {};
  for (const [id, link] of Object.entries(obj)) {
    out[id] = {
      ...link,
      tags: Array.from(new Set([...(link.tags ?? []), ecosystem, bucket])),
    };
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────
// Ecosystem: DOM (vanilla JS)
// ─────────────────────────────────────────────────────────────────────
const DOM: Ecosystem = {
  label: 'Vanilla DOM',
  tagline: 'No framework, no build step required. Plain anchors + a config object.',
  hnSearchAlias: 'vanilla_js',
  hnSearchQuery: 'vanilla javascript',
  links: tagged({
    mdn: { label: 'MDN Web Docs', url: 'https://developer.mozilla.org', tags: ['reference'] },
    caniuse: { label: 'Can I use…', url: 'https://caniuse.com', tags: ['reference'] },
    tc39: { label: 'TC39 Proposals', url: 'https://github.com/tc39/proposals', tags: ['reference', 'spec'] },
    whatwg: { label: 'WHATWG HTML Standard', url: 'https://html.spec.whatwg.org/', tags: ['reference', 'spec'] },
  }, 'dom', 'menu'),
  lensLinks: tagged({
    htmx: {
      label: 'htmx — hypermedia-oriented JS',
      url: 'https://htmx.org',
      tags: ['library'],
      meta: {
        author: 'Carson Gross',
        stars: '43k',
        summary: 'Access AJAX, WebSockets and SSE from HTML attributes.',
      },
    },
    alpine_hn: {
      label: 'Alpine.js — minimal reactivity',
      url: 'https://alpinejs.dev',
      tags: ['library'],
      meta: {
        author: 'Caleb Porzio',
        stars: '28k',
        summary: '15 KB reactive framework for mostly-HTML pages.',
      },
    },
  }, 'dom', 'lens'),
  lightboxLinks: tagged({
    commit_strip: {
      label: 'CommitStrip — "The New Intern"',
      url: 'https://www.commitstrip.com/en/2016/03/15/the-new-intern/',
      image: 'https://www.commitstrip.com/wp-content/uploads/2016/03/Strip-Le-nouveau-stagiaire-english650-final.jpg',
      altText: 'Comic strip about a new dev intern confused by legacy code',
      tags: ['image'],
    },
  }, 'dom', 'image'),
};

// ─────────────────────────────────────────────────────────────────────
// Ecosystem: Web Component
// ─────────────────────────────────────────────────────────────────────
const WC: Ecosystem = {
  label: 'Web Component',
  tagline: '<alap-link> custom element — framework-agnostic, shadow-DOM isolated.',
  hnSearchAlias: 'web_components',
  hnSearchQuery: 'web components',
  links: tagged({
    lit: { label: 'Lit — small library for web components', url: 'https://lit.dev', tags: ['library'] },
    openwc: { label: 'Open Web Components', url: 'https://open-wc.org', tags: ['reference'] },
    wcorg: { label: 'webcomponents.org', url: 'https://www.webcomponents.org/', tags: ['reference'] },
    shadow_dom_spec: { label: 'Shadow DOM v1 Spec', url: 'https://dom.spec.whatwg.org/#shadow-trees', tags: ['spec'] },
  }, 'wc', 'menu'),
  lensLinks: tagged({
    material_web: {
      label: 'Material Web Components',
      url: 'https://github.com/material-components/material-web',
      tags: ['library'],
      meta: {
        author: 'Google',
        stars: '6k',
        summary: "Google's official Material Design components as custom elements.",
      },
    },
  }, 'wc', 'lens'),
  lightboxLinks: tagged({
    shadow_dom_diagram: {
      label: 'Shadow DOM tree structure',
      url: 'https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM',
      image: 'https://mdn.github.io/shared-assets/images/diagrams/dom/shadow-dom/shadow-tree.svg',
      altText: 'Diagram showing light DOM and shadow DOM trees',
      tags: ['image'],
    },
  }, 'wc', 'image'),
};

// ─────────────────────────────────────────────────────────────────────
// Ecosystem: React
// ─────────────────────────────────────────────────────────────────────
const REACT: Ecosystem = {
  label: 'React',
  tagline: '<AlapLink> components via React 18 context. Hooks-friendly.',
  hnSearchAlias: 'react_hooks',
  hnSearchQuery: 'react hooks',
  links: tagged({
    react_dev: { label: 'react.dev — official docs', url: 'https://react.dev', tags: ['reference'] },
    react_gg: { label: 'react.gg — visual course', url: 'https://react.gg', tags: ['tutorial'] },
    redux: { label: 'Redux — predictable state container', url: 'https://redux.js.org', tags: ['library'] },
    tanstack_query: { label: 'TanStack Query', url: 'https://tanstack.com/query', tags: ['library'] },
  }, 'react', 'menu'),
  lightboxLinks: tagged({
    react_fiber_diagram: {
      label: 'React Fiber reconciler diagram',
      url: 'https://github.com/acdlite/react-fiber-architecture',
      image: 'https://raw.githubusercontent.com/acdlite/react-fiber-architecture/master/reconciler.png',
      altText: 'React Fiber architecture diagram',
      tags: ['image'],
    },
  }, 'react', 'image'),
};

// ─────────────────────────────────────────────────────────────────────
// Ecosystem: Vue
// ─────────────────────────────────────────────────────────────────────
const VUE: Ecosystem = {
  label: 'Vue 3',
  tagline: 'Composition API + <AlapLink> via provide/inject. Template-reactive.',
  hnSearchAlias: 'vue_composition',
  hnSearchQuery: 'vue composition api',
  links: tagged({
    vuejs: { label: 'vuejs.org — official docs', url: 'https://vuejs.org', tags: ['reference'] },
    pinia: { label: 'Pinia — Vue state management', url: 'https://pinia.vuejs.org', tags: ['library'] },
    vueuse: { label: 'VueUse — composable utilities', url: 'https://vueuse.org', tags: ['library'] },
    vitepress: { label: 'VitePress — static site generator', url: 'https://vitepress.dev', tags: ['tool'] },
  }, 'vue', 'menu'),
  lensLinks: tagged({
    vue_mastery: {
      label: 'Vue Mastery — tutorials',
      url: 'https://www.vuemastery.com',
      tags: ['tutorial'],
      meta: {
        summary: 'Video-first Vue training, including content by Evan You and Adam Wathan.',
      },
    },
  }, 'vue', 'lens'),
  lightboxLinks: tagged({
    vue_reactivity_graph: {
      label: 'Vue 3 reactivity graph',
      url: 'https://vuejs.org/guide/extras/reactivity-in-depth.html',
      image: 'https://vuejs.org/assets/reactivity-basics.B7I-EN1S.png',
      altText: 'Vue 3 reactivity system diagram',
      tags: ['image'],
    },
  }, 'vue', 'image'),
};

// ─────────────────────────────────────────────────────────────────────
// Ecosystem: Svelte
// ─────────────────────────────────────────────────────────────────────
const SVELTE: Ecosystem = {
  label: 'Svelte 5',
  tagline: '$state / $derived / $effect runes. Compiler-level reactivity.',
  hnSearchAlias: 'svelte_runes',
  hnSearchQuery: 'svelte runes',
  links: tagged({
    svelte_dev: { label: 'svelte.dev — official docs', url: 'https://svelte.dev', tags: ['reference'] },
    sveltekit: { label: 'SvelteKit — app framework', url: 'https://kit.svelte.dev', tags: ['framework'] },
    svelte_society: { label: 'Svelte Society — community', url: 'https://sveltesociety.dev', tags: ['community'] },
    skeleton: { label: 'Skeleton — UI toolkit', url: 'https://skeleton.dev', tags: ['library'] },
  }, 'svelte', 'menu'),
  lensLinks: tagged({
    rich_harris: {
      label: 'Rich Harris — "Frameworks without the framework"',
      url: 'https://svelte.dev/blog/frameworks-without-the-framework',
      tags: ['blog'],
      meta: {
        author: 'Rich Harris',
        summary: 'The essay that launched the compile-to-vanilla-JS idea behind Svelte.',
      },
    },
  }, 'svelte', 'lens'),
  lightboxLinks: tagged({
    svelte_logo: {
      label: 'Svelte logo',
      url: 'https://svelte.dev',
      image: 'https://svelte.dev/svelte-logo.svg',
      altText: 'The Svelte logo — a stylized orange "S"',
      tags: ['image'],
    },
  }, 'svelte', 'image'),
};

// ─────────────────────────────────────────────────────────────────────
// Ecosystem: Solid
// ─────────────────────────────────────────────────────────────────────
const SOLID: Ecosystem = {
  label: 'SolidJS',
  tagline: 'Fine-grained reactivity. Signals, not a VDOM.',
  hnSearchAlias: 'solidjs',
  hnSearchQuery: 'solidjs',
  links: tagged({
    solidjs_com: { label: 'solidjs.com — official docs', url: 'https://www.solidjs.com', tags: ['reference'] },
    solid_start: { label: 'SolidStart — metaframework', url: 'https://start.solidjs.com', tags: ['framework'] },
    solid_router: { label: 'Solid Router', url: 'https://github.com/solidjs/solid-router', tags: ['library'] },
  }, 'solid', 'menu'),
  lensLinks: tagged({
    ryan_carniato: {
      label: 'Ryan Carniato on fine-grained reactivity',
      url: 'https://dev.to/ryansolid/a-hands-on-introduction-to-fine-grained-reactivity-3ndf',
      tags: ['blog'],
      meta: {
        author: 'Ryan Carniato',
        summary: "Solid's creator explains signals vs. VDOM — the core case for Solid's design.",
      },
    },
  }, 'solid', 'lens'),
  lightboxLinks: tagged({
    solid_js_perf: {
      label: 'JS framework benchmark — Solid',
      url: 'https://krausest.github.io/js-framework-benchmark/',
      image: 'https://opengraph.githubassets.com/1/krausest/js-framework-benchmark',
      altText: 'Screenshot of js-framework-benchmark results showing Solid near the top',
      tags: ['image'],
    },
  }, 'solid', 'image'),
};

// ─────────────────────────────────────────────────────────────────────
// Ecosystem: Qwik
// ─────────────────────────────────────────────────────────────────────
const QWIK: Ecosystem = {
  label: 'Qwik',
  tagline: 'Resumability — skip the hydration cost, not just defer it.',
  hnSearchAlias: 'qwik_resumability',
  hnSearchQuery: 'qwik resumability',
  links: tagged({
    qwik_dev: { label: 'qwik.dev — official docs', url: 'https://qwik.dev', tags: ['reference'] },
    builder_io: { label: 'Builder.io — Qwik maintainers', url: 'https://www.builder.io', tags: ['company'] },
    qwik_city: { label: 'Qwik City — metaframework', url: 'https://qwik.dev/docs/(qwikcity)/', tags: ['framework'] },
  }, 'qwik', 'menu'),
  lensLinks: tagged({
    misko_hevery: {
      label: 'Miško Hevery on resumability',
      url: 'https://www.builder.io/blog/hydration-is-pure-overhead',
      tags: ['blog'],
      meta: {
        author: 'Miško Hevery',
        summary: '"Hydration is pure overhead" — the argument for Qwik\u2019s resumability.',
      },
    },
  }, 'qwik', 'lens'),
  lightboxLinks: tagged({
    qwik_logo: {
      label: 'Qwik logo',
      url: 'https://qwik.dev',
      image: 'https://qwik.dev/logos/qwik-logo.svg',
      altText: 'Qwik logo — stylized lightning bolt',
      tags: ['image'],
    },
  }, 'qwik', 'image'),
};

// ─────────────────────────────────────────────────────────────────────
// Ecosystem: Alpine
// ─────────────────────────────────────────────────────────────────────
const ALPINE: Ecosystem = {
  label: 'Alpine.js',
  tagline: 'x-alap directive. Markup-centric reactivity, 15 KB total.',
  hnSearchAlias: 'alpine_js',
  hnSearchQuery: 'alpine.js livewire',
  links: tagged({
    alpine_dev: { label: 'alpinejs.dev — official docs', url: 'https://alpinejs.dev', tags: ['reference'] },
    livewire: { label: 'Livewire — Laravel + Alpine', url: 'https://livewire.laravel.com', tags: ['framework'] },
    caleb_porzio: { label: 'Caleb Porzio — creator', url: 'https://calebporzio.com', tags: ['author'] },
  }, 'alpine', 'menu'),
  lensLinks: tagged({
    alpine_plugins: {
      label: 'Alpine plugins — mask, focus, morph',
      url: 'https://alpinejs.dev/plugins/intersect',
      tags: ['reference'],
      meta: {
        summary: 'Six official plugins extend the 15 KB core (intersect, focus, persist, mask, morph, anchor).',
      },
    },
  }, 'alpine', 'lens'),
  lightboxLinks: tagged({
    alpine_shot: {
      label: 'Alpine code sample',
      url: 'https://alpinejs.dev/start-here',
      image: 'https://alpinejs.dev/patterns.svg',
      altText: 'Alpine.js decorative pattern',
      tags: ['image'],
    },
  }, 'alpine', 'image'),
};

// ─────────────────────────────────────────────────────────────────────
// Ecosystem: Astro
// ─────────────────────────────────────────────────────────────────────
const ASTRO: Ecosystem = {
  label: 'Astro',
  tagline: 'Islands architecture. <AlapLink> hydrates as a web component.',
  hnSearchAlias: 'astro_islands',
  hnSearchQuery: 'astro islands',
  links: tagged({
    astro_build: { label: 'astro.build — official docs', url: 'https://astro.build', tags: ['reference'] },
    starlight: { label: 'Starlight — docs theme', url: 'https://starlight.astro.build', tags: ['theme'] },
    astro_content: { label: 'Astro Content Layer', url: 'https://docs.astro.build/en/guides/content-collections/', tags: ['feature'] },
  }, 'astro', 'menu'),
  lensLinks: tagged({
    fred_k_schott: {
      label: 'Fred K. Schott on Islands',
      url: 'https://jasonformat.com/islands-architecture/',
      tags: ['blog'],
      meta: {
        author: 'Jason Miller (originator) — Fred K. Schott (popularizer)',
        summary: 'The architectural pattern Astro built its entire pitch on.',
      },
    },
  }, 'astro', 'lens'),
  lightboxLinks: tagged({
    astro_rocket: {
      label: 'Astro rocket hero',
      url: 'https://astro.build',
      image: 'https://astro.build/assets/press/astro-logo-dark.png',
      altText: 'Astro logo',
      tags: ['image'],
    },
  }, 'astro', 'image'),
};

export const ECOSYSTEMS: Record<EcosystemId, Ecosystem> = {
  'dom': DOM,
  'web-component': WC,
  'react': REACT,
  'vue': VUE,
  'svelte': SVELTE,
  'solid': SOLID,
  'qwik': QWIK,
  'alpine': ALPINE,
  'astro': ASTRO,
};
