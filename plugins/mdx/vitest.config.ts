import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.{ts,tsx}'],
    environment: 'happy-dom',
  },
  resolve: {
    alias: {
      // The linked alap package has its own react in node_modules.
      // Force a single copy so hooks work across the boundary.
      react: resolve(__dirname, 'node_modules/react'),
      'react-dom': resolve(__dirname, 'node_modules/react-dom'),
    },
  },
});
