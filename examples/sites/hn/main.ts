/**
 * Copyright 2026 Daniel Smith — Apache 2.0
 */

import { AlapUI, AlapLens, hnHandler, timeHandler } from 'alap';
import '../../../src/ui-lens/lens.css';
import { demoConfig } from './config';

/**
 * Hacker News demo.
 *
 * The :hn: protocol is async — it fetches from Firebase / Algolia. Since 3.2
 * that's handled by the renderer's trigger-click path: the menu (or lens)
 * opens immediately with a "Loading…" placeholder and re-renders in place
 * when the fetch settles. No preResolve wiring needed.
 *
 * No auth, no login, no server proxy. Both Firebase and Algolia serve
 * CORS headers, so the browser calls them directly.
 *
 * Config is data only — handlers live here, wired at engine construction.
 */

const handlers = {
  hn: hnHandler,
  time: { filter: timeHandler },
};

new AlapUI(demoConfig, { handlers });
new AlapLens(demoConfig, {
  selector: '.alap-lens',
  handlers,
  metaLabels: {
    author: 'Author',
    score: 'Points',
    comments: 'Comments',
    id: 'HN item',
    hnUrl: 'Discussion',
  },
});

document.body.classList.add('loaded');
