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

export { buildMenuList } from './buildMenuList';
export type { MenuListOptions } from './buildMenuList';
export { handleMenuKeyboard } from './menuKeyboard';
export type { MenuKeyboardOptions } from './menuKeyboard';
export { DismissTimer } from './dismissTimer';
export { installMenuDismiss } from './baseMenuDismiss';
export type { InstallMenuDismissOptions, MenuDismissHandle } from './baseMenuDismiss';
export { resolveExistingUrlMode, injectExistingUrl } from './existingUrl';
export { computePlacement, parsePlacement, FALLBACK_ORDER } from './placement';
export type { Placement, PlacementStrategy, ParsedPlacement, Rect, Size, PlacementInput, PlacementResult } from './placement';
export {
  OVERLAY_ALIGN,
  OVERLAY_JUSTIFY,
  computeOverlayLayout,
  applyOverlayLayout,
  clearOverlayLayout,
  viewportSize,
} from './overlayPlacement';
export type { OverlayLayout } from './overlayPlacement';
export { calcPlacementState, applyPlacementToMenu, applyPlacementAfterLayout, calcPlacementAfterLayout, applyPlacementClass, clearPlacementClass, observeTriggerOffscreen } from './usePlacement';
export type { CalcPlacementOptions, PlacementState } from './usePlacement';
export type {
  TriggerHoverDetail,
  TriggerContextDetail,
  ItemHoverDetail,
  ItemContextDetail,
  ItemContextDismissDetail,
  AlapEventHooks,
} from './eventHooks';
export { RENDERER_MENU, RENDERER_LIGHTBOX, RENDERER_LENS } from './coordinatedRenderer';
export type { RendererType, OpenPayload, RendererStackEntry, CoordinatedRenderer } from './coordinatedRenderer';
export { RendererCoordinator } from './rendererCoordinator';
export type { RendererCoordinatorOptions } from './rendererCoordinator';
export { InstanceCoordinator, getInstanceCoordinator } from './instanceCoordinator';
export { registerConfig, updateRegisteredConfig, getEngine, getConfig } from './configRegistry';
export {
  buildMenuPlaceholder,
  buildPanelPlaceholder,
  buildPlaceholderItem,
  appendPlaceholders,
  placeholderLabel,
  placeholderDescriptor,
  PLACEHOLDER_LABEL_LOADING,
  PLACEHOLDER_LABEL_ERROR,
  PLACEHOLDER_LABEL_EMPTY,
} from './progressivePlaceholder';
export type { PlaceholderDescriptor } from './progressivePlaceholder';
export { flipFromRect } from './flipAnimation';
export { centerOverTrigger } from './loadingPlacement';
export { ProgressiveRenderer } from './progressiveRenderer';
export type { ProgressiveRenderContext, ProgressiveRendererOptions } from './progressiveRenderer';
