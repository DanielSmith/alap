/**
 * Copyright 2026 Daniel Smith — Apache 2.0
 *
 * Browser entry for the Obsidian REST example.
 *
 * Registers a thin client-side `obsidian` protocol whose generate handler
 * just POSTs the segments to /api/obsidian/query and returns whatever the
 * server sends back. The actual REST plugin call happens in server.mjs
 * (Node-only — keeps the API key off the wire to the browser).
 *
 * Also wires the free-text search input: on submit, we update a single
 * hidden `.alap` trigger's `data-alap-linkitems` to
 * `:obsidian:rest:{query}:`, show it, and click it. AlapUI re-reads the
 * attribute on each click, so the menu always reflects the current
 * query without needing to re-register anything.
 */

import { demoConfig } from './config.mjs';

const { AlapUI, AlapLens } = window.Alap;

const QUERY_ENDPOINT = '/api/obsidian/query';

const obsidianProxy = async (segments) => {
  try {
    const response = await fetch(QUERY_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ segments }),
    });
    if (!response.ok) {
      console.warn(`[alap] /api/obsidian/query failed: ${response.status}`);
      return [];
    }
    const data = await response.json();
    return Array.isArray(data?.links) ? data.links : [];
  } catch (err) {
    console.warn('[alap] /api/obsidian/query network error:', err);
    return [];
  }
};

/**
 * External-scheme handoff. Browsers fire the OS protocol handler either
 * way, but the anchor's default navigation also attempts to "load" the
 * URL and flashes the tab. Intercepting here dispatches the URL without
 * touching history.
 */
const EXTERNAL_SCHEMES = /^(obsidian|mailto|tel|sms|vscode|slack|zoommtg|discord|spotify):/i;

document.addEventListener('click', (event) => {
  const anchor = event.target.closest?.('a[href]');
  if (!anchor) return;
  if (!anchor.closest('#alapelem')) return;
  const href = anchor.getAttribute('href');
  if (!href || !EXTERNAL_SCHEMES.test(href)) return;
  event.preventDefault();
  window.location.href = href;
}, { capture: true });

if (!window.Alap?.AlapUI) {
  console.error('[alap] window.Alap.AlapUI missing — did alap.iife.js fail to load?');
} else {
  // One config + one handler registry, two renderer instances. Both
  // AlapUI and AlapLens default their selector to `.alap`, so we MUST
  // pass selectors explicitly here — otherwise lens would bind to the
  // same triggers as menu (last-bound wins) and the .alap-lens trigger
  // would have no listener at all.
  const handlers = { obsidian: obsidianProxy };
  new AlapUI(demoConfig, { selector: '.alap', handlers });
  new AlapLens(demoConfig, { selector: '.alap-lens', handlers });

  // Async protocols (`:obsidian:rest:`) render progressively on
  // trigger-click as of 3.2 — the menu opens immediately with a
  // "Loading…" placeholder and re-renders in place when the fetch
  // settles. No preResolve wiring needed.

  // --- Free-text search wiring --------------------------------------

  const searchForm = document.getElementById('search-form');
  const searchInput = document.getElementById('search-input');
  const searchTriggerMenu = document.getElementById('search-trigger');
  const searchTriggerLens = document.getElementById('search-trigger-lens');
  const chips = document.querySelectorAll('.chip[data-query]');

  if (searchForm && searchInput && searchTriggerMenu && searchTriggerLens) {
    const runSearch = (query) => {
      const trimmed = query.trim();
      if (!trimmed) return;
      const expr = `:obsidian:rest:${trimmed}:`;
      // Update both launchers from the same expression so the user can
      // pick which renderer to view the result set in.
      searchTriggerMenu.setAttribute('data-alap-linkitems', expr);
      searchTriggerLens.setAttribute('data-alap-linkitems', expr);
      searchTriggerMenu.textContent = `Open "${trimmed}" as menu`;
      searchTriggerLens.textContent = `Open "${trimmed}" as lens`;
      searchTriggerMenu.hidden = false;
      searchTriggerLens.hidden = false;
    };

    searchForm.addEventListener('submit', (event) => {
      event.preventDefault();
      runSearch(searchInput.value);
    });

    chips.forEach((chip) => {
      chip.addEventListener('click', () => {
        const q = chip.dataset.query;
        if (!q) return;
        searchInput.value = q;
        runSearch(q);
      });
    });
  }
}

document.body.classList.add('loaded');
