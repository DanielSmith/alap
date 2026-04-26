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

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installMenuDismiss } from '../../../src/ui/shared/baseMenuDismiss';

describe('installMenuDismiss', () => {
  let trigger: HTMLElement;
  let menu: HTMLElement;
  let outside: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '';
    trigger = document.createElement('button');
    menu = document.createElement('div');
    outside = document.createElement('p');
    document.body.append(trigger, menu, outside);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('closes when a click lands outside both trigger and menu', () => {
    const close = vi.fn();
    const handle = installMenuDismiss({
      close,
      getTrigger: () => trigger,
      getMenu: () => menu,
      mode: 'dom',
      timeoutMs: 1000,
    });

    outside.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(close).toHaveBeenCalledTimes(1);
    handle.dispose();
  });

  it('does not close when the click is inside the menu', () => {
    const close = vi.fn();
    const handle = installMenuDismiss({
      close,
      getTrigger: () => trigger,
      getMenu: () => menu,
      mode: 'dom',
      timeoutMs: 1000,
    });

    menu.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(close).not.toHaveBeenCalled();
    handle.dispose();
  });

  it('does not close when the click is inside the trigger', () => {
    const close = vi.fn();
    const handle = installMenuDismiss({
      close,
      getTrigger: () => trigger,
      getMenu: () => menu,
      mode: 'dom',
      timeoutMs: 1000,
    });

    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(close).not.toHaveBeenCalled();
    handle.dispose();
  });

  it('closes on Escape', () => {
    const close = vi.fn();
    const handle = installMenuDismiss({
      close,
      getTrigger: () => trigger,
      getMenu: () => menu,
      mode: 'dom',
      timeoutMs: 1000,
    });

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(close).toHaveBeenCalledTimes(1);
    handle.dispose();
  });

  it('ignores non-Escape keys', () => {
    const close = vi.fn();
    const handle = installMenuDismiss({
      close,
      getTrigger: () => trigger,
      getMenu: () => menu,
      mode: 'dom',
      timeoutMs: 1000,
    });

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    expect(close).not.toHaveBeenCalled();
    handle.dispose();
  });

  it('popover mode attaches no document listeners', () => {
    const close = vi.fn();
    const handle = installMenuDismiss({
      close,
      getTrigger: () => trigger,
      getMenu: () => menu,
      mode: 'popover',
      timeoutMs: 1000,
    });

    outside.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(close).not.toHaveBeenCalled();
    handle.dispose();
  });

  it('startTimer fires close after timeoutMs', () => {
    const close = vi.fn();
    const handle = installMenuDismiss({
      close,
      getTrigger: () => trigger,
      getMenu: () => menu,
      mode: 'dom',
      timeoutMs: 500,
    });

    handle.startTimer();
    vi.advanceTimersByTime(499);
    expect(close).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(close).toHaveBeenCalledTimes(1);
    handle.dispose();
  });

  it('stopTimer cancels a pending close', () => {
    const close = vi.fn();
    const handle = installMenuDismiss({
      close,
      getTrigger: () => trigger,
      getMenu: () => menu,
      mode: 'dom',
      timeoutMs: 500,
    });

    handle.startTimer();
    vi.advanceTimersByTime(200);
    handle.stopTimer();
    vi.advanceTimersByTime(1000);
    expect(close).not.toHaveBeenCalled();
    handle.dispose();
  });

  it('startTimer resets a prior pending close', () => {
    const close = vi.fn();
    const handle = installMenuDismiss({
      close,
      getTrigger: () => trigger,
      getMenu: () => menu,
      mode: 'dom',
      timeoutMs: 500,
    });

    handle.startTimer();
    vi.advanceTimersByTime(400);
    handle.startTimer();
    vi.advanceTimersByTime(400);
    expect(close).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(close).toHaveBeenCalledTimes(1);
    handle.dispose();
  });

  it('dispose removes listeners and stops timer', () => {
    const close = vi.fn();
    const handle = installMenuDismiss({
      close,
      getTrigger: () => trigger,
      getMenu: () => menu,
      mode: 'dom',
      timeoutMs: 500,
    });

    handle.startTimer();
    handle.dispose();
    vi.advanceTimersByTime(1000);
    outside.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(close).not.toHaveBeenCalled();
  });

  it('dispose is idempotent', () => {
    const close = vi.fn();
    const handle = installMenuDismiss({
      close,
      getTrigger: () => trigger,
      getMenu: () => menu,
      mode: 'dom',
      timeoutMs: 500,
    });

    handle.dispose();
    handle.dispose();
    outside.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(close).not.toHaveBeenCalled();
  });

  it('reads trigger/menu accessors live so late-bound refs work', () => {
    const close = vi.fn();
    let liveTrigger: HTMLElement | null = null;
    let liveMenu: HTMLElement | null = null;

    const handle = installMenuDismiss({
      close,
      getTrigger: () => liveTrigger,
      getMenu: () => liveMenu,
      mode: 'dom',
      timeoutMs: 1000,
    });

    outside.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(close).not.toHaveBeenCalled();

    liveTrigger = trigger;
    liveMenu = menu;
    outside.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(close).toHaveBeenCalledTimes(1);

    close.mockClear();
    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(close).not.toHaveBeenCalled();

    handle.dispose();
  });
});
