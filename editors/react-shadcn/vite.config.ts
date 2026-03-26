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
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import tailwindcss from '@tailwindcss/vite';
import { metaGrabberPlugin } from '../shared/meta-grabber-plugin';
import path from 'path';

const alapRoot = path.resolve(__dirname, '../../src');

export default defineConfig({
  plugins: [react(), svgr(), tailwindcss(), metaGrabberPlugin()],
  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(__dirname, './src') },
      { find: 'alap/react', replacement: path.join(alapRoot, 'ui/react/index.ts') },
      { find: 'alap/storage', replacement: path.join(alapRoot, 'storage/index.ts') },
      { find: 'alap/core', replacement: path.join(alapRoot, 'core/index.ts') },
      { find: 'alap', replacement: path.join(alapRoot, 'index.ts') },
    ],
  },
});
