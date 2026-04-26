/**
 * Copyright 2026 Daniel Smith — Apache 2.0
 *
 * Shared entry point for all json-protocol sub-pages.
 *
 * As of 3.2, async protocols (including `:json:`) resolve on the trigger-click
 * path — the renderer opens immediately with a "Loading…" placeholder and
 * re-renders in place when the fetch settles. No preResolve wiring needed.
 */

import { AlapUI } from 'alap';
import { AlapLens } from '../../../src/ui-lens';
import { AlapLightbox } from '../../../src/ui-lightbox';
import { jsonHandler } from '../../../src/protocols/json';
import '../../../src/ui-lens/lens.css';
import '../../../src/ui-lightbox/lightbox.css';
import { demoConfig } from './config';

const handlers = { json: jsonHandler };

const menu = new AlapUI(demoConfig, { selector: '.alap', handlers });
const lightbox = new AlapLightbox(demoConfig, { selector: '.alap-lightbox', handlers });
const lens = new AlapLens(demoConfig, { selector: '.alap-lens', handlers });

// Expose for debugging
Object.assign(globalThis, { menu, lightbox, lens, demoConfig });
