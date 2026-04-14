/**
 * Copyright 2026 Daniel Smith
 * SPDX-License-Identifier: Apache-2.0
 */

import { registerConfig, defineAlapLink } from 'alap';
import { defineAlapLightbox } from '../../../src/ui-lightbox';
import { demoConfig } from '../lightbox/config';

// Shared config from the DOM lightbox example — same 37 items, same images
registerConfig(demoConfig);

// Define both custom elements
defineAlapLightbox();
defineAlapLink();

// --- Compass rose: click a direction to set placement on all <alap-lightbox> elements ---

const DIRECTIONS = ['NW', 'N', 'NE', 'W', 'C', 'E', 'SW', 'S', 'SE'];

function initCompass(): void {
  const container = document.getElementById('compass');
  if (!container) return;

  for (const dir of DIRECTIONS) {
    const btn = document.createElement('button');
    btn.className = 'compass-btn';
    btn.dataset.dir = dir;
    btn.textContent = dir;
    btn.addEventListener('click', () => {
      const wasActive = btn.classList.contains('active');

      // Clear all
      for (const b of container.querySelectorAll<HTMLElement>('.compass-btn')) {
        b.classList.remove('active');
      }

      const elements = document.querySelectorAll('alap-lightbox');

      if (wasActive) {
        for (const el of elements) {
          if (el.getAttribute('aria-expanded') !== 'true') {
            el.removeAttribute('placement');
          }
        }
      } else {
        btn.classList.add('active');
        for (const el of elements) {
          if (el.getAttribute('aria-expanded') !== 'true') {
            el.setAttribute('placement', dir);
          }
        }
      }
    });
    container.appendChild(btn);
  }
}

document.addEventListener('DOMContentLoaded', initCompass);
