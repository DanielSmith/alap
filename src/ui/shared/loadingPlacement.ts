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
 * Default transform that centers the loading container on the trigger's
 * center point. Exposed as the fallback for `--alap-loading-transform`, so
 * users can override by setting that CSS variable on any ancestor.
 */
export const LOADING_DEFAULT_TRANSFORM = 'translate(-50%, -50%)';

/**
 * Default overflow behavior while loading — visible so a one-line "Loading…"
 * placeholder isn't clipped by any prior max-height constraints left on the
 * container. Overridable via `--alap-loading-overflow`.
 */
export const LOADING_DEFAULT_OVERFLOW = 'visible';

/**
 * Position a small `"Loading…"` container directly over the trigger element,
 * centered on its bounding rect. Used by menu-style renderers while an async
 * source is still in flight — skipping the compass placement engine here
 * avoids flipping direction between a tiny loading placeholder and the
 * full-size menu that replaces it.
 *
 * The computed `top` / `left` values depend on the trigger's runtime position
 * and can't be user-overridden. The stylistic pieces (transform, overflow)
 * flow through CSS variables so users can adjust them:
 *
 * ```css
 * #alapelem {
 *   --alap-loading-transform: translate(-50%, -25%);
 *   --alap-loading-overflow: hidden;
 * }
 * ```
 *
 * When the real content arrives, renderers should recompute placement as
 * normal and call `flipFromRect()` with the previous rect to animate the
 * container to its final position.
 */
export function centerOverTrigger(
  container: HTMLElement,
  trigger: HTMLElement,
  event: MouseEvent,
  zIndex: number,
): void {
  const rect = triggerRect(trigger, event);
  const cx = rect.left + rect.width / 2 + window.scrollX;
  const cy = rect.top + rect.height / 2 + window.scrollY;
  container.style.cssText = `
    position: absolute;
    display: block;
    z-index: ${zIndex};
    top: ${cy}px;
    left: ${cx}px;
    transform: var(--alap-loading-transform, ${LOADING_DEFAULT_TRANSFORM});
    overflow: var(--alap-loading-overflow, ${LOADING_DEFAULT_OVERFLOW});
    max-height: none;
    max-width: none;
  `;
}

/**
 * Image triggers use the click coordinates rather than their full bounding rect
 * so the menu lands near where the user actually clicked. Keyboard-initiated
 * clicks have (0, 0) for clientX/Y, so we fall back to the image center.
 */
function triggerRect(
  trigger: HTMLElement,
  event: MouseEvent,
): { left: number; top: number; width: number; height: number } {
  if (trigger.tagName.toLowerCase() === 'img') {
    let x = event.clientX;
    let y = event.clientY;
    if (x === 0 && y === 0) {
      const r = trigger.getBoundingClientRect();
      x = r.left + r.width / 2;
      y = r.top + r.height / 2;
    }
    return { left: x, top: y, width: 0, height: 0 };
  }
  const r = trigger.getBoundingClientRect();
  return { left: r.left, top: r.top, width: r.width, height: r.height };
}
