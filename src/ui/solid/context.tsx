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

import { createContext, createEffect, on, useContext, type JSX } from 'solid-js';
import { AlapEngine } from '../../core/AlapEngine';
import type { AlapConfig } from '../../core/types';
import { DEFAULT_MENU_TIMEOUT, DEFAULT_MAX_VISIBLE_ITEMS } from '../../constants';

export interface MenuCoordinator {
  subscribe: (id: string, close: () => void) => () => void;
  notifyOpen: (id: string) => void;
}

function createMenuCoordinator(): MenuCoordinator {
  const listeners = new Map<string, () => void>();

  return {
    subscribe(id, close) {
      listeners.set(id, close);
      return () => { listeners.delete(id); };
    },
    notifyOpen(id) {
      for (const [listenerId, close] of listeners) {
        if (listenerId !== id) close();
      }
    },
  };
}

export interface AlapContextValue {
  engine: AlapEngine;
  config: AlapConfig;
  menuTimeout: number;
  menuCoordinator: MenuCoordinator;
  defaultMenuStyle?: JSX.CSSProperties;
  defaultMenuClassName?: string;
  defaultListType: 'ul' | 'ol';
  defaultMaxVisibleItems: number;
}

const AlapCtx = createContext<AlapContextValue>();

export interface AlapProviderProps {
  config: AlapConfig;
  children: JSX.Element;
  menuTimeout?: number;
  defaultMenuStyle?: JSX.CSSProperties;
  defaultMenuClassName?: string;
}

export function AlapProvider(props: AlapProviderProps) {
  const engine = new AlapEngine(props.config);
  const menuCoordinator = createMenuCoordinator();

  // Keep engine in sync when config changes
  createEffect(on(() => props.config, (cfg) => {
    engine.updateConfig(cfg);
  }, { defer: true }));

  const value: AlapContextValue = {
    get engine() { return engine; },
    menuCoordinator,
    get config() { return props.config; },
    get menuTimeout() {
      return props.menuTimeout
        ?? (props.config.settings?.menuTimeout as number)
        ?? DEFAULT_MENU_TIMEOUT;
    },
    get defaultMenuStyle() { return props.defaultMenuStyle; },
    get defaultMenuClassName() { return props.defaultMenuClassName; },
    get defaultListType() {
      return (props.config.settings?.listType as 'ul' | 'ol') ?? 'ul';
    },
    get defaultMaxVisibleItems() {
      return (props.config.settings?.maxVisibleItems as number) ?? DEFAULT_MAX_VISIBLE_ITEMS;
    },
  };

  return (
    <AlapCtx.Provider value={value}>
      {props.children}
    </AlapCtx.Provider>
  );
}

export function useAlapContext(): AlapContextValue {
  const ctx = useContext(AlapCtx);
  if (!ctx) {
    throw new Error('useAlap() must be used within an <AlapProvider>');
  }
  return ctx;
}
