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

import { describe, expect, it } from 'vitest';
import {
  PLACEHOLDER_LABEL_EMPTY,
  PLACEHOLDER_LABEL_ERROR,
  PLACEHOLDER_LABEL_LOADING,
  placeholderDescriptor,
} from '../../../src/ui/shared/progressivePlaceholder';
import type { SourceState } from '../../../src/core/types';
import { MENU_ITEM_CLASS } from '../../../src/constants';

function source(status: SourceState['status'], token = 'tok-1'): SourceState {
  return { status, token } as SourceState;
}

describe('placeholderDescriptor', () => {
  it('emits loading attrs + label', () => {
    const desc = placeholderDescriptor(source('loading'));
    expect(desc.attrs.role).toBe('none');
    expect(desc.attrs['aria-live']).toBe('polite');
    expect(desc.attrs['data-alap-placeholder']).toBe('loading');
    expect(desc.attrs['data-alap-placeholder-token']).toBe('tok-1');
    expect(desc.className).toBe(`${MENU_ITEM_CLASS} alap-placeholder alap-placeholder-loading`);
    expect(desc.label).toBe(PLACEHOLDER_LABEL_LOADING);
  });

  it('emits error attrs + label', () => {
    const desc = placeholderDescriptor(source('error', 'tok-err'));
    expect(desc.attrs['data-alap-placeholder']).toBe('error');
    expect(desc.attrs['data-alap-placeholder-token']).toBe('tok-err');
    expect(desc.className).toContain('alap-placeholder-error');
    expect(desc.label).toBe(PLACEHOLDER_LABEL_ERROR);
  });

  it('emits empty attrs + label', () => {
    const desc = placeholderDescriptor(source('empty', 'tok-empty'));
    expect(desc.attrs['data-alap-placeholder']).toBe('empty');
    expect(desc.className).toContain('alap-placeholder-empty');
    expect(desc.label).toBe(PLACEHOLDER_LABEL_EMPTY);
  });

  it('matches what buildMenuPlaceholder writes for the same source', async () => {
    // Cross-check: framework adapters spread the descriptor; DOM/WC/Alpine
    // call buildMenuPlaceholder. Both paths must produce the same DOM
    // contract that tests query against.
    const { buildMenuPlaceholder } = await import('../../../src/ui/shared/progressivePlaceholder');
    const src = source('loading', 'tok-1');
    const li = buildMenuPlaceholder(src);
    const desc = placeholderDescriptor(src);

    expect(li.getAttribute('role')).toBe(desc.attrs.role);
    expect(li.getAttribute('aria-live')).toBe(desc.attrs['aria-live']);
    expect(li.getAttribute('data-alap-placeholder')).toBe(desc.attrs['data-alap-placeholder']);
    expect(li.getAttribute('data-alap-placeholder-token')).toBe(desc.attrs['data-alap-placeholder-token']);
    expect(li.className).toBe(desc.className);
    expect(li.querySelector('a')?.textContent).toBe(desc.label);
  });
});
