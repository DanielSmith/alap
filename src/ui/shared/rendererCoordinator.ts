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

import type {
  CoordinatedRenderer,
  OpenPayload,
  RendererStackEntry,
  RendererType,
} from './coordinatedRenderer';

// --- Constants ---

const MAX_STACK_DEPTH = 3;
const ESCAPE_KEY = 'Escape';

// View Transitions API constants
const VT_DURATION_PROP = '--alap-coordinator-transition';
const VT_DURATION_FALLBACK = 300;
const VT_SAFETY_BUFFER = 100;
const VT_NAME_CONTENT = 'alap_content';
const VT_NAME_THUMBNAIL = 'alap_thumbnail';
const VT_BACK_CLASS = 'alap_vt_back';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

// --- Options ---

export interface RendererCoordinatorOptions {
  /** Respect prefers-reduced-motion. Default: true */
  reduceMotion?: boolean;
  /** Use View Transitions API when available. Default: true */
  viewTransitions?: boolean;
}

/**
 * Orchestrates transitions between renderers (menu, lightbox, lens).
 *
 * Each renderer registers itself via register(). The coordinator
 * manages a state stack so that back() restores the previous
 * renderer. The View Transitions API is used for smooth animations
 * when available, with instant swap as fallback.
 *
 * Renderers do not know about the coordinator. The consumer wires
 * them together:
 *
 *   const coordinator = new RendererCoordinator();
 *   coordinator.register(menu);
 *   coordinator.register(lightbox);
 *   coordinator.register(lens);
 *   coordinator.bindKeyboard();
 */
export class RendererCoordinator {
  private renderers = new Map<RendererType, CoordinatedRenderer>();
  private stack: RendererStackEntry[] = [];
  private lastPayload = new Map<RendererType, OpenPayload>();
  private transitioning = false;
  private reduceMotion: boolean;
  private useViewTransitions: boolean;
  private motionQuery: MediaQueryList | null = null;
  private boundKeydown: ((e: KeyboardEvent) => void) | null = null;

  constructor(options: RendererCoordinatorOptions = {}) {
    this.reduceMotion = options.reduceMotion ?? true;
    this.useViewTransitions = options.viewTransitions ?? true;
    if (this.reduceMotion && typeof window !== 'undefined') {
      this.motionQuery = window.matchMedia(REDUCED_MOTION_QUERY);
    }
  }

  // --- Registration ---

  register(renderer: CoordinatedRenderer): void {
    this.renderers.set(renderer.rendererType, renderer);
  }

  unregister(type: RendererType): void {
    this.renderers.delete(type);
    this.lastPayload.delete(type);
  }

  // --- Transition API ---

  /**
   * Transition from whatever is currently showing to the target renderer.
   * Pushes the current state onto the stack before switching.
   */
  transitionTo(target: RendererType, payload: OpenPayload): void {
    if (this.transitioning) return;

    const targetRenderer = this.renderers.get(target);
    if (!targetRenderer) return;

    const currentEntry = this.snapshotCurrent();
    if (currentEntry) {
      if (this.stack.length >= MAX_STACK_DEPTH) {
        this.stack.shift();
      }
      this.stack.push(currentEntry);
    }

    this.performTransition(targetRenderer, payload, false);
  }

  /**
   * Go back one step in the stack. If the stack is empty,
   * just close the current renderer.
   */
  back(): void {
    if (this.transitioning) return;

    const previous = this.stack.pop();
    if (!previous) {
      this.closeAll();
      return;
    }

    const targetRenderer = this.renderers.get(previous.renderer);
    if (!targetRenderer) {
      this.closeAll();
      return;
    }

    const payload: OpenPayload = {
      links: previous.links,
      triggerElement: previous.triggerElement ?? undefined,
      initialIndex: previous.activeIndex,
    };

    this.performTransition(targetRenderer, payload, true);
  }

  /** Close everything and clear the stack. */
  closeAll(): void {
    for (const renderer of this.renderers.values()) {
      if (renderer.isOpen) renderer.close();
    }
    this.stack = [];
    this.lastPayload.clear();
  }

  // --- State queries ---

  /** Current stack depth (for UI indicators). */
  get depth(): number {
    return this.stack.length;
  }

  /** Whether a transition is in progress. */
  get isTransitioning(): boolean {
    return this.transitioning;
  }

  /** Whether any registered renderer is currently open. */
  hasOpenRenderer(): boolean {
    for (const renderer of this.renderers.values()) {
      if (renderer.isOpen) return true;
    }
    return false;
  }

  // --- Keyboard ---

