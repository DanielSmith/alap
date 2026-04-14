/**
 * Copyright 2026 Daniel Smith
 * SPDX-License-Identifier: Apache-2.0
 */

import { AlapUI } from 'alap';
import { AlapLightbox } from '../../../src/ui-lightbox';
import type { Placement } from '../../../src/ui/shared/placement';
import '../../../src/ui-lightbox/lightbox.css';
import { demoConfig } from './config';

// Same config, two renderers
const lightbox = new AlapLightbox(demoConfig, { selector: '.alap' });
const menu = new AlapUI(demoConfig, { selector: '.alap-menu' });

// --- Compass rose: click a direction to set placement, click again to deselect ---

const DIRECTIONS: Placement[] = ['NW', 'N', 'NE', 'W', 'C', 'E', 'SW', 'S', 'SE'];

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

      if (wasActive) {
        lightbox.setPlacement(null);
      } else {
        btn.classList.add('active');
        lightbox.setPlacement(dir);
      }
    });
    container.appendChild(btn);
  }
}

document.addEventListener('DOMContentLoaded', initCompass);

// Expose for console debugging
(window as any).alapLightbox = lightbox;
(window as any).alapMenu = menu;
