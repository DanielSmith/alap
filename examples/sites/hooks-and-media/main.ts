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

import { AlapUI } from 'alap';
import type { ItemHoverDetail, ItemContextDetail } from 'alap';
import { demoConfig } from './config';

// --- Hover preview panel ---

const hoverPanel = document.getElementById('hover-panel')!;
const hoverImg = hoverPanel.querySelector<HTMLImageElement>('.hover-img')!;
const hoverLabel = hoverPanel.querySelector<HTMLElement>('.hover-label')!;
const hoverDesc = hoverPanel.querySelector<HTMLElement>('.hover-desc')!;

function showHoverPreview(detail: ItemHoverDetail) {
  const { link } = detail;
  hoverLabel.textContent = link.label ?? detail.id;
  hoverDesc.textContent = link.description ?? '';

  if (link.thumbnail) {
    hoverImg.src = link.thumbnail;
    hoverImg.alt = link.label ?? detail.id;
    hoverImg.style.display = 'block';
  } else {
    hoverImg.style.display = 'none';
  }

  hoverPanel.classList.add('visible');
}

function hideHoverPreview() {
  hoverPanel.classList.remove('visible');
}

// Hide preview when menu closes (click outside, Escape, timer)
document.addEventListener('click', (e) => {
  if (!(e.target as HTMLElement).closest('#hover-panel')) {
    hideHoverPreview();
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') hideHoverPreview();
});

// --- Context popup ---

const contextPopup = document.getElementById('context-popup')!;
const contextImg = contextPopup.querySelector<HTMLImageElement>('.context-img')!;
const contextLabel = contextPopup.querySelector<HTMLElement>('.context-label')!;
const contextDesc = contextPopup.querySelector<HTMLElement>('.context-desc')!;
const contextLink = contextPopup.querySelector<HTMLAnchorElement>('.context-link')!;

function showContextPopup(detail: ItemContextDetail) {
  const { link, event } = detail;

  // Prevent default browser context menu
  if (event instanceof MouseEvent) {
    event.preventDefault();
  }

  contextLabel.textContent = link.label ?? detail.id;
  contextDesc.textContent = link.description ?? 'No description available.';
  contextLink.href = link.url;

  if (link.thumbnail) {
    contextImg.src = link.thumbnail;
    contextImg.alt = link.label ?? detail.id;
    contextImg.style.display = 'block';
  } else {
    contextImg.style.display = 'none';
  }

  // Position near the event
  if (event instanceof MouseEvent) {
    contextPopup.style.left = `${event.pageX + 8}px`;
    contextPopup.style.top = `${event.pageY + 8}px`;
  } else {
    // Keyboard (ArrowRight): position near the focused element
    const el = document.activeElement as HTMLElement;
    if (el) {
      const rect = el.getBoundingClientRect();
      contextPopup.style.left = `${rect.right + window.scrollX + 8}px`;
      contextPopup.style.top = `${rect.top + window.scrollY}px`;
    }
  }

  contextPopup.classList.add('visible');
}

function hideContextPopup() {
  contextPopup.classList.remove('visible');
}

// Dismiss context popup
document.addEventListener('click', (e) => {
  if (!(e.target as HTMLElement).closest('#context-popup')) {
    hideContextPopup();
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') hideContextPopup();
});

// --- Log panel ---

const logList = document.getElementById('log-list')!;
let logCount = 0;

function log(type: string, message: string) {
  logCount++;
  const li = document.createElement('li');
  li.innerHTML = `<span class="log-type">${type}</span> ${message}`;
  logList.prepend(li);

  // Keep last 20 entries
  while (logList.children.length > 20) {
    logList.lastChild?.remove();
  }
}

// --- Initialize Alap ---

const ui = new AlapUI(demoConfig, {
  onItemHover(detail) {
    showHoverPreview(detail);
    log('item-hover', `${detail.id} — "${detail.link.label}"`);
  },
  onItemContext(detail) {
    showContextPopup(detail);
    log('item-context', `${detail.id} — ${detail.event.type}`);
  },
  onTriggerHover(detail) {
    log('trigger-hover', `query="${detail.query}" anchor=${detail.anchorId ?? '(none)'}`);
  },
  onTriggerContext(detail) {
    detail.event.preventDefault();
    log('trigger-context', `query="${detail.query}" anchor=${detail.anchorId ?? '(none)'}`);
  },
});

(window as any).alapUI = ui;
