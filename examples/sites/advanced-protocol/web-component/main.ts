/**
 * Copyright 2026 Daniel Smith — Apache 2.0
 *
 * Web Component adapter entry point.
 *
 * Three custom elements backed by one shared config:
 *   <alap-link>, <alap-lens>, <alap-lightbox>
 *
 * All three share the same engine via the config registry, so an in-flight
 * fetch started by one element is reused by the others when tokens match.
 */

import { registerConfig, defineAlapLink, defineAlapLens, defineAlapLightbox } from 'alap';
import { buildConfig, buildHandlers } from '../shared/buildConfig';

registerConfig(buildConfig('web-component'), { handlers: buildHandlers() });
defineAlapLink();
defineAlapLens();
defineAlapLightbox();
