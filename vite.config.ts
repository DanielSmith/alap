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

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import solid from 'vite-plugin-solid';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      'alap/core': resolve(__dirname, 'src/core/index.ts'),
      'alap/react': resolve(__dirname, 'src/ui/react/index.ts'),
      'alap/vue': resolve(__dirname, 'src/ui/vue/index.ts'),
      'alap/svelte': resolve(__dirname, 'src/ui/svelte/index.ts'),
      'alap/solid': resolve(__dirname, 'src/ui/solid/index.ts'),
      'alap/alpine': resolve(__dirname, 'src/ui/alpine/index.ts'),
      'alap/astro': resolve(__dirname, 'src/ui/astro/index.ts'),
      'alap/storage': resolve(__dirname, 'src/storage/index.ts'),
      'alap/qwik': resolve(__dirname, 'src/ui/qwik/index.ts'),
      'alap': resolve(__dirname, 'src/index.ts'),
      'rehype-alap': resolve(__dirname, 'plugins/rehype-alap/src/index.ts'),
    },
  },
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        'core/index': resolve(__dirname, 'src/core/index.ts'),
        'react/index': resolve(__dirname, 'src/ui/react/index.ts'),
        'vue/index': resolve(__dirname, 'src/ui/vue/index.ts'),
        'svelte/index': resolve(__dirname, 'src/ui/svelte/index.ts'),
        'storage/index': resolve(__dirname, 'src/storage/index.ts'),
        'astro/index': resolve(__dirname, 'src/ui/astro/index.ts'),
        'alpine/index': resolve(__dirname, 'src/ui/alpine/index.ts'),
        'solid/index': resolve(__dirname, 'src/ui/solid/index.ts'),
        'qwik/index': resolve(__dirname, 'src/ui/qwik/index.ts'),
      },
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime', 'vue', /^svelte($|\/)/, /^solid-js($|\/)/, /^@builder\.io\/qwik($|\/)/, 'idb'],
    },
  },
  plugins: [
    vue(),
    svelte(),
    solid({ include: ['src/ui/solid/**'], solid: { generate: 'dom' } }),
  ],
  test: {
    globals: false,
    globalSetup: ['tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    projects: [
      {
        test: {
          name: 'core',
          include: ['tests/core/**/*.test.ts'],
        },
      },
      {
        plugins: [vue(), svelte()],
        resolve: {
          conditions: ['browser'],
        },
        test: {
          name: 'ui',
          include: ['tests/ui/**/*.test.{ts,tsx}'],
          exclude: ['tests/ui/solid/**', 'tests/ui/qwik/**'],
          environment: 'happy-dom',
        },
      },
      {
        plugins: [solid({ solid: { generate: 'dom' } })],
        esbuild: { jsx: 'preserve' },
        resolve: {
          conditions: ['browser'],
        },
        test: {
          name: 'ui-solid',
          include: ['tests/ui/solid/**/*.test.tsx'],
          environment: 'happy-dom',
        },
      },
      {
        test: {
          name: 'ui-qwik',
          include: ['tests/ui/qwik/**/*.test.ts'],
        },
      },
      {
        test: {
          name: 'storage',
          include: ['tests/storage/**/*.test.ts'],
          // remote-store-integration requires a running Express server.
          // Run it separately: pnpm vitest run tests/storage/remote-store-integration.test.ts
          exclude: ['tests/storage/remote-store-integration.test.ts'],
        },
      },
    ],
  },
});
