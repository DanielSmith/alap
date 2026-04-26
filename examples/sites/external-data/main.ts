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

import { AlapUI, webHandler } from 'alap';
import type { ProtocolHandler } from 'alap/core';
import { demoConfig } from './config';

/**
 * External data demo.
 *
 * The :web: protocol is async. As of 3.2 the renderer handles that on the
 * trigger-click path — the menu opens immediately with a "Loading…" placeholder
 * and re-renders in place when the fetch settles. No preResolve wiring needed.
 *
 * Config is data only — handlers live here, wired at engine construction.
 */

const now = Date.now();
const DAY = 86400000;

const timeFilter: ProtocolHandler = (segments, link) => {
  const ts = link.createdAt
    ? (typeof link.createdAt === 'number' ? link.createdAt : new Date(link.createdAt).getTime())
    : 0;
  if (!ts) return false;
  const match = segments[0].match(/^(\d+)([dhw])$/);
  if (!match) return false;
  const n = parseInt(match[1], 10);
  const mult = match[2] === 'h' ? 3600000 : match[2] === 'w' ? 7 * DAY : DAY;
  return (now - ts) <= n * mult;
};

new AlapUI(demoConfig, {
  handlers: {
    web: webHandler,
    time: { filter: timeFilter },
  },
});

document.body.classList.add('loaded');
