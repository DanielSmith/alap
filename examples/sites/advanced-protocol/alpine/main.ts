/**
 * Copyright 2026 Daniel Smith — Apache 2.0
 */

// @ts-expect-error — loaded from CDN, no local types
import Alpine from 'https://esm.sh/alpinejs@3';
import { alapPlugin } from 'alap/alpine';
import { registerConfig, defineAlapLens, defineAlapLightbox } from 'alap';
import { buildConfig, buildHandlers } from '../shared/buildConfig';

const config = buildConfig('alpine');
const handlers = buildHandlers();

// The Alpine directive reads `config` from the x-data scope. Lens and
// lightbox are embedded web components — register the same config so
// their engine is shared with the Alpine triggers. Handlers flow both
// to the registry (for the web-component renderers) and into x-data
// (for the Alpine directive — see advancedDemo below).
registerConfig(config, { handlers });
defineAlapLens();
defineAlapLightbox();

(Alpine as unknown as { plugin: (p: unknown) => void }).plugin(alapPlugin);
Alpine.data('advancedDemo', () => ({
  config,
  handlers,
  dir: '' as '' | 'NW' | 'N' | 'NE' | 'W' | 'C' | 'E' | 'SW' | 'S' | 'SE',
  setDir(next: string) {
    this.dir = this.dir === next ? '' : (next as typeof this.dir);
    const target = this.dir || null;
    document.querySelectorAll('alap-lens, alap-lightbox').forEach((el) => {
      if (target) el.setAttribute('placement', target);
      else el.removeAttribute('placement');
    });
  },
  p(fallback: string) {
    return this.dir || fallback;
  },
}));
Alpine.start();
