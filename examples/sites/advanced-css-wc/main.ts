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

import { registerConfig, defineAlapLink, AlapUI } from 'alap';
import { demoConfig } from './config';

// Web component (most sections)
registerConfig(demoConfig);
defineAlapLink();

// DOM adapter for per-item sections (cssClass needs light DOM)
new AlapUI(demoConfig, { selector: '.alap' });

// Feature detection banner
const banner = document.getElementById('support-banner');
if (banner) {
  const supportsCornerShape = CSS.supports('corner-shape', 'squircle');
  if (supportsCornerShape) {
    banner.textContent = 'Your browser supports corner-shape. Squircle and scoop menus render with native corner geometry.';
    banner.classList.add('supported');
  } else {
    banner.textContent = 'Your browser does not support corner-shape yet. Squircle and scoop menus fall back to standard border-radius — still looks great.';
    banner.classList.add('unsupported');
  }
}
