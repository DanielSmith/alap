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
import { combinedConfig } from './config-combined';

/**
 * Three sources, one menu.
 *
 * Shares the same session key as the main atproto page,
 * so login carries over when navigating between pages.
 */

const SESSION_KEY = 'alap_atproto_session';

function loadSession(): { handle: string; accessJwt: string } | null {
  for (const store of [sessionStorage, localStorage]) {
    try {
      const raw = store.getItem(SESSION_KEY);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (parsed.handle && parsed.accessJwt) return parsed;
    } catch { /* */ }
  }
  return null;
}

async function init() {
  // Restore session if available (shared with main atproto page)
  const saved = loadSession();
  if (saved) {
    const protocol = combinedConfig.protocols?.atproto;
    if (protocol) {
      protocol.accessJwt = saved.accessJwt;
    }
  }

  const ui = new AlapUI(combinedConfig);
  const engine = ui.getEngine();

  // Pre-resolve all protocol expressions
  const triggers = document.querySelectorAll<HTMLElement>('[data-alap-linkitems]');
  const expressions = Array.from(triggers)
    .map(el => el.dataset.alapLinkitems ?? '')
    .filter(expr => expr.includes(':web:') || expr.includes(':atproto:'));

  if (expressions.length > 0) {
    await engine.preResolve(expressions);
  }

  document.body.classList.add('loaded');

  // Load config source into the collapsible code block
  const configEl = document.getElementById('config-source');
  if (configEl) {
    fetch('./config-combined.ts').then(r => r.text()).then(text => { configEl.textContent = text; });
  }
}

init();
