/**
 * Copyright 2026 Daniel Smith
 * SPDX-License-Identifier: Apache-2.0
 */

import { registerConfig } from '../../../src/ui/shared/configRegistry';
import { defineAlapLens } from '../../../src/ui-lens/AlapLensElement';
import { demoConfig } from '../lens/config';

// Register the shared config and define the <alap-lens> element
registerConfig(demoConfig);
defineAlapLens();

// --- Compass rose: click a direction to set placement on all <alap-lens> elements ---

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

      const elements = document.querySelectorAll('alap-lens');

      if (wasActive) {
        // Deselect — remove placement attribute (defaults to centered)
        for (const el of elements) {
          el.removeAttribute('placement');
        }
      } else {
        btn.classList.add('active');
        for (const el of elements) {
          el.setAttribute('placement', dir);
        }
      }
    });
    container.appendChild(btn);
  }
}

document.addEventListener('DOMContentLoaded', initCompass);
