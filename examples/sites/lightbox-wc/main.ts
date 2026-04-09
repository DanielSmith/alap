/**
 * Copyright 2026 Daniel Smith
 * SPDX-License-Identifier: Apache-2.0
 */

import { registerConfig, defineAlapLink } from 'alap';
import { defineAlapLightbox } from '../../../src/ui-lightbox';
import { demoConfig } from '../lightbox/config';

// Shared config from the DOM lightbox example — same 37 items, same images
registerConfig(demoConfig);

// Define both custom elements
defineAlapLightbox();
defineAlapLink();
