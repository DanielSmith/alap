import { defineConfig } from 'vite';
import mdx from '@mdx-js/rollup';
import { resolve } from 'path';
import remarkAlapMDX from '../../../plugins/mdx/src/remarkAlapMDX';

const root = resolve(__dirname, '../../..');

export default defineConfig({
  plugins: [
    mdx({
      remarkPlugins: [remarkAlapMDX],
      jsxImportSource: 'react',
    }),
  ],
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'react',
  },
  resolve: {
    alias: {
      'alap/core': resolve(root, 'src/core/index.ts'),
      'alap/react': resolve(root, 'src/ui/react/index.ts'),
    },
  },
});
