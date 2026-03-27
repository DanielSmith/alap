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
    placement: 'SE',
    placementGap: 6,
  },

  macros: {
    all: { linkItems: '.bridge | .coffee | .park | .long' },
  },

  allLinks: {
    brooklyn: {
      label: 'Brooklyn Bridge',
      url: 'https://en.wikipedia.org/wiki/Brooklyn_Bridge',
      tags: ['bridge', 'nyc'],
    },
    manhattan: {
      label: 'Manhattan Bridge',
      url: 'https://en.wikipedia.org/wiki/Manhattan_Bridge',
      tags: ['bridge', 'nyc'],
    },
    goldengate: {
      label: 'Golden Gate Bridge',
      url: 'https://en.wikipedia.org/wiki/Golden_Gate_Bridge',
      tags: ['bridge', 'sf'],
    },
    williamsburg: {
      label: 'Williamsburg Bridge',
      url: 'https://en.wikipedia.org/wiki/Williamsburg_Bridge',
      tags: ['bridge', 'nyc'],
    },
    baybridge: {
      label: 'Bay Bridge',
      url: 'https://en.wikipedia.org/wiki/San_Francisco%E2%80%93Oakland_Bay_Bridge',
      tags: ['bridge', 'sf'],
    },
    bluebottle: {
      label: 'Blue Bottle Coffee',
      url: 'https://bluebottlecoffee.com',
      tags: ['coffee', 'sf'],
    },
    acre: {
      label: 'Acre Coffee',
      url: 'https://acrecoffee.com',
      tags: ['coffee'],
    },
    aqus: {
      label: 'Aqus Cafe',
      url: 'https://aqus.com',
      tags: ['coffee', 'sf'],
    },
    highline: {
      label: 'The High Line',
      url: 'https://en.wikipedia.org/wiki/High_Line',
      tags: ['nyc', 'park'],
    },
    centralpark: {
      label: 'Central Park',
      url: 'https://en.wikipedia.org/wiki/Central_Park',
      tags: ['nyc', 'park'],
    },
    dolores: {
      label: 'Dolores Park',
      url: 'https://en.wikipedia.org/wiki/Dolores_Park',
      tags: ['sf', 'park'],
    },

    // --- Long menu items (tagged .long for stress testing) ---
    mercury: { label: 'Mercury', url: 'https://en.wikipedia.org/wiki/Mercury_(planet)', tags: ['long', 'planet'] },
    venus: { label: 'Venus', url: 'https://en.wikipedia.org/wiki/Venus', tags: ['long', 'planet'] },
    earth: { label: 'Earth', url: 'https://en.wikipedia.org/wiki/Earth', tags: ['long', 'planet'] },
    mars: { label: 'Mars', url: 'https://en.wikipedia.org/wiki/Mars', tags: ['long', 'planet'] },
    jupiter: { label: 'Jupiter', url: 'https://en.wikipedia.org/wiki/Jupiter', tags: ['long', 'planet'] },
    saturn: { label: 'Saturn', url: 'https://en.wikipedia.org/wiki/Saturn', tags: ['long', 'planet'] },
    uranus: { label: 'Uranus', url: 'https://en.wikipedia.org/wiki/Uranus', tags: ['long', 'planet'] },
    neptune: { label: 'Neptune', url: 'https://en.wikipedia.org/wiki/Neptune', tags: ['long', 'planet'] },
    pluto: { label: 'Pluto (dwarf planet)', url: 'https://en.wikipedia.org/wiki/Pluto', tags: ['long', 'planet'] },
    ceres: { label: 'Ceres (dwarf planet)', url: 'https://en.wikipedia.org/wiki/Ceres_(dwarf_planet)', tags: ['long', 'planet'] },
    eris: { label: 'Eris (dwarf planet)', url: 'https://en.wikipedia.org/wiki/Eris_(dwarf_planet)', tags: ['long', 'planet'] },
    moon: { label: 'The Moon', url: 'https://en.wikipedia.org/wiki/Moon', tags: ['long', 'satellite'] },
    europa: { label: 'Europa', url: 'https://en.wikipedia.org/wiki/Europa_(moon)', tags: ['long', 'satellite'] },
    titan: { label: 'Titan', url: 'https://en.wikipedia.org/wiki/Titan_(moon)', tags: ['long', 'satellite'] },
    ganymede: { label: 'Ganymede', url: 'https://en.wikipedia.org/wiki/Ganymede_(moon)', tags: ['long', 'satellite'] },
    callisto: { label: 'Callisto', url: 'https://en.wikipedia.org/wiki/Callisto_(moon)', tags: ['long', 'satellite'] },
    io_moon: { label: 'Io', url: 'https://en.wikipedia.org/wiki/Io_(moon)', tags: ['long', 'satellite'] },
    triton: { label: 'Triton', url: 'https://en.wikipedia.org/wiki/Triton_(moon)', tags: ['long', 'satellite'] },
    enceladus: { label: 'Enceladus', url: 'https://en.wikipedia.org/wiki/Enceladus', tags: ['long', 'satellite'] },
    phobos: { label: 'Phobos', url: 'https://en.wikipedia.org/wiki/Phobos_(moon)', tags: ['long', 'satellite'] },
  },
};
