/**
 * Vite config for the Alap examples gallery.
 *
 * Serves all examples from one dev server and builds them into
 * a single dist/ with shared chunks (one copy of Alap, frameworks deduped).
 *
 *   pnpm dev      → http://localhost:5173/
 *   pnpm build    → dist/
 *   pnpm preview  → serve dist/
 */

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import solid from 'vite-plugin-solid';
import { resolve, join } from 'path';
import { readdirSync, existsSync, statSync, cpSync } from 'fs';

const sitesRoot = __dirname;
const alapRoot = resolve(sitesRoot, '../..');

// Examples that have their own build systems — skip for the Vite build
const SKIP = new Set([
  'astro-integration', 'eleventy', 'hugo', 'vitepress',  // own build systems
  'mdx',                                                   // needs @mdx-js/rollup plugin
  // 'lightbox' — imports from src/ui-lightbox (resolved via Vite aliases)
  'shared',                                                // not an example
  'dist',                                                   // build output
  'node_modules',
  'README.md',
]);

// Discover all example HTML entry points (up to 2 levels deep)
const entries: Record<string, string> = {};
for (const name of readdirSync(sitesRoot)) {
  if (SKIP.has(name)) continue;
  const dir = join(sitesRoot, name);
  if (!statSync(dir).isDirectory()) continue;
  const html = join(dir, 'index.html');
  if (existsSync(html)) {
    entries[name] = html;
  }
  // Discover additional HTML pages in this directory (e.g. shapes.html, shadows.html)
  for (const file of readdirSync(dir)) {
    if (file === 'index.html') continue;
    if (!file.endsWith('.html')) continue;
    const pageName = file.replace('.html', '');
    entries[`${name}/${pageName}`] = join(dir, file);
  }
  // Check subdirectories (e.g. ui-sandbox/svelte/, placement/animation/)
  for (const sub of readdirSync(dir)) {
    if (SKIP.has(sub)) continue;
    const subDir = join(dir, sub);
    if (!statSync(subDir).isDirectory()) continue;
    const subHtml = join(subDir, 'index.html');
    if (existsSync(subHtml)) {
      entries[`${name}/${sub}`] = subHtml;
    }
  }
}

export default defineConfig({
  root: sitesRoot,
  base: '/',
  resolve: {
    alias: {
      'alap/core': resolve(alapRoot, 'src/core/index.ts'),
      'alap/react': resolve(alapRoot, 'src/ui/react/index.ts'),
      'alap/vue': resolve(alapRoot, 'src/ui/vue/index.ts'),
      'alap/svelte': resolve(alapRoot, 'src/ui/svelte/index.ts'),
      'alap/solid': resolve(alapRoot, 'src/ui/solid/index.ts'),
      'alap/alpine': resolve(alapRoot, 'src/ui/alpine/index.ts'),
      'alap/astro': resolve(alapRoot, 'src/ui/astro/index.ts'),
      'alap/storage': resolve(alapRoot, 'src/storage/index.ts'),
      'alap': resolve(alapRoot, 'src/index.ts'),
      'rehype-alap': resolve(alapRoot, 'plugins/rehype-alap/src/index.ts'),
      'remark-alap': resolve(alapRoot, 'plugins/remark-alap/src/index.ts'),
      'tiptap-alap': resolve(alapRoot, 'plugins/tiptap-alap/src/index.ts'),
    },
  },
  build: {
    outDir: resolve(sitesRoot, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        gallery: resolve(sitesRoot, 'index.html'),
        ...entries,
      },
    },
  },
  plugins: [
    vue(),
    svelte(),
    solid({ include: [resolve(alapRoot, 'src/ui/solid/**'), resolve(sitesRoot, 'solid/**'), resolve(sitesRoot, 'ui-sandbox/solid/**')], solid: { generate: 'dom' } }),
    {
      // Copy static files for self-contained examples (cdn, htmx)
      // that use IIFE scripts and HTML fragments Vite can't bundle.
      name: 'copy-static-examples',
      closeBundle() {
        const dist = resolve(sitesRoot, 'dist');

        // CDN: non-module scripts
        for (const f of ['alap.iife.js', 'config.js', 'app.js']) {
          const src = join(sitesRoot, 'cdn', f);
          if (existsSync(src)) cpSync(src, join(dist, 'cdn', f));
        }

        // htmx: non-module scripts + HTML fragments
        for (const f of ['alap.iife.js', 'config.js']) {
          const src = join(sitesRoot, 'htmx', f);
          if (existsSync(src)) cpSync(src, join(dist, 'htmx', f));
        }
        const fragSrc = join(sitesRoot, 'htmx', 'fragments');
        const fragDst = join(dist, 'htmx', 'fragments');
        if (existsSync(fragSrc)) cpSync(fragSrc, fragDst, { recursive: true });

        // Lightbox images (referenced as runtime strings in config)
        const lbImgSrc = join(sitesRoot, 'lightbox', 'images');
        const lbImgDst = join(dist, 'lightbox', 'images');
        if (existsSync(lbImgSrc)) cpSync(lbImgSrc, lbImgDst, { recursive: true });

        // Shared images
        const imgSrc = join(sitesRoot, 'shared', 'img');
        const imgDst = join(dist, 'shared', 'img');
        if (existsSync(imgSrc)) cpSync(imgSrc, imgDst, { recursive: true });
      },
    },
  ],
});
