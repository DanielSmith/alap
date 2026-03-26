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

export const demoConfig: AlapConfig = {
  settings: {
    listType: 'ul',
    menuTimeout: 5000,
  },

  macros: {
    cars: { linkItems: 'vwbug, bmwe36, miata' },
    nycbridges: { linkItems: '.nyc + .bridge' },
    everything: { linkItems: '.coffee | .bridge | .car | .park' },
  },

  allLinks: {
    vwbug:       { label: 'VW Bug',              url: 'https://en.wikipedia.org/wiki/Volkswagen_Beetle',  tags: ['car', 'germany'], cssClass: 'featured' },
    bmwe36:      { label: 'BMW E36',             url: 'https://en.wikipedia.org/wiki/BMW_3_Series_(E36)', tags: ['car', 'germany'] },
    miata:       { label: 'Mazda Miata',         url: 'https://en.wikipedia.org/wiki/Mazda_MX-5',        tags: ['car', 'japan'] },
    brooklyn:    { label: 'Brooklyn Bridge',     url: 'https://en.wikipedia.org/wiki/Brooklyn_Bridge',   tags: ['nyc', 'bridge', 'landmark'] },
    manhattan:   { label: 'Manhattan Bridge',    url: 'https://en.wikipedia.org/wiki/Manhattan_Bridge',  tags: ['nyc', 'bridge'] },
    highline:    { label: 'The High Line',       url: 'https://en.wikipedia.org/wiki/High_Line',         tags: ['nyc', 'park'] },
    centralpark: { label: 'Central Park',        url: 'https://en.wikipedia.org/wiki/Central_Park',      tags: ['nyc', 'park'] },
    goldengate:  { label: 'Golden Gate Bridge',  url: 'https://en.wikipedia.org/wiki/Golden_Gate_Bridge',tags: ['sf', 'bridge', 'landmark'] },
    dolores:     { label: 'Dolores Park',        url: 'https://en.wikipedia.org/wiki/Dolores_Park',      tags: ['sf', 'park'] },
    aqus:        { label: 'Aqus Cafe',           url: 'https://aqus.com',                                tags: ['coffee', 'sf'] },
    bluebottle:  { label: 'Blue Bottle Coffee',  url: 'https://bluebottlecoffee.com',                    tags: ['coffee', 'sf', 'nyc'] },
    acre:        { label: 'Acre Coffee',         url: 'https://acrecoffee.com',                          tags: ['coffee'] },
    stumptown:   { label: 'Stumptown Coffee',    url: 'https://stumptowncoffee.com',                     tags: ['coffee', 'portland'] },
    ritual:      { label: 'Ritual Coffee',       url: 'https://ritualcoffee.com',                        tags: ['coffee', 'sf'] },
    sightglass:  { label: 'Sightglass Coffee',   url: 'https://sightglasscoffee.com',                    tags: ['coffee', 'sf'] },
    fourbarrel:  { label: 'Four Barrel Coffee',  url: 'https://fourbarrelcoffee.com',                    tags: ['coffee', 'sf'] },

    // Long-label items for ellipsis demo (tagged 'long' only — won't appear in .coffee queries)
    bluebottle_roastery: { label: 'Blue Bottle Coffee — Flagship Roastery & Tasting Room', url: 'https://bluebottlecoffee.com', tags: ['long'] },
    sightglass_soma:     { label: 'Sightglass Coffee SoMa — Division Street Location',     url: 'https://sightglasscoffee.com', tags: ['long'] },
    fourbarrel_valencia: { label: 'Four Barrel Coffee — Valencia Street Original',          url: 'https://fourbarrelcoffee.com', tags: ['long'] },
    ritual_hayes:        { label: 'Ritual Coffee Roasters — Hayes Valley Neighborhood',     url: 'https://ritualcoffee.com',     tags: ['long'] },
  },
};
