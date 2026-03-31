/**
 * Copyright 2026 Daniel Smith
 * SPDX-License-Identifier: Apache-2.0
 */

import { AlapUI } from 'alap';
import { AlapLightbox } from '../../../src/ui-lightbox';
import '../../../src/ui-lightbox/lightbox.css';
import { demoConfig } from './config';

// Same config, two renderers
const lightbox = new AlapLightbox(demoConfig, { selector: '.alap' });
const menu = new AlapUI(demoConfig, { selector: '.alap-menu' });

// Expose for console debugging
(window as any).alapLightbox = lightbox;
(window as any).alapMenu = menu;
