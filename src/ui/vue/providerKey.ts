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

import type { InjectionKey, CSSProperties, ComputedRef } from 'vue';
import type { AlapEngine } from '../../core/AlapEngine';
import type { AlapConfig } from '../../core/types';
import { RENDERER_MENU } from '../shared/coordinatedRenderer';
import { getInstanceCoordinator } from '../shared/instanceCoordinator';

export interface MenuCoordinator {
  subscribe: (id: string, close: () => void) => () => void;
  notifyOpen: (id: string) => void;
}

export function createMenuCoordinator(): MenuCoordinator {
  const coordinator = getInstanceCoordinator();
  return {
    subscribe(id, close) {
      return coordinator.subscribe(id, RENDERER_MENU, close);
    },
    notifyOpen(id) {
      coordinator.notifyOpen(id);
    },
  };
}

export interface AlapContextValue {
  engine: AlapEngine;
  config: AlapConfig;
  menuTimeout: number;
  menuCoordinator: MenuCoordinator;
  defaultMenuStyle?: CSSProperties;
  defaultMenuClassName?: string;
  defaultListType: 'ul' | 'ol';
  defaultMaxVisibleItems: number;
}

export const AlapKey: InjectionKey<ComputedRef<AlapContextValue>> = Symbol('alap');

export type AlapLinkMode = 'dom' | 'webcomponent' | 'popover';
