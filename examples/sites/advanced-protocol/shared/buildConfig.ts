/**
 * Copyright 2026 Daniel Smith — Apache 2.0
 */

import type { AlapConfig, ProtocolHandlerRegistry } from 'alap/core';
import { hnHandler, timeHandler } from 'alap';
import { slowHandler, flakyHandler } from './mockProtocols';
import { ECOSYSTEMS, type EcosystemId } from './ecosystems';

/**
 * Build an `AlapConfig` for an adapter's demo page.
 *
 * Shared plumbing across every adapter:
 *
 *   `:slow:` / `:flaky:`  — deterministic mocks (see `mockProtocols.ts`)
 *   `:hn:search:$alias:`  — real-data loading keyed to the adapter
 *   `:time:`              — composes with :hn: for recency filters
 *
 * The ecosystem parameter chooses the static link set, the Algolia search
 * alias, and the hero images used by the lens / lightbox sections, so each
 * adapter's page feels like a first-class integration rather than a clone.
 *
 * Config is data only — pair with `buildHandlers()` at engine construction
 * (`new AlapEngine(config, { handlers })` or `registerConfig(config, { handlers })`).
 */
export function buildConfig(ecosystemId: EcosystemId): AlapConfig {
  const eco = ECOSYSTEMS[ecosystemId];

  return {
    settings: {
      listType: 'ul',
      menuTimeout: 8000,
      // Cancel in-flight fetches when the menu is dismissed. Handy for the
      // "click & quickly dismiss" demo row.
      cancelFetchOnDismiss: true,
    },

    macros: {
      // Ecosystem-wide composition: this adapter's static links intersected
      // with a recency window on the matching HN search.
      picks: { linkItems: `.${ecosystemId}` },
    },

    protocols: {
      // Deterministic mocks — every adapter demos loading / error / empty
      // with the exact same timing, so the screenshots line up.
      slow: {},
      flaky: { cache: 0 },

      // Real async data, keyed to the adapter's identity.
      hn: {
        cache: 10,
        searches: {
          [eco.hnSearchAlias]: eco.hnSearchQuery,
        },
        defaults: { limit: 8 },
      },

      time: {},
    },

    allLinks: {
      ...eco.links,
      ...eco.lensLinks,
      ...eco.lightboxLinks,
    },
  };
}

/**
 * Shared handler registry — identical across all adapters.
 */
export function buildHandlers(): ProtocolHandlerRegistry {
  return {
    slow: slowHandler,
    flaky: flakyHandler,
    hn: hnHandler,
    time: { filter: timeHandler },
  };
}
