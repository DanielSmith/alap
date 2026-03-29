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
 * AlapLayout — drop-in layout component for Next.js App Router.
 *
 * Wraps children in AlapProvider and optionally registers the web component
 * so <alap-link> elements in MDX/Markdown content also work.
 *
 * Usage in app/layout.tsx:
 *
 *   import { AlapLayout } from 'next-alap';
 *   import config from './alap-config';
 *
 *   export default function RootLayout({ children }) {
 *     return (
 *       <html><body>
 *         <AlapLayout config={config}>{children}</AlapLayout>
 *       </body></html>
 *     );
 *   }
 */

'use client';

import { AlapProvider } from 'alap/react';
import { useEffect, type ReactNode } from 'react';
import type { AlapConfig } from 'alap/core';

export interface AlapLayoutProps {
  /** The Alap link configuration */
  config: AlapConfig;

  /** Named config identifier for multi-config setups */
  configName?: string;

  /** Layout children */
  children: ReactNode;

  /**
   * Also register the <alap-link> web component.
   * Enables web component usage in MDX content alongside React components.
   * @default true
   */
  webComponent?: boolean;

  /** Menu auto-dismiss timeout override (ms) */
  menuTimeout?: number;

  /** Default CSS class for all menus */
  defaultMenuClassName?: string;
}

export function AlapLayout({
  config,
  configName,
  children,
  webComponent = true,
  menuTimeout,
  defaultMenuClassName,
}: AlapLayoutProps) {
  useEffect(() => {
    if (webComponent) {
      // Dynamic import avoids pulling in HTMLElement at module scope,
      // which would crash during SSR (Node has no HTMLElement).
      import('alap').then(({ registerConfig, defineAlapLink }) => {
        registerConfig(config, configName);
        defineAlapLink();
      });
    }
  }, [config, configName, webComponent]);

  return (
    <AlapProvider
      config={config}
      menuTimeout={menuTimeout}
      defaultMenuClassName={defaultMenuClassName}
    >
      {children}
    </AlapProvider>
  );
}
