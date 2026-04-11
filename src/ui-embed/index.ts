/**
 * Copyright 2026 Daniel Smith
 * SPDX-License-Identifier: Apache-2.0
 */

export { createEmbed } from './AlapEmbed';
export type { AlapEmbedOptions } from './AlapEmbed';
export { matchProvider, transformUrl, isAllowlisted, getEmbedHeight } from './embedAllowlist';
export type { EmbedProvider, EmbedType } from './embedAllowlist';
export { shouldLoadEmbed, grantConsent, revokeConsent, hasConsent } from './embedConsent';
export type { EmbedPolicy } from './embedConsent';
