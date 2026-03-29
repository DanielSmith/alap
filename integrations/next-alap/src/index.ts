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
 * next-alap — Next.js integration for Alap.
 *
 * Provides 'use client' component re-exports and a layout component
 * for the App Router. No webpack — Vite only.
 *
 * Quick start:
 *
 *   // app/layout.tsx
 *   import { AlapLayout } from 'next-alap';
 *   import config from './alap-config';
 *
 *   export default function RootLayout({ children }) {
 *     return <html><body>
 *       <AlapLayout config={config}>{children}</AlapLayout>
 *     </body></html>;
 *   }
 *
 *   // app/page.tsx (server component — no 'use client' needed)
 *   import { AlapLink } from 'next-alap';
 *
 *   export default function Page() {
 *     return <p>Check out <AlapLink query=".coffee">cafes</AlapLink>.</p>;
 *   }
 */

export { AlapProvider, AlapLink, useAlap } from './components';
export type { AlapProviderProps, AlapLinkProps, AlapLinkMode, UseAlapReturn } from './components';
export { AlapLayout } from './layout';
export type { AlapLayoutProps } from './layout';
