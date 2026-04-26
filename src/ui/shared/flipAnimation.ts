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
 * FLIP (First, Last, Invert, Play) animation helper.
 *
 * Element has already moved from `prevRect` to its new position by the time
 * this is called. We compute the delta, apply an inverted transform so it
 * visually snaps back to where it was, force a reflow, then set
 * `transition: transform ...` and clear the transform — the browser animates
 * it back to identity.
 *
 * The transition properties use CSS variables with sensible fallbacks so users
 * can override on any ancestor:
 *
 * ```css
 * .alapelem {
 *   --alap-transition-duration: 400ms;
 *   --alap-transition-easing: cubic-bezier(0.2, 0, 0, 1);
 * }
 * ```
 */
export function flipFromRect(el: HTMLElement, prevRect: DOMRect | { left: number; top: number; width: number; height: number }): void {
  if (!el) return;
  const nextRect = el.getBoundingClientRect();
  if (nextRect.width === 0 || nextRect.height === 0) return;

  const dx = prevRect.left - nextRect.left;
  const dy = prevRect.top - nextRect.top;
  const sx = Math.max(0.1, prevRect.width / nextRect.width);
  const sy = Math.max(0.1, prevRect.height / nextRect.height);

  // If the element didn't actually move or resize, skip the animation
  if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 && Math.abs(sx - 1) < 0.01 && Math.abs(sy - 1) < 0.01) {
    return;
  }

  // Record current inline values to restore after the transition.
  const prevTransition = el.style.transition;
  const prevTransform = el.style.transform;
  const prevTransformOrigin = el.style.transformOrigin;

  // Apply inverted transform with no transition — snaps element back to prevRect.
  el.style.transition = 'none';
  el.style.transformOrigin = 'top left';
  el.style.transform = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;

  // Force reflow so the browser commits the starting state.
  void el.offsetHeight;

  // Enable transition and clear transform — browser interpolates to identity.
  el.style.transition = 'transform var(--alap-transition-duration, 250ms) var(--alap-transition-easing, ease-out)';
  el.style.transform = 'none';

  let finished = false;
  const cleanup = () => {
    if (finished) return;
    finished = true;
    el.style.transition = prevTransition;
    el.style.transform = prevTransform;
    el.style.transformOrigin = prevTransformOrigin;
  };
  el.addEventListener('transitionend', cleanup, { once: true });
  // Fallback for environments without transitionend (jsdom/happy-dom) or if the
  // transition is preempted. The delay is deliberately longer than any sensible
  // user-override duration.
  setTimeout(cleanup, 2000);
}
