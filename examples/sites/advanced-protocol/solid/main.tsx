/**
 * Copyright 2026 Daniel Smith — Apache 2.0
 */

import { render } from 'solid-js/web';
import { registerConfig, defineAlapLens, defineAlapLightbox } from 'alap';
import { buildConfig, buildHandlers } from '../shared/buildConfig';
import App from './App';

const config = buildConfig('solid');
const handlers = buildHandlers();
registerConfig(config, { handlers });
defineAlapLens();
defineAlapLightbox();

render(() => <App config={config} handlers={handlers} />, document.getElementById('root')!);
