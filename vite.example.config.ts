/**
 * Vite config for building individual example sites.
 *
 * Usage (via build.sh):
 *   EXAMPLE_NAME=basic EXAMPLE_ROOT=.../sites/basic EXAMPLE_OUTDIR=.../dist/basic \
 *     npx vite build --config vite.example.config.ts
 */

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import solid from 'vite-plugin-solid';
import { resolve } from 'path';
import { readdirSync } from 'fs';

const alapRoot = __dirname;
const exampleName = process.env.EXAMPLE_NAME || 'basic';
const exampleRoot = process.env.EXAMPLE_ROOT || resolve(alapRoot, 'examples/sites', exampleName);
const outDir = process.env.EXAMPLE_OUTDIR || resolve(__dirname, '../web/examples-site/dist', exampleName);

export default defineConfig({
  root: exampleRoot,
  base: `/${exampleName}/`,
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
    },
  },
  build: {
    outDir,
    emptyOutDir: true,
    rollupOptions: {
      input: Object.fromEntries(
        readdirSync(exampleRoot)
          .filter(f => f.endsWith('.html'))
          .map(f => [f.replace('.html', ''), resolve(exampleRoot, f)])
      ),
    },
  },
  plugins: [
    vue(),
    svelte(),
    solid({ include: [resolve(alapRoot, 'src/ui/solid/**')], solid: { generate: 'dom' } }),
    {
      name: 'inject-gallery-link',
      transformIndexHtml(html) {
        const script = `<script>
(function() {
  var btn = document.createElement('button');
  btn.textContent = '\\u2190 Examples Gallery';
  btn.style.cssText = 'position:fixed;top:8px;right:12px;z-index:9999;background:#2240a8;color:#88bbff;border:1px solid #4470cc;border-radius:6px;padding:0.35rem 0.8rem;font:500 0.82rem "DM Sans",system-ui,sans-serif;cursor:pointer;transition:background 0.15s,color 0.15s';
  btn.onmouseenter = function() { btn.style.background='#3366d6'; btn.style.color='#ffd666'; };
  btn.onmouseleave = function() { btn.style.background='#2240a8'; btn.style.color='#88bbff'; };
  btn.onclick = function() { var w = window.open('', 'alapExampleLaunch'); if (!w || w.closed) { window.open('/', 'alapExampleLaunch'); } else { w.focus(); } };
  document.body.appendChild(btn);
})();
</script>`;
        return html.replace('</body>', script + '</body>');
      },
    },
  ],
});
