/**
 * Copyright 2026 Daniel Smith — Apache 2.0
 *
 * Menu-specific entry point for the json-protocol example.
 * Adds onItemHover hook to show album art thumbnails.
 */

import { AlapUI } from 'alap';
import type { ItemHoverDetail } from 'alap';
import { jsonHandler } from '../../../src/protocols/json';
import { demoConfig } from './config';

// --- Hover preview panel ---

const hoverPanel = document.getElementById('hover-panel')!;
const hoverImg = hoverPanel.querySelector<HTMLImageElement>('.hover-img')!;
const hoverLabel = hoverPanel.querySelector<HTMLElement>('.hover-label')!;

function showHoverPreview(detail: ItemHoverDetail) {
  const { link } = detail;
  if (!link.thumbnail) {
    hoverPanel.classList.remove('visible');
    return;
  }
  hoverImg.src = link.thumbnail;
  hoverImg.alt = link.label ?? detail.id;
  hoverLabel.textContent = link.label ?? detail.id;

  // Position next to the menu
  const menu = document.querySelector('.alapelem[style*="display: block"], .alapelem[style*="display:block"]') as HTMLElement;
  if (menu) {
    const rect = menu.getBoundingClientRect();
    hoverPanel.style.top = `${rect.top + window.scrollY}px`;
    hoverPanel.style.left = `${rect.right + window.scrollX + 12}px`;
  }

  hoverPanel.classList.add('visible');
}

// Hide when menu closes
document.addEventListener('click', (e) => {
  if (!(e.target as HTMLElement).closest('#hover-panel') &&
      !(e.target as HTMLElement).closest('.alapelem')) {
    hoverPanel.classList.remove('visible');
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') hoverPanel.classList.remove('visible');
});

// --- Init ---
// Async protocols resolve on trigger-click (3.2+) — no preResolve needed.

const menu = new AlapUI(demoConfig, {
  selector: '.alap',
  handlers: { json: jsonHandler },
  onItemHover(detail) {
    showHoverPreview(detail);
  },
});

Object.assign(globalThis, { menu, demoConfig });
