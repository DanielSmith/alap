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
 * Client component re-exports for Next.js App Router.
 *
 * The 'use client' directive makes these safe to import in server components.
 * Users don't need to add 'use client' themselves — these re-exports handle it.
 */

'use client';

export { AlapProvider, AlapLink, useAlap } from 'alap/react';
export type { AlapProviderProps, AlapLinkProps, AlapLinkMode, UseAlapReturn } from 'alap/react';
