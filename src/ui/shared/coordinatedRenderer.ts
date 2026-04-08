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

import type { ResolvedLink } from '../../core/types';

// --- Renderer type identifiers ---

export const RENDERER_MENU = 'menu' as const;
export const RENDERER_LIGHTBOX = 'lightbox' as const;
export const RENDERER_LENS = 'lens' as const;

export type RendererType =
  | typeof RENDERER_MENU
  | typeof RENDERER_LIGHTBOX
  | typeof RENDERER_LENS;

// --- Payloads ---

/**
 * Data passed to a renderer's openWith() so it knows what to show
 * and where the interaction originated.
 */
export interface OpenPayload {
  /** Resolved links to display */
  links: ResolvedLink[];
  /** DOM element the interaction originated from (for positioning and animation origin) */
  triggerElement?: HTMLElement;
  /** Index into links to focus initially (e.g. lightbox item 3 → lens) */
  initialIndex?: number;
}

/**
 * A single entry in the coordinator's navigation stack.
 * Captures enough state to restore a renderer on back().
 */
export interface RendererStackEntry {
  /** Which renderer was showing */
  renderer: RendererType;
  /** The links it was showing */
  links: ResolvedLink[];
  /** Which item index was active */
  activeIndex: number;
  /** The DOM element that was the trigger/origin */
  triggerElement: HTMLElement | null;
}

// --- Renderer contract ---

/**
 * Contract a renderer implements to participate in coordinated
 * transitions. Each method is minimal — the coordinator only
 * needs open/close/type/isOpen.
 *
 * Renderers remain fully independent. They do not import the
 * coordinator. The consumer wires them together.
 */
export interface CoordinatedRenderer {
  /** Which renderer type this is */
  readonly rendererType: RendererType;
  /** Whether the renderer is currently visible */
  readonly isOpen: boolean;
  /** Programmatically open with the given links and origin context */
  openWith(payload: OpenPayload): void;
  /** Close the renderer. Returns the trigger element if one was active (for return-focus). */
  close(): HTMLElement | null;
}
