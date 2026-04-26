/**
 * Copyright 2026 Daniel Smith — Apache 2.0
 */

import { createRoot } from 'react-dom/client';
import { registerConfig, defineAlapLens, defineAlapLightbox } from 'alap';
import { buildConfig, buildHandlers } from '../shared/buildConfig';
import { App } from './App';

// Register the config under "_default" so the web-component renderers
// (<alap-lens>, <alap-lightbox>) share the same engine as <AlapLink>.
const config = buildConfig('react');
const handlers = buildHandlers();
registerConfig(config, { handlers });
defineAlapLens();
defineAlapLightbox();

createRoot(document.getElementById('root')!).render(<App config={config} handlers={handlers} />);
