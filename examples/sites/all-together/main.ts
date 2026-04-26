/**
 * Copyright 2026 Daniel Smith
 * SPDX-License-Identifier: Apache-2.0
 */

import { AlapUI, AlapLightbox, AlapLens, RendererCoordinator } from 'alap';
import '../../../src/ui-lightbox/lightbox.css';
import '../../../src/ui-lens/lens.css';
import { demoConfig } from './config';

// Menu gets a text-only projection of the same dataset — the lightbox and
// lens carry the visual weight, so large thumbnails in the menu would just
// distract. Stripping `image` makes the menu builder fall back to the label.
const textOnlyConfig = {
  ...demoConfig,
  allLinks: Object.fromEntries(
    Object.entries(demoConfig.allLinks).map(([id, link]) => {
      const { image: _image, ...rest } = link;
      return [id, rest];
    }),
  ),
};

const menu = new AlapUI(textOnlyConfig, { selector: '.alap-menu' });
const lightbox = new AlapLightbox(demoConfig, { selector: '.alap-lightbox' });
const lens = new AlapLens(demoConfig, { selector: '.alap-lens' });

// The coordinator stitches them into a back-stack so Escape walks
// lens → lightbox → menu → closed without the renderers having to know
// about each other. `bindKeyboard` listens at capture phase.
const coordinator = new RendererCoordinator();
coordinator.register(menu);
coordinator.register(lightbox);
coordinator.register(lens);
coordinator.bindKeyboard();

// Expose for console poking.
(window as typeof window & { alap?: unknown }).alap = { menu, lightbox, lens, coordinator };
