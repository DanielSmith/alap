/**
 * Copyright 2026 Daniel Smith
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { AlapUI } from 'alap';
import { demoConfig } from './config';

/**
 * External data demo.
 *
 * The :web: protocol is async — it needs to fetch from APIs before the
 * expression parser can use the results. We create the UI first (which
 * sets up the engine), then pre-resolve all :web: expressions on that
 * engine. After that, menus open instantly from cache.
 */
async function init() {
  // Create the UI — this sets up the engine, event handlers, everything
  const ui = new AlapUI(demoConfig);

  // Scan the page for all alap expressions that use :web:
  const triggers = document.querySelectorAll<HTMLElement>('[data-alap-linkitems]');
  const expressions = Array.from(triggers)
    .map(el => el.dataset.alapLinkitems ?? '')
    .filter(expr => expr.includes(':web:'));

  // Pre-resolve external protocols on the UI's own engine
  if (expressions.length > 0) {
    await ui.getEngine().preResolve(expressions);
  }

  // Remove the loading indicator
  document.body.classList.add('loaded');
}

init();
