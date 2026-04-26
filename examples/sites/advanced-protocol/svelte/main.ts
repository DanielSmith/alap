/**
 * Copyright 2026 Daniel Smith — Apache 2.0
 */

import { mount } from 'svelte';
import { registerConfig, defineAlapLens, defineAlapLightbox } from 'alap';
import { buildConfig, buildHandlers } from '../shared/buildConfig';
import App from './App.svelte';

const config = buildConfig('svelte');
const handlers = buildHandlers();
registerConfig(config, { handlers });
defineAlapLens();
defineAlapLightbox();

mount(App, {
  target: document.getElementById('app')!,
  props: { config, handlers },
});
