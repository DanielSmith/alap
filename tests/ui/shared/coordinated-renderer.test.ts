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

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AlapUI } from '../../../src/ui/dom/AlapUI';
import { AlapLightbox } from '../../../src/ui-lightbox/AlapLightbox';
import { AlapLens } from '../../../src/ui-lens/AlapLens';
import { RendererCoordinator } from '../../../src/ui/shared/rendererCoordinator';
import { RENDERER_MENU, RENDERER_LIGHTBOX, RENDERER_LENS } from '../../../src/ui/shared/coordinatedRenderer';
import { testConfig } from '../../fixtures/links';
import { lensTestConfig } from '../../fixtures/lens-links';
import type { ResolvedLink } from '../../../src/core/types';
import { AlapEngine } from '../../../src/core/AlapEngine';

// --- Helpers ---

function createTrigger(id: string, expression: string): HTMLElement {
  const a = document.createElement('a');
  a.id = id;
  a.className = 'alap';
  a.setAttribute('data-alap-linkitems', expression);
  a.textContent = id;
  document.body.appendChild(a);
  return a;
}

function resolveLinks(expression: string): ResolvedLink[] {
  const engine = new AlapEngine(testConfig);
  return engine.resolve(expression);
}

// --- Tests ---

describe('CoordinatedRenderer integration', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  // =========================================================================
  // AlapUI
  // =========================================================================

  describe('AlapUI', () => {
    let ui: AlapUI;

    afterEach(() => { ui?.destroy(); });

    it('has correct rendererType', () => {
      createTrigger('t1', '@cars');
      ui = new AlapUI(testConfig);
      expect(ui.rendererType).toBe(RENDERER_MENU);
    });

    it('isOpen reflects menu state', () => {
      const trigger = createTrigger('t1', '@cars');
      ui = new AlapUI(testConfig);

      expect(ui.isOpen).toBe(false);

      trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(ui.isOpen).toBe(true);
    });

    it('openWith renders menu with given links', () => {
      createTrigger('t1', '@cars');
      ui = new AlapUI(testConfig);

      const links = resolveLinks('.bridge');
      const trigger = document.querySelector('#t1') as HTMLElement;

      ui.openWith({ links, triggerElement: trigger });

      expect(ui.isOpen).toBe(true);
      const menu = document.getElementById('alapelem');
      expect(menu).not.toBeNull();
      const items = menu!.querySelectorAll('a[role="menuitem"]');
      expect(items.length).toBe(links.length);
    });

    it('close returns the active trigger', () => {
      const trigger = createTrigger('t1', '@cars');
      ui = new AlapUI(testConfig);

      trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      const returned = ui.close();

      expect(returned).toBe(trigger);
      expect(ui.isOpen).toBe(false);
    });

    it('close returns null when no trigger is active', () => {
      ui = new AlapUI(testConfig);
      const returned = ui.close();
      expect(returned).toBeNull();
    });
  });

  // =========================================================================
  // AlapLightbox
  // =========================================================================

  describe('AlapLightbox', () => {
    let lightbox: AlapLightbox;

    afterEach(() => { lightbox?.destroy(); });

    it('has correct rendererType', () => {
      lightbox = new AlapLightbox(testConfig);
      expect(lightbox.rendererType).toBe(RENDERER_LIGHTBOX);
    });

    it('isOpen reflects overlay state', () => {
      lightbox = new AlapLightbox(testConfig);
      expect(lightbox.isOpen).toBe(false);

      lightbox.openWith({ links: resolveLinks('@cars') });
      expect(lightbox.isOpen).toBe(true);

      lightbox.close();
      expect(lightbox.isOpen).toBe(false);
    });

    it('openWith creates overlay with correct content', () => {
      lightbox = new AlapLightbox(testConfig);
      const links = resolveLinks('@cars');

      lightbox.openWith({ links, initialIndex: 1 });

      const overlay = document.querySelector('.alap-lightbox-overlay');
      expect(overlay).not.toBeNull();

      const title = overlay!.querySelector('.alap-lightbox-label');
      expect(title!.textContent).toBe(links[1].label);
    });

    it('close returns the trigger element', () => {
      const trigger = createTrigger('t1', '@cars');
      lightbox = new AlapLightbox(testConfig);

      lightbox.openWith({ links: resolveLinks('@cars'), triggerElement: trigger });
      const returned = lightbox.close();

      expect(returned).toBe(trigger);
    });

    it('openWith with empty links does not open', () => {
      lightbox = new AlapLightbox(testConfig);
      lightbox.openWith({ links: [] });
      expect(lightbox.isOpen).toBe(false);
    });
  });

  // =========================================================================
  // AlapLens
  // =========================================================================

  describe('AlapLens', () => {
    let lens: AlapLens;

    afterEach(() => { lens?.destroy(); });

    it('has correct rendererType', () => {
      lens = new AlapLens(lensTestConfig);
      expect(lens.rendererType).toBe(RENDERER_LENS);
    });

    it('isOpen reflects overlay state', () => {
      lens = new AlapLens(lensTestConfig);
      expect(lens.isOpen).toBe(false);

      const engine = new AlapEngine(lensTestConfig);
      lens.openWith({ links: engine.resolve('mrrobot') });
      expect(lens.isOpen).toBe(true);

      lens.close();
      expect(lens.isOpen).toBe(false);
    });

    it('openWith creates overlay with correct content', () => {
      lens = new AlapLens(lensTestConfig);
      const engine = new AlapEngine(lensTestConfig);
      const links = engine.resolve('@shows');

      lens.openWith({ links, initialIndex: 1 });

      const overlay = document.querySelector('.alap-lens-overlay');
      expect(overlay).not.toBeNull();

      const label = overlay!.querySelector('.alap-lens-label');
      expect(label!.textContent).toBe(links[1].label);
    });

    it('close returns the trigger element', () => {
      const trigger = createTrigger('t1', 'mrrobot');
      lens = new AlapLens(lensTestConfig);

      const engine = new AlapEngine(lensTestConfig);
      lens.openWith({ links: engine.resolve('mrrobot'), triggerElement: trigger });
      const returned = lens.close();

      expect(returned).toBe(trigger);
    });

    it('openWith with empty links does not open', () => {
      lens = new AlapLens(lensTestConfig);
      lens.openWith({ links: [] });
      expect(lens.isOpen).toBe(false);
    });
  });

  // =========================================================================
  // Round-trip: coordinator + real renderers
  // =========================================================================

  describe('round-trip with coordinator', () => {
    let ui: AlapUI;
    let lens: AlapLens;
    let coordinator: RendererCoordinator;

    afterEach(() => {
      coordinator?.destroy();
      ui?.destroy();
      lens?.destroy();
    });

    it('menu → lens → back → menu', () => {
      createTrigger('t1', '@cars');
      ui = new AlapUI(testConfig);
      lens = new AlapLens(lensTestConfig, { transition: 'none' });

      coordinator = new RendererCoordinator({ viewTransitions: false });
      coordinator.register(ui);
      coordinator.register(lens);

      // Open menu
      const menuLinks = resolveLinks('@cars');
      const trigger = document.querySelector('#t1') as HTMLElement;
      coordinator.transitionTo(RENDERER_MENU, { links: menuLinks, triggerElement: trigger });

      expect(ui.isOpen).toBe(true);
      expect(lens.isOpen).toBe(false);
      expect(coordinator.depth).toBe(0);

      // Transition to lens
      const engine = new AlapEngine(lensTestConfig);
      const lensLinks = engine.resolve('mrrobot');
      coordinator.transitionTo(RENDERER_LENS, { links: lensLinks });

      expect(ui.isOpen).toBe(false);
      expect(lens.isOpen).toBe(true);
      expect(coordinator.depth).toBe(1);

      // Verify lens content
      const lensLabel = document.querySelector('.alap-lens-label');
      expect(lensLabel!.textContent).toBe('Mr. Robot');

      // Back to menu
      coordinator.back();

      expect(lens.isOpen).toBe(false);
      expect(ui.isOpen).toBe(true);
      expect(coordinator.depth).toBe(0);

      // Verify menu content restored
      const menuItems = document.querySelectorAll('#alapelem a[role="menuitem"]');
      expect(menuItems.length).toBe(menuLinks.length);
    });
  });
});
