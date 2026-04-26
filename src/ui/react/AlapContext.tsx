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

import { createContext, useContext, useRef, useEffect, useCallback, type ReactNode, type CSSProperties } from 'react';
import { AlapEngine } from '../../core/AlapEngine';
import type { AlapConfig, ProtocolHandlerRegistry } from '../../core/types';
import { DEFAULT_MENU_TIMEOUT, DEFAULT_MAX_VISIBLE_ITEMS } from '../../constants';
import { RENDERER_MENU } from '../shared/coordinatedRenderer';
import { getInstanceCoordinator } from '../shared/instanceCoordinator';

/**
 * Lightweight close-others coordinator.
 *
 * Each AlapLink subscribes with a close callback. When one opens,
 * it calls `notifyOpen(ownId)` — all other subscribers are closed.
 * Delegates to the global InstanceCoordinator so that DOM, WC,
 * and framework menus all dismiss each other.
 */
export interface MenuCoordinator {
  subscribe: (id: string, close: () => void) => () => void;
  notifyOpen: (id: string) => void;
}

function createMenuCoordinator(): MenuCoordinator {
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
  defaultMenuStyle?: CSSProperties;
  defaultMenuClassName?: string;
  defaultListType: 'ul' | 'ol';
  defaultMaxVisibleItems: number;
  menuCoordinator: MenuCoordinator;
}

const AlapCtx = createContext<AlapContextValue | null>(null);

export interface AlapProviderProps {
  config: AlapConfig;
  children: ReactNode;
  /**
   * Protocol handler registry. Required for any expression that uses a
   * protocol (`:web:`, `:time:`, `:hn:`, custom…). Handlers attach to the
   * engine at construction and survive subsequent config updates.
   */
  handlers?: ProtocolHandlerRegistry;
  /** Menu auto-dismiss timeout in ms. Overrides config.settings.menuTimeout */
  menuTimeout?: number;
  /** Default inline styles for all menus. Overridden by per-link menuStyle. */
  defaultMenuStyle?: CSSProperties;
  /** Default CSS class for all menus. Merged with per-link menuClassName. */
  defaultMenuClassName?: string;
}

export function AlapProvider({
  config,
  children,
  handlers,
  menuTimeout,
  defaultMenuStyle,
  defaultMenuClassName,
}: AlapProviderProps) {
  // Handlers attach once at engine construction — they're not data, so
  // re-running on every `handlers` prop change would either duplicate
  // registrations (engine.registerProtocol throws on re-register) or
  // require full engine rebuilds. Keep it simple: first render wins.
  const engineRef = useRef<AlapEngine>(new AlapEngine(config, { handlers }));
  const coordinatorRef = useRef<MenuCoordinator>(createMenuCoordinator());

  useEffect(() => {
    engineRef.current.updateConfig(config);
  }, [config]);

  const timeout = menuTimeout
    ?? (config.settings?.menuTimeout as number)
    ?? DEFAULT_MENU_TIMEOUT;

  const value: AlapContextValue = {
    engine: engineRef.current,
    config,
    menuTimeout: timeout,
    defaultMenuStyle,
    defaultMenuClassName,
    defaultListType: (config.settings?.listType as 'ul' | 'ol') ?? 'ul',
    defaultMaxVisibleItems: (config.settings?.maxVisibleItems as number) ?? DEFAULT_MAX_VISIBLE_ITEMS,
    menuCoordinator: coordinatorRef.current,
  };

  return <AlapCtx value={value}>{children}</AlapCtx>;
}

export function useAlapContext(): AlapContextValue {
  const ctx = useContext(AlapCtx);
  if (!ctx) {
    throw new Error('useAlap() must be used within an <AlapProvider>');
  }
  return ctx;
}
