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

import { createContext, useContext, useRef, useEffect, type ReactNode, type CSSProperties } from 'react';
import { AlapEngine } from '../../core/AlapEngine';
import type { AlapConfig } from '../../core/types';
import { DEFAULT_MENU_TIMEOUT, DEFAULT_MAX_VISIBLE_ITEMS } from '../../constants';

export interface AlapContextValue {
  engine: AlapEngine;
  config: AlapConfig;
  menuTimeout: number;
  defaultMenuStyle?: CSSProperties;
  defaultMenuClassName?: string;
  defaultListType: 'ul' | 'ol';
  defaultMaxVisibleItems: number;
}

const AlapCtx = createContext<AlapContextValue | null>(null);

export interface AlapProviderProps {
  config: AlapConfig;
  children: ReactNode;
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
  menuTimeout,
  defaultMenuStyle,
  defaultMenuClassName,
}: AlapProviderProps) {
  const engineRef = useRef<AlapEngine>(new AlapEngine(config));

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
