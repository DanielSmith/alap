/**
 * Copyright 2026 Daniel Smith — Apache 2.0
 *
 * Shared entry point for all json-protocol sub-pages.
 * Initializes whichever renderers the current page uses,
 * then pre-resolves all :json: expressions so menus open from cache.
 */

import { AlapUI } from 'alap';
import { AlapLens } from '../../../src/ui-lens';
import { AlapLightbox } from '../../../src/ui-lightbox';
import '../../../src/ui-lens/lens.css';
import '../../../src/ui-lightbox/lightbox.css';
import { demoConfig } from './config';

function collectExpressions(selector: string): string[] {
  const triggers = document.querySelectorAll<HTMLElement>(selector);
  return Array.from(triggers)
    .map(el => el.dataset.alapLinkitems ?? '')
    .filter(expr => expr.includes(':json:'));
}

async function init() {
  // Create renderers — each binds to its own selector
  const menu = new AlapUI(demoConfig, { selector: '.alap' });
  const lightbox = new AlapLightbox(demoConfig, { selector: '.alap-lightbox' });
  const lens = new AlapLens(demoConfig, { selector: '.alap-lens' });

  // Scan the page for :json: expressions, grouped by renderer
  const menuExprs = collectExpressions('.alap');
  const lightboxExprs = collectExpressions('.alap-lightbox');
  const lensExprs = collectExpressions('.alap-lens');

  // Pre-resolve on each renderer's own engine (they have independent caches)
  const tasks: Promise<void>[] = [];
  if (menuExprs.length > 0) tasks.push(menu.getEngine().preResolve(menuExprs));
  if (lightboxExprs.length > 0) tasks.push(lightbox.getEngine().preResolve(lightboxExprs));
  if (lensExprs.length > 0) tasks.push(lens.getEngine().preResolve(lensExprs));
  await Promise.all(tasks);

  // Expose for debugging
  Object.assign(globalThis, { menu, lightbox, lens, demoConfig });
}

init();
