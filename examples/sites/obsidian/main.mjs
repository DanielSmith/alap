/**
 * Copyright 2026 Daniel Smith — Apache 2.0
 *
 * Browser entry for the Obsidian example.
 *
 * Registers a thin client-side `obsidian` protocol whose generate handler
 * just POSTs the segments to /api/obsidian/query and returns whatever the
 * server sends back. The actual filesystem work happens in server.mjs
 * (Node-only).
 *
 * Also wires the free-text search input: on submit, we update a single
 * hidden `.alap` trigger's `data-alap-linkitems` to
 * `:obsidian:core:{query}:`, show it, and click it. AlapUI re-reads the
 * attribute on each click, so the menu always reflects the current
 * query without needing to re-register anything.
 */

import { demoConfig } from './config.mjs';

const { AlapUI } = window.Alap;

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
 * URL and flashes the tab (briefly about:blank before the tab recovers).
 * Intercepting here dispatches the URL without touching history.
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
  new AlapUI(demoConfig, { handlers: { obsidian: obsidianProxy } });

  // Async protocols (`:obsidian:`) render progressively on trigger-click as
  // of 3.2 — the menu opens immediately with a "Loading…" placeholder and
  // re-renders in place when the fetch settles. No preResolve wiring needed.

  // --- Free-text search wiring --------------------------------------

  const searchForm = document.getElementById('search-form');
  const searchInput = document.getElementById('search-input');
  const searchTrigger = document.getElementById('search-trigger');
  const chips = document.querySelectorAll('.chip[data-query]');

  if (searchForm && searchInput && searchTrigger) {
    const runSearch = (query) => {
      const trimmed = query.trim();
      if (!trimmed) return;
      const expr = `:obsidian:core:${trimmed}:`;
      searchTrigger.setAttribute('data-alap-linkitems', expr);
      searchTrigger.textContent = `Results for "${trimmed}"`;
      searchTrigger.hidden = false;
      // Progressive rendering handles the fetch — click opens the menu
      // immediately with a "Loading…" placeholder.
      searchTrigger.click();
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
