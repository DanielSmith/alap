/**
 * Copyright 2026 Daniel Smith
 * SPDX-License-Identifier: Apache-2.0
 */

import { AlapUI } from 'alap';
import { AlapLens } from '../../../src/ui-lens';
import '../../../src/ui-lens/lens.css';
import { demoConfig } from './config';

// Lens renderer for .alap-lens triggers
const lens = new AlapLens(demoConfig, { selector: '.alap-lens' });

// Standard menu renderer for .alap-menu triggers (same config, different UI)
const menu = new AlapUI(demoConfig, { selector: '.alap-menu' });

// Expose for console debugging
(window as any).alapLens = lens;
(window as any).alapMenu = menu;
