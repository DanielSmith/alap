import { defineConfig } from 'vitepress';
import { alapPlugin } from 'vitepress-alap';

export default defineConfig({
  title: 'Alap + VitePress',
  description: 'Example: using <alap-link> in VitePress docs',

  head: [
    ['script', { src: '/alap.iife.js' }],
    ['script', { src: '/docs-config.js' }],
  ],

  vite: {
    plugins: [
      alapPlugin(),
    ],
  },
});
