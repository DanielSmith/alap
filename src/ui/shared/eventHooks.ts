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

import type { AlapLink } from '../../core/types';

export interface TriggerHoverDetail {
  query: string;
  anchorId?: string;
}

export interface TriggerContextDetail {
  query: string;
  anchorId?: string;
  event: MouseEvent;
}

export interface ItemHoverDetail {
  id: string;
  link: AlapLink;
  query: string;
}

export interface ItemContextDetail {
  id: string;
  link: AlapLink;
  query: string;
  /** MouseEvent for right-click, KeyboardEvent for ArrowRight */
  event: MouseEvent | KeyboardEvent;
}

export interface ItemContextDismissDetail {
  id: string;
  link: AlapLink;
  query: string;
}

export interface AlapEventHooks {
  onTriggerHover?: (detail: TriggerHoverDetail) => void;
  onTriggerContext?: (detail: TriggerContextDetail) => void;
  onItemHover?: (detail: ItemHoverDetail) => void;
  onItemContext?: (detail: ItemContextDetail) => void;
  onItemContextDismiss?: (detail: ItemContextDismissDetail) => void;
}
