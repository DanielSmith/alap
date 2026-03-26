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

import { getContext } from 'svelte';
import type { AlapEngine } from '../../core/AlapEngine';
import type { AlapConfig } from '../../core/types';

const ALAP_KEY = Symbol.for('alap');

export interface AlapContextValue {
  engine: AlapEngine;
  config: AlapConfig;
  menuTimeout: number;
  defaultMenuStyle?: Record<string, string>;
  defaultMenuClassName?: string;
  defaultListType: 'ul' | 'ol';
  defaultMaxVisibleItems: number;
}

export function getAlapContext(): AlapContextValue {
  const ctx = getContext<AlapContextValue>(ALAP_KEY);
  if (!ctx) {
    throw new Error('useAlap() must be used within an <AlapProvider>');
  }
  return ctx;
}
