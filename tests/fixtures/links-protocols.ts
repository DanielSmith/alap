/**
 * Test fixture for protocol and refiner tests.
 * Extends the base fixture with meta fields, timestamps, and protocol handlers.
 */

import type { AlapConfig, ProtocolHandlerRegistry } from '../../src/core/types';
import { timeHandler } from '../../src/protocols/time';
import { locationHandler } from '../../src/protocols/location';

const now = Date.now();
const DAY = 24 * 60 * 60 * 1000;

/**
 * Data-only config shared across the protocol/refiner tier tests.
 * Pair with `protocolHandlers` at engine construction:
 *
 *   new AlapEngine(protocolConfig, { handlers: protocolHandlers })
 */
export const protocolConfig: AlapConfig = {
  settings: { listType: 'ul', menuTimeout: 5000 },

  macros: {
    cars: { linkItems: 'vwbug, bmwe36' },
    nycbridges: { linkItems: '.nyc + .bridge' },
    sorted_coffee: { linkItems: '.coffee *sort:label*' },
    top2_nyc: { linkItems: '.nyc *sort:label* *limit:2*' },
  },

  // All three protocols below are filter-only (no data to store in the
  // config), so the `protocols` map is empty here. Filters live in
  // `protocolHandlers` and are registered at engine construction.

  allLinks: {
    // Cars
    vwbug: {
      label: 'VW Bug',
      url: 'https://example.com/vwbug',
      tags: ['car', 'vw', 'germany'],
      createdAt: now - 5 * DAY,
      meta: { price: 15000 },
    },
    bmwe36: {
      label: 'BMW E36',
      url: 'https://example.com/bmwe36',
      tags: ['car', 'bmw', 'germany'],
      createdAt: now - 60 * DAY,
      meta: { price: 25000 },
    },
    miata: {
      label: 'Mazda Miata',
      url: 'https://example.com/miata',
      tags: ['car', 'mazda', 'japan'],
      createdAt: now - 10 * DAY,
      meta: { price: 20000 },
    },

    // NYC
    brooklyn: {
      label: 'Brooklyn Bridge',
      url: 'https://example.com/brooklyn',
      tags: ['nyc', 'bridge', 'landmark'],
      createdAt: now - 3 * DAY,
      meta: { location: [40.7061, -73.9969] as [number, number] },
    },
    manhattan: {
      label: 'Manhattan Bridge',
      url: 'https://example.com/manhattan',
      tags: ['nyc', 'bridge'],
      createdAt: now - 20 * DAY,
      meta: { location: [40.7075, -73.9903] as [number, number] },
    },
    highline: {
      label: 'The High Line',
      url: 'https://example.com/highline',
      tags: ['nyc', 'park', 'landmark'],
      createdAt: now - 2 * DAY,
    },
    centralpark: {
      label: 'Central Park',
      url: 'https://example.com/centralpark',
      tags: ['nyc', 'park'],
      createdAt: now - 100 * DAY,
    },

    // SF
    goldengate: {
      label: 'Golden Gate',
      url: 'https://example.com/goldengate',
      tags: ['sf', 'bridge', 'landmark'],
      createdAt: now - 1 * DAY,
      meta: { location: [37.8199, -122.4783] as [number, number] },
    },
    dolores: {
      label: 'Dolores Park',
      url: 'https://example.com/dolores',
      tags: ['sf', 'park'],
      createdAt: now - 15 * DAY,
    },

    // Coffee
    aqus: {
      label: 'Aqus Cafe',
      url: 'https://example.com/aqus',
      tags: ['coffee', 'sf'],
      createdAt: now - 7 * DAY,
      meta: { price: 5 },
    },
    bluebottle: {
      label: 'Blue Bottle',
      url: 'https://example.com/bluebottle',
      tags: ['coffee', 'sf', 'nyc'],
      createdAt: now - 4 * DAY,
      meta: { price: 6 },
    },
    acre: {
      label: 'Acre Coffee',
      url: 'https://example.com/acre',
      tags: ['coffee'],
      createdAt: now - 50 * DAY,
      meta: { price: 4 },
    },
  },
};

/**
 * Shared handler registry for protocol/refiner tier tests.
 * Registers time + price + location filter handlers.
 */
export const protocolHandlers: ProtocolHandlerRegistry = {
  time: { filter: timeHandler },
  price: {
    filter: (segments, link) => {
      const price = link.meta?.price as number | undefined;
      if (price === undefined) return false;
      const min = parseFloat(segments[0]);
      const max = segments[1] !== undefined ? parseFloat(segments[1]) : Infinity;
      return price >= min && price <= max;
    },
  },
  location: { filter: locationHandler },
};
