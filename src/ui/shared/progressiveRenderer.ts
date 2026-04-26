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

import type { AlapEngine } from '../../core/AlapEngine';
import type { ProgressiveState } from '../../core/types';

/**
 * Context passed to an adapter's render callback on each progressive pass.
 */
export interface ProgressiveRenderContext {
  /** The trigger element that started this render. */
  trigger: HTMLElement;
  /** The raw expression text from the trigger. */
  expression: string;
  /** The click/synthesized event — useful for positioning. */
  event: MouseEvent;
  /** The trigger's DOM id, if any — used for bare `@` macros. */
  anchorId: string | undefined;
  /** Engine's current view of the expression: resolved items + pending sources. */
  state: ProgressiveState;
  /** True when `state.resolved` is empty and `state.sources` is non-empty. */
  isLoadingOnly: boolean;
  /** True on the second-and-subsequent render of the same handle. False on first paint. */
  isUpdate: boolean;
  /** True when the previous render was `isLoadingOnly` and this one isn't — the
   *  point at which adapters that support a FLIP animation should trigger it. */
  transitioningFromLoading: boolean;
}

export interface ProgressiveRendererOptions {
  /**
   * The engine, or a getter that returns it. A getter is useful for adapters
   * (e.g. the web component) where the engine is looked up lazily from a
   * config registry and may change between clicks.
   */
  engine: AlapEngine | (() => AlapEngine | undefined);
  /** Called once per progressive render pass. Adapter owns DOM output. */
  onRender: (ctx: ProgressiveRenderContext) => void;
  /**
   * When the config's `settings.cancelFetchOnDismiss` is true, the renderer
   * will call `engine.abortInFlight(token)` for each subscribed token on stop().
   * Adapters set this based on their config surface.
   */
  cancelFetchOnDismiss?: () => boolean;
}

interface Handle {
  trigger: HTMLElement;
  expression: string;
  event: MouseEvent;
  anchorId: string | undefined;
  abort: AbortController;
  subscribed: Set<string>;
  firstPaintDone: boolean;
  wasLoadingOnly: boolean;
}

/**
 * Framework-agnostic orchestrator for progressive-rendering of async
 * expressions. Owns the trigger-click lifecycle:
 *
 *   - contract 12 (same trigger re-click mid-render = no-op)
 *   - contract 13 (anchor switch aborts prior subscriptions)
 *   - contract 14 (dismiss aborts late-arriving settles)
 *   - in-flight promise subscription and re-render loop
 *   - transition-from-loading signal for the adapter's FLIP animation
 *
 * Adapters provide the render output via `onRender`. The renderer itself
 * touches no framework APIs — adapters can plug in React effects, Vue
 * reactivity, direct DOM, web-component shadow roots, etc.
 */
export class ProgressiveRenderer {
  private current: Handle | null = null;

  constructor(private opts: ProgressiveRendererOptions) {}

  /** True while a render is active (not stopped / aborted). */
  get isActive(): boolean {
    return this.current !== null;
  }

  /** The trigger currently being rendered, for external identity checks. */
  get currentTrigger(): HTMLElement | null {
    return this.current?.trigger ?? null;
  }

  /**
   * Begin progressive rendering for `(trigger, expression)`. If the same
   * trigger + expression is already rendering, this is a no-op (contract 12).
   * If a different trigger is rendering, that one is aborted (contract 13).
   *
   * `anchorId` overrides the trigger's DOM id as the `@macro` self-reference
   * anchor. Useful for framework adapters where the prop is distinct from the
   * trigger element's auto-generated id.
   */
  start(trigger: HTMLElement, expression: string, event: MouseEvent, anchorId?: string): void {
    if (
      this.current &&
      this.current.trigger === trigger &&
      this.current.expression === expression
    ) {
      return;
    }

    if (this.current) {
      this.abortCurrent();
    }

    const handle: Handle = {
      trigger,
      expression,
      event,
      anchorId: anchorId ?? trigger.id ?? undefined,
      abort: new AbortController(),
      subscribed: new Set<string>(),
      firstPaintDone: false,
      wasLoadingOnly: false,
    };
    this.current = handle;
    this.renderPass(handle);
  }

  /**
   * Tear down the current render. Call from the adapter's dismiss/close path
   * so late-arriving settles don't re-render a closed menu (contract 14).
   */
  stop(): void {
    if (!this.current) return;
    this.abortCurrent();
    this.current = null;
  }

  private getEngine(): AlapEngine | undefined {
    return typeof this.opts.engine === 'function' ? this.opts.engine() : this.opts.engine;
  }

  private abortCurrent(): void {
    if (!this.current) return;
    this.current.abort.abort();
    if (this.opts.cancelFetchOnDismiss?.()) {
      const engine = this.getEngine();
      if (engine) {
        for (const token of this.current.subscribed) {
          engine.abortInFlight(token);
        }
      }
    }
  }

  private renderPass(handle: Handle): void {
    if (handle.abort.signal.aborted) return;
    if (this.current !== handle) return;

    const engine = this.getEngine();
    if (!engine) return;
    const state = engine.resolveProgressive(handle.expression, handle.anchorId);

    // Nothing to render — no resolved items and no pending/error/empty sources.
    if (state.resolved.length === 0 && state.sources.length === 0) return;

    const isLoadingOnly = state.resolved.length === 0 && state.sources.length > 0;
    const transitioningFromLoading = handle.wasLoadingOnly && !isLoadingOnly;

    this.opts.onRender({
      trigger: handle.trigger,
      expression: handle.expression,
      event: handle.event,
      anchorId: handle.anchorId,
      state,
      isLoadingOnly,
      isUpdate: handle.firstPaintDone,
      transitioningFromLoading,
    });

    handle.firstPaintDone = true;
    handle.wasLoadingOnly = isLoadingOnly;

    // Subscribe once per loading token. When each settles, trigger a re-render.
    for (const src of state.sources) {
      if (src.status !== 'loading' || !src.promise) continue;
      if (handle.subscribed.has(src.token)) continue;
      handle.subscribed.add(src.token);
      src.promise.then(() => this.renderPass(handle));
    }
  }
}
