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

import {
  component$,
  createContextId,
  useContextProvider,
  useContext,
  useStore,
  useTask$,
  Slot,
  type NoSerialize,
  noSerialize,
} from '@builder.io/qwik';
import { AlapEngine } from '../../core/AlapEngine';
import type { AlapConfig } from '../../core/types';
import { DEFAULT_MENU_TIMEOUT, DEFAULT_MAX_VISIBLE_ITEMS } from '../../constants';

export interface AlapContextValue {
  engine: NoSerialize<AlapEngine>;
  config: AlapConfig;
  menuTimeout: number;
  defaultMenuClassName?: string;
  defaultListType: 'ul' | 'ol';
  defaultMaxVisibleItems: number;
}

export const AlapCtx = createContextId<AlapContextValue>('alap-context');

export interface AlapProviderProps {
  config: AlapConfig;
  menuTimeout?: number;
  defaultMenuClassName?: string;
}

export const AlapProvider = component$<AlapProviderProps>((props) => {
  const store = useStore<AlapContextValue>({
    engine: noSerialize(new AlapEngine(props.config)),
    config: props.config,
    menuTimeout:
      props.menuTimeout
      ?? (props.config.settings?.menuTimeout as number)
      ?? DEFAULT_MENU_TIMEOUT,
    defaultMenuClassName: props.defaultMenuClassName,
    defaultListType: (props.config.settings?.listType as 'ul' | 'ol') ?? 'ul',
    defaultMaxVisibleItems:
      (props.config.settings?.maxVisibleItems as number) ?? DEFAULT_MAX_VISIBLE_ITEMS,
  });

  // Keep engine in sync when config changes
  useTask$(({ track }) => {
    const cfg = track(() => props.config);
    store.config = cfg;
    store.engine = noSerialize(new AlapEngine(cfg));
    store.menuTimeout =
      props.menuTimeout
      ?? (cfg.settings?.menuTimeout as number)
      ?? DEFAULT_MENU_TIMEOUT;
    store.defaultListType = (cfg.settings?.listType as 'ul' | 'ol') ?? 'ul';
    store.defaultMaxVisibleItems =
      (cfg.settings?.maxVisibleItems as number) ?? DEFAULT_MAX_VISIBLE_ITEMS;
  });

  useContextProvider(AlapCtx, store);

  return <Slot />;
});

export function useAlapContext(): AlapContextValue {
  return useContext(AlapCtx);
}
