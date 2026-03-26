import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      'alap/core': resolve(__dirname, '../../src/core/index.ts'),
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