  /**
   * Bind a capture-phase Escape handler that calls back() instead
   * of letting individual renderers handle it. Call once after
   * registration is complete.
   */
  bindKeyboard(): void {
    if (this.boundKeydown) return;
    this.boundKeydown = (e: KeyboardEvent) => this.onKeydown(e);
    document.addEventListener('keydown', this.boundKeydown, { capture: true });
  }

  unbindKeyboard(): void {
    if (this.boundKeydown) {
      document.removeEventListener('keydown', this.boundKeydown, { capture: true });
      this.boundKeydown = null;
    }
  }

  /** Full cleanup — unregister all, unbind keyboard, clear stack. */
  destroy(): void {
    this.closeAll();
    this.unbindKeyboard();
    this.renderers.clear();
  }

  // --- Internal ---

  private onKeydown(e: KeyboardEvent): void {
    if (e.key !== ESCAPE_KEY) return;
    if (!this.hasOpenRenderer()) return;

    e.preventDefault();
    e.stopImmediatePropagation();
    this.back();
  }

  /**
   * Snapshot the currently open renderer's state so it can be
   * restored on back(). Uses the payload the coordinator last
   * sent, so renderers don't need to expose internal state.
   */
  private snapshotCurrent(): RendererStackEntry | null {
    for (const [type, renderer] of this.renderers) {
      if (renderer.isOpen) {
        const payload = this.lastPayload.get(type);
        return {
          renderer: type,
          links: payload?.links ?? [],
          activeIndex: payload?.initialIndex ?? 0,
          triggerElement: payload?.triggerElement ?? null,
        };
      }
    }
    return null;
  }

  private get shouldReduceMotion(): boolean {
    return this.reduceMotion && (this.motionQuery?.matches ?? false);
  }

  private supportsViewTransitions(): boolean {
    return this.useViewTransitions
      && typeof document !== 'undefined'
      && 'startViewTransition' in document;
  }

  private performTransition(
    target: CoordinatedRenderer,
    payload: OpenPayload,
    isBack: boolean,
  ): void {
    this.transitioning = true;
    this.lastPayload.set(target.rendererType, payload);

    const closeCurrent = (): void => {
      for (const renderer of this.renderers.values()) {
        if (renderer.isOpen && renderer !== target) {
          renderer.close();
        }
      }
    };

    const openTarget = (): void => {
      target.openWith(payload);
    };

    // If reduced motion, no View Transitions support, or API disabled: instant swap
    if (this.shouldReduceMotion || !this.supportsViewTransitions()) {
      closeCurrent();
      openTarget();
      this.transitioning = false;
      return;
    }

    // View Transitions API path
    this.performViewTransition(closeCurrent, openTarget, isBack);
  }

  private performViewTransition(
    closeCurrent: () => void,
    openTarget: () => void,
    isBack: boolean,
  ): void {
    // Tag outgoing elements for shared-element animation
    const outgoing = this.getActiveContainer();
    if (outgoing) {
      outgoing.style.viewTransitionName = VT_NAME_CONTENT;
      const img = outgoing.querySelector('img');
      if (img) {
        (img as HTMLElement).style.viewTransitionName = VT_NAME_THUMBNAIL;
      }
    }

    // Set direction class for CSS animation
    if (isBack) {
      document.documentElement.classList.add(VT_BACK_CLASS);
    } else {
      document.documentElement.classList.remove(VT_BACK_CLASS);
    }

    const transition = (document as any).startViewTransition(() => {
      closeCurrent();
      openTarget();

      // Tag incoming elements
      const incoming = this.getActiveContainer();
      if (incoming) {
        incoming.style.viewTransitionName = VT_NAME_CONTENT;
        const img = incoming.querySelector('img');
        if (img) {
          (img as HTMLElement).style.viewTransitionName = VT_NAME_THUMBNAIL;
        }
      }
    });

    const cleanup = () => {
      document.documentElement.classList.remove(VT_BACK_CLASS);
      this.transitioning = false;
    };

    transition.finished.then(cleanup).catch(cleanup);

    // Safety fallback
    const duration = this.getViewTransitionDuration();
    setTimeout(() => {
      if (this.transitioning) cleanup();
    }, duration + VT_SAFETY_BUFFER);
  }

  /** Find the root container of whatever renderer is currently open. */
  private getActiveContainer(): HTMLElement | null {
    // Lightbox and lens use overlay divs; menu uses a container
    return document.querySelector('.alap-lens-overlay')
      ?? document.querySelector('.alap-lightbox-overlay')
      ?? document.getElementById('alapelem');
  }

  private getViewTransitionDuration(): number {
    const el = document.documentElement;
    const raw = getComputedStyle(el).getPropertyValue(VT_DURATION_PROP);
    const parsed = parseFloat(raw) * 1000;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : VT_DURATION_FALLBACK;
  }
}
