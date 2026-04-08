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

export { AlapEngine } from './core/AlapEngine';
export { ExpressionParser } from './core/ExpressionParser';
export { mergeConfigs } from './core/mergeConfigs';
export { AlapUI } from './ui/dom/AlapUI';
export type { AlapUIOptions } from './ui/dom/AlapUI';
export { AlapLinkElement, registerConfig, updateRegisteredConfig, defineAlapLink } from './ui/web-component/AlapLinkElement';
export type { AlapConfig, AlapLink, AlapMacro, AlapSettings, AlapSearchPattern, AlapSearchOptions, AlapProtocol, ProtocolHandler, GenerateHandler, WebKeyConfig } from './core/types';
export { webHandler } from './protocols/web';
export { atprotoHandler, parseAtUri, atUriToDestinations } from './protocols/atproto';
export type { AtUri } from './protocols/atproto';
export { ProtocolCache } from './protocols/cache';
export type { AlapEventHooks, TriggerHoverDetail, TriggerContextDetail, ItemHoverDetail, ItemContextDetail } from './ui/shared';
export { RendererCoordinator } from './ui/shared';
export type { RendererCoordinatorOptions } from './ui/shared';
export { RENDERER_MENU, RENDERER_LIGHTBOX, RENDERER_LENS } from './ui/shared';
export type { RendererType, OpenPayload, CoordinatedRenderer } from './ui/shared';
