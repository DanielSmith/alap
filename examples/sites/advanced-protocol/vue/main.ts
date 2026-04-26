/**
 * Copyright 2026 Daniel Smith — Apache 2.0
 */

import { createApp } from 'vue';
import { registerConfig, defineAlapLens, defineAlapLightbox } from 'alap';
import { buildConfig, buildHandlers } from '../shared/buildConfig';
import App from './App.vue';

const config = buildConfig('vue');
const handlers = buildHandlers();
registerConfig(config, { handlers });
defineAlapLens();
defineAlapLightbox();

// Tell Vue to skip component resolution for the embedded web components.
const app = createApp(App, { config, handlers });
app.config.compilerOptions ??= {};
app.config.compilerOptions.isCustomElement = (tag: string) =>
  tag === 'alap-lens' || tag === 'alap-lightbox' || tag === 'alap-link';
app.mount('#app');
