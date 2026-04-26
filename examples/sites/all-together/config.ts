/**
 * Copyright 2026 Daniel Smith
 * SPDX-License-Identifier: Apache-2.0
 */

import type { AlapConfig } from 'alap/core';

export const demoConfig: AlapConfig = {
  settings: {
    listType: 'ul',
    menuTimeout: 5000,
  },
  macros: {
    tour: { linkItems: '.bridge, .park, .coffee' },
  },
  allLinks: {
    brooklyn: {
      label: 'Brooklyn Bridge',
      url: 'https://en.wikipedia.org/wiki/Brooklyn_Bridge',
      tags: ['nyc', 'bridge', 'landmark'],
      description: 'A hybrid cable-stayed / suspension bridge linking Manhattan and Brooklyn, opened 1883.',
      thumbnail: '../shared/img/brooklyn.jpg',
      image: '../shared/img/brooklyn.jpg',
      meta: { opened: 1883, length: '1,825 m', architect: 'John Augustus Roebling' },
    },
    golden_gate: {
      label: 'Golden Gate Bridge',
      url: 'https://en.wikipedia.org/wiki/Golden_Gate_Bridge',
      tags: ['sf', 'bridge', 'landmark'],
      description: 'Suspension bridge spanning the Golden Gate strait, San Francisco. Opened 1937.',
      thumbnail: '../shared/img/goldengate.jpg',
      image: '../shared/img/goldengate.jpg',
      meta: { opened: 1937, length: '2,737 m', architect: 'Joseph Strauss' },
    },
    tower: {
      label: 'Tower Bridge',
      url: 'https://en.wikipedia.org/wiki/Tower_Bridge',
      tags: ['london', 'bridge', 'landmark'],
      description: 'A combined bascule and suspension bridge over the River Thames. Opened 1894.',
      thumbnail: '../shared/img/towerbridge.jpg',
      image: '../shared/img/towerbridge.jpg',
      meta: { opened: 1894, length: '244 m', architect: 'Horace Jones' },
    },
    oberbaum: {
      label: 'Oberbaum Bridge',
      url: 'https://en.wikipedia.org/wiki/Oberbaum_Bridge',
      tags: ['berlin', 'bridge', 'landmark'],
      description: 'Two-tier bridge over the Spree, once the border between East and West Berlin.',
      thumbnail: '../shared/img/oberbaum.jpg',
      image: '../shared/img/oberbaum.jpg',
      meta: { opened: 1896, length: '154 m' },
    },
    highline: {
      label: 'The High Line',
      url: 'https://en.wikipedia.org/wiki/High_Line',
      tags: ['nyc', 'park', 'landmark'],
      description: 'An elevated linear park built on a disused freight rail line.',
      thumbnail: '../shared/img/highline.jpg',
      image: '../shared/img/highline.jpg',
      meta: { opened: 2009, length: '2.33 km' },
    },
    bluebottle: {
      label: 'Blue Bottle Coffee',
      url: 'https://bluebottlecoffee.com',
      tags: ['sf', 'coffee'],
      description: 'Oakland-founded specialty roaster with slow-brew cafes worldwide.',
      thumbnail: '../shared/img/bluebottle.jpg',
      image: '../shared/img/bluebottle.jpg',
      meta: { founded: 2002, headquarters: 'Oakland, CA' },
    },
  },
};
