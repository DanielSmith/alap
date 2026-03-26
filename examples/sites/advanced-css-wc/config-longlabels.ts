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

import type { AlapConfig } from 'alap/core';

/**
 * Separate config with intentionally long labels for the ellipsis demo.
 * Registered as 'longlabels' so it doesn't pollute the main config.
 */
export const longLabelsConfig: AlapConfig = {
  settings: {
    listType: 'ul',
    menuTimeout: 5000,
  },

  macros: {
    all: { linkItems: 'bluebottle_roastery, sightglass_soma, fourbarrel_valencia, ritual_hayes' },
  },

  allLinks: {
    bluebottle_roastery: { label: 'Blue Bottle Coffee — Flagship Roastery & Tasting Room', url: 'https://bluebottlecoffee.com', tags: ['coffee'] },
    sightglass_soma:     { label: 'Sightglass Coffee SoMa — Division Street Location',     url: 'https://sightglasscoffee.com', tags: ['coffee'] },
    fourbarrel_valencia: { label: 'Four Barrel Coffee — Valencia Street Original',          url: 'https://fourbarrelcoffee.com', tags: ['coffee'] },
    ritual_hayes:        { label: 'Ritual Coffee Roasters — Hayes Valley Neighborhood',     url: 'https://ritualcoffee.com',     tags: ['coffee'] },
  },
};
