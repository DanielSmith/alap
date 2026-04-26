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

export { AlapEngine } from './AlapEngine';
export { ExpressionParser } from './ExpressionParser';
export { mergeConfigs } from './mergeConfigs';
export { warn } from './logger';
export { sanitizeUrl } from './sanitizeUrl';
export { validateRegex } from './validateRegex';
export { validateConfig } from './validateConfig';
export type { ValidateConfigOptions } from './validateConfig';
export { stampProvenance, getProvenance, isAuthorTier, isStorageTier, isProtocolTier } from './linkProvenance';
export type { Provenance } from './linkProvenance';
export { sanitizeUrlStrict, sanitizeUrlWithSchemes } from './sanitizeUrl';
export { sanitizeUrlByTier, sanitizeCssClassByTier, sanitizeTargetWindowByTier } from './sanitizeByTier';
export type { AlapConfig, AlapLink, AlapMacro, AlapSettings, AlapSearchPattern, AlapSearchOptions, AlapProtocol, ProtocolHandler, ResolvedLink, ResolveResult } from './types';
