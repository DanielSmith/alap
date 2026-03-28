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

// Remark plugin
export { default as remarkAlapMDX } from './remarkAlapMDX';
export type { RemarkAlapMDXOptions } from './remarkAlapMDX';

// Provider and component mapping
export { AlapMDXProvider, alapComponents } from './AlapMDXProvider';
export type { AlapMDXProviderProps } from './AlapMDXProvider';

// Re-export AlapLink for direct import in MDX files
export { AlapLink } from 'alap/react';
export type { AlapLinkProps } from 'alap/react';
