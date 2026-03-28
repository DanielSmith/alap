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
 * AlapMDXProvider
 *
 * Wraps children with `AlapProvider` so `<AlapLink>` components in MDX
 * content can resolve queries against the Alap config.
 *
 * Usage varies by framework:
 *
 * **With @mdx-js/react (Docusaurus, custom setups):**
 * ```tsx
 * import { AlapMDXProvider, alapComponents } from '@alap/mdx';
 * import { MDXProvider } from '@mdx-js/react';
 *
 * <MDXProvider components={alapComponents}>
 *   <AlapMDXProvider config={config}>{children}</AlapMDXProvider>
 * </MDXProvider>
 * ```
 *
 * **With Next.js app router (mdx-components.tsx):**
 * ```tsx
 * import { alapComponents } from '@alap/mdx';
 * export function useMDXComponents(components) {
 *   return { ...components, ...alapComponents };
 * }
 * ```
 * Then wrap your layout with `<AlapMDXProvider config={config}>`.
 *
 * **Direct import in MDX (no provider needed for component mapping):**
 * ```mdx
 * import { AlapLink } from '@alap/mdx';
 * <AlapLink query=".coffee">cafes</AlapLink>
 * ```
 * `AlapProvider` must still be an ancestor in the tree.
 */

import { type ReactNode, type CSSProperties } from 'react';
import { AlapProvider } from 'alap/react';
import { AlapLink } from 'alap/react';
import type { AlapConfig } from 'alap/core';

/**
 * Component mapping for MDX.
 *
 * Spread into your framework's MDX component config so that
 * `<AlapLink>` in MDX content resolves to the real component.
 *
 * Works with @mdx-js/react's `<MDXProvider components={...}>`,
 * Next.js `useMDXComponents()`, Docusaurus theme config, etc.
 */
export const alapComponents = {
  AlapLink,
} as const;

export interface AlapMDXProviderProps {
  /** Alap configuration (allLinks, macros, settings, protocols, etc.) */
  config: AlapConfig;

  children: ReactNode;

  /** Menu auto-dismiss timeout in ms. Overrides config.settings.menuTimeout. */
  menuTimeout?: number;

  /** Default inline styles applied to all menus. */
  defaultMenuStyle?: CSSProperties;

  /** Default CSS class applied to all menus. */
  defaultMenuClassName?: string;
}

export function AlapMDXProvider({
  config,
  children,
  menuTimeout,
  defaultMenuStyle,
  defaultMenuClassName,
}: AlapMDXProviderProps) {
  return (
    <AlapProvider
      config={config}
      menuTimeout={menuTimeout}
      defaultMenuStyle={defaultMenuStyle}
      defaultMenuClassName={defaultMenuClassName}
    >
      {children}
    </AlapProvider>
  );
}
