/**
 * Copyright 2026 Daniel Smith — Apache 2.0
 *
 * DOM adapter entry point for the advanced-protocol demo.
 *
 * Wires up three renderers against one shared config:
 *
 *   - AlapUI       — default menu renderer (selector: `.alap`)
 *   - AlapLens     — metadata-card renderer (selector: `.alap-lens`)
 *   - AlapLightbox — fullscreen media renderer (selector: `.alap-lightbox`)
 *
 * Each renderer reads progressive state from the same engine, so an
 * in-flight fetch is shared between them when tokens match.
 */

import { AlapUI } from 'alap';
import { AlapLens } from '../../../../src/ui-lens/AlapLens';
import { AlapLightbox } from '../../../../src/ui-lightbox/AlapLightbox';
import '../../../../src/ui-lens/lens.css';
import '../../../../src/ui-lightbox/lightbox.css';

import { buildConfig, buildHandlers } from '../shared/buildConfig';

const config = buildConfig('dom');
const handlers = buildHandlers();

new AlapUI(config, { selector: '.alap', handlers });
new AlapLens(config, { selector: '.alap-lens', handlers });
new AlapLightbox(config, { selector: '.alap-lightbox', handlers });
