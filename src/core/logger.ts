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

/**
 * Dev-mode diagnostic logger. Warnings are dead-code-eliminated in production
 * builds — any bundler that replaces `process.env.NODE_ENV` with `"production"`
 * (Vite, webpack, Rollup, esbuild) will strip every `warn()` call site to zero bytes.
 */

declare const process: { env: Record<string, string | undefined> } | undefined;

const __DEV__ = typeof process !== 'undefined'
  && typeof process.env !== 'undefined'
  && process.env.NODE_ENV !== 'production';

export function warn(msg: string): void {
  if (__DEV__) {
    console.warn(`[alap] ${msg}`);
  }
}
