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
export { resolveExistingUrlMode, injectExistingUrl } from './existingUrl';
export { computePlacement, FALLBACK_ORDER } from './placement';
export type { Placement, Rect, Size, PlacementInput, PlacementResult } from './placement';
export { calcPlacementState, applyPlacementToMenu, applyPlacementClass, clearPlacementClass, observeTriggerOffscreen } from './usePlacement';
export type { CalcPlacementOptions, PlacementState } from './usePlacement';
export type {
  TriggerHoverDetail,
  TriggerContextDetail,
  ItemHoverDetail,
  ItemContextDetail,
  ItemContextDismissDetail,
  AlapEventHooks,
} from './eventHooks';
