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

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AlapLens } from '../../../src/ui-lens/AlapLens';
import { lensTestConfig } from '../../fixtures/lens-links';

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

function clickTrigger(trigger: HTMLElement): void {
  trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

function getOverlay(): HTMLElement | null {
  return document.querySelector('.alap-lens-overlay');
}

function getPanel(): HTMLElement | null {
  return document.querySelector('.alap-lens-panel');
}

function pressKey(key: string): void {
  document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
}

function findMetaRow(rows: NodeListOf<Element>, keyText: string): Element | null {
  for (const row of rows) {
    const key = row.querySelector('.alap-lens-meta-key');
    if (key && key.textContent === keyText) return row;
  }
  return null;
}

// --- Tests ---

describe('AlapLens', () => {
  let lens: AlapLens;

  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    lens?.destroy();
  });

  // =========================================================================
  // Trigger setup
  // =========================================================================

  describe('trigger setup', () => {
    it('sets role=button on triggers', () => {
      const trigger = createTrigger('t1', 'mrrobot');
      lens = new AlapLens(lensTestConfig);
      expect(trigger.getAttribute('role')).toBe('button');
    });

    it('sets tabindex=0 on triggers without existing tabindex', () => {
      const trigger = createTrigger('t1', 'mrrobot');
      lens = new AlapLens(lensTestConfig);
      expect(trigger.getAttribute('tabindex')).toBe('0');
    });

    it('preserves existing tabindex on triggers', () => {
      const trigger = createTrigger('t1', 'mrrobot');
      trigger.setAttribute('tabindex', '-1');
      lens = new AlapLens(lensTestConfig);
      expect(trigger.getAttribute('tabindex')).toBe('-1');
    });

    it('uses custom selector', () => {
      const a = document.createElement('a');
      a.className = 'custom-lens';
      a.setAttribute('data-alap-linkitems', 'mrrobot');
      document.body.appendChild(a);

      lens = new AlapLens(lensTestConfig, { selector: '.custom-lens' });
      expect(a.getAttribute('role')).toBe('button');
    });
  });

  // =========================================================================
  // Overlay lifecycle
  // =========================================================================

  describe('overlay lifecycle', () => {
    it('creates overlay on trigger click', () => {
      const trigger = createTrigger('t1', 'mrrobot');
      lens = new AlapLens(lensTestConfig);

      expect(getOverlay()).toBeNull();
      clickTrigger(trigger);
      expect(getOverlay()).not.toBeNull();
    });

    it('sets dialog ARIA on overlay', () => {
      const trigger = createTrigger('t1', 'mrrobot');
      lens = new AlapLens(lensTestConfig);
      clickTrigger(trigger);

      const overlay = getOverlay()!;
      expect(overlay.getAttribute('role')).toBe('dialog');
      expect(overlay.getAttribute('aria-modal')).toBe('true');
      expect(overlay.getAttribute('aria-label')).toBe('Item details');
    });

    it('does not open overlay for empty results', () => {
      const trigger = createTrigger('t1', '.nonexistent');
      lens = new AlapLens(lensTestConfig);
      clickTrigger(trigger);

      expect(getOverlay()).toBeNull();
    });

    it('does not open overlay when expression attribute is missing', () => {
      const a = document.createElement('a');
      a.className = 'alap';
      a.textContent = 'no expression';
      document.body.appendChild(a);

      lens = new AlapLens(lensTestConfig);
      a.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(getOverlay()).toBeNull();
    });

    it('replaces overlay when clicking a different trigger', () => {
      const t1 = createTrigger('t1', 'mrrobot');
      const t2 = createTrigger('t2', 'apple');
      lens = new AlapLens(lensTestConfig);

      clickTrigger(t1);
      const label1 = getPanel()!.querySelector('.alap-lens-label')!.textContent;

      clickTrigger(t2);
      const label2 = getPanel()!.querySelector('.alap-lens-label')!.textContent;

      expect(label1).toBe('Mr. Robot');
      expect(label2).toBe('Apple Inc.');
      expect(document.querySelectorAll('.alap-lens-overlay').length).toBe(1);
    });
  });

  // =========================================================================
  // Dismissal
  // =========================================================================

  describe('dismissal', () => {
    it('closes on Escape key', () => {
      const trigger = createTrigger('t1', 'mrrobot');
      lens = new AlapLens(lensTestConfig);
      clickTrigger(trigger);

      expect(getOverlay()).not.toBeNull();
      pressKey('Escape');
      expect(getOverlay()).toBeNull();
    });

    it('closes on overlay background click', () => {
      const trigger = createTrigger('t1', 'mrrobot');
      lens = new AlapLens(lensTestConfig);
      clickTrigger(trigger);

      const overlay = getOverlay()!;
      overlay.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(getOverlay()).toBeNull();
    });

    it('does not close on panel click', () => {
      const trigger = createTrigger('t1', 'mrrobot');
      lens = new AlapLens(lensTestConfig);
      clickTrigger(trigger);

      const panel = getPanel()!;
      panel.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(getOverlay()).not.toBeNull();
    });

    it('closes via close X button', () => {
      const trigger = createTrigger('t1', 'mrrobot');
      lens = new AlapLens(lensTestConfig);
      clickTrigger(trigger);

      const closeX = document.querySelector('.alap-lens-close-x') as HTMLButtonElement;
      expect(closeX).not.toBeNull();
      closeX.click();
      expect(getOverlay()).toBeNull();
    });

    it('closes via close button in actions', () => {
      const trigger = createTrigger('t1', 'mrrobot');
      lens = new AlapLens(lensTestConfig, { panelCloseButton: true });
      clickTrigger(trigger);

      const closeBtn = document.querySelector('.alap-lens-close-btn') as HTMLButtonElement;
      expect(closeBtn).not.toBeNull();
      closeBtn.click();
      expect(getOverlay()).toBeNull();
    });

    it('close() is safe to call when already closed', () => {
      lens = new AlapLens(lensTestConfig);
      expect(() => lens.close()).not.toThrow();
    });
  });

  // =========================================================================
  // Top zone rendering
  // =========================================================================

  describe('top zone rendering', () => {
    it('renders label as h2', () => {
      const trigger = createTrigger('t1', 'mrrobot');
      lens = new AlapLens(lensTestConfig);
      clickTrigger(trigger);

      const label = getPanel()!.querySelector('.alap-lens-label');
      expect(label).not.toBeNull();
      expect(label!.textContent).toBe('Mr. Robot');
      expect(label!.tagName).toBe('H2');
    });

    it('renders tags as chips', () => {
      const trigger = createTrigger('t1', 'mrrobot');
      lens = new AlapLens(lensTestConfig);
      clickTrigger(trigger);

      const tags = getPanel()!.querySelectorAll('.alap-lens-tag');
      expect(tags.length).toBe(3);
      const tagTexts = Array.from(tags).map((t) => t.textContent);
      expect(tagTexts).toContain('drama');
      expect(tagTexts).toContain('thriller');
      expect(tagTexts).toContain('scifi');
    });

    it('renders description', () => {
      const trigger = createTrigger('t1', 'mrrobot');
      lens = new AlapLens(lensTestConfig);
      clickTrigger(trigger);

      const desc = getPanel()!.querySelector('.alap-lens-description');
      expect(desc).not.toBeNull();
      expect(desc!.textContent).toContain('hackers and technology');
    });

    it('renders image from thumbnail field', () => {
      const trigger = createTrigger('t1', 'mrrobot');
      lens = new AlapLens(lensTestConfig);
      clickTrigger(trigger);

      const img = getPanel()!.querySelector('.alap-lens-image') as HTMLImageElement;
      expect(img).not.toBeNull();
      expect(img.src).toBe('https://example.com/images/mrrobot.jpg');
      expect(img.alt).toBe('Mr. Robot');
    });

    it('renders image from image field when thumbnail is absent', () => {
      const trigger = createTrigger('t1', 'banana');
      lens = new AlapLens(lensTestConfig);
      clickTrigger(trigger);

      const img = getPanel()!.querySelector('.alap-lens-image') as HTMLImageElement;
      expect(img).not.toBeNull();
      expect(img.src).toBe('https://example.com/images/banana.jpg');
      expect(img.alt).toBe('A frozen banana stand');
    });

    it('adds empty class to image wrap when no image', () => {
      const trigger = createTrigger('t1', 'minimal');
      lens = new AlapLens(lensTestConfig);
      clickTrigger(trigger);

      const thumbWrap = getPanel()!.querySelector('.alap-lens-image-wrap');
      expect(thumbWrap).not.toBeNull();
      expect(thumbWrap!.classList.contains('alap-lens-image-wrap-empty')).toBe(true);
      expect(thumbWrap!.querySelector('img')).toBeNull();
    });

    it('omits tags section when item has no tags and copyable is false', () => {
      const trigger = createTrigger('t1', 'minimal');
      lens = new AlapLens(lensTestConfig, { copyable: false });
      clickTrigger(trigger);

      expect(getPanel()!.querySelector('.alap-lens-tags')).toBeNull();
    });

    it('omits description when item has none', () => {
      const trigger = createTrigger('t1', 'minimal');
      lens = new AlapLens(lensTestConfig);
      clickTrigger(trigger);

      expect(getPanel()!.querySelector('.alap-lens-description')).toBeNull();
    });
  });

  // =========================================================================
  // Meta field rendering — type detection
  // =========================================================================

  describe('meta field type detection', () => {
    it('renders numbers as key-value rows', () => {
      const trigger = createTrigger('t1', 'fruitdata');
      lens = new AlapLens(lensTestConfig);
      clickTrigger(trigger);

      const rows = getPanel()!.querySelectorAll('.alap-lens-meta-row');
      const caloriesRow = findMetaRow(rows, 'Calories');
      expect(caloriesRow).not.toBeNull();
      expect(caloriesRow!.querySelector('.alap-lens-meta-value')!.textContent).toBe('52');
    });

    it('renders true boolean with check symbol', () => {
      const trigger = createTrigger('t1', 'fruitdata');
      lens = new AlapLens(lensTestConfig);
      clickTrigger(trigger);

      const rows = getPanel()!.querySelectorAll('.alap-lens-meta-row');
      const organicRow = findMetaRow(rows, 'Organic');
      expect(organicRow).not.toBeNull();
      expect(organicRow!.querySelector('.alap-lens-meta-value')!.textContent).toBe('\u2713');
    });

    it('renders false boolean with cross symbol', () => {
      const trigger = createTrigger('t1', 'mrrobot');
      lens = new AlapLens(lensTestConfig);
      clickTrigger(trigger);

      const rows = getPanel()!.querySelectorAll('.alap-lens-meta-row');
      const ongoingRow = findMetaRow(rows, 'Ongoing');
      expect(ongoingRow).not.toBeNull();
      expect(ongoingRow!.querySelector('.alap-lens-meta-value')!.textContent).toBe('\u2717');
    });

    it('renders short strings as key-value rows', () => {
      const trigger = createTrigger('t1', 'mrrobot');
      lens = new AlapLens(lensTestConfig);
      clickTrigger(trigger);

      const rows = getPanel()!.querySelectorAll('.alap-lens-meta-row');
      const statusRow = findMetaRow(rows, 'Status');
      expect(statusRow).not.toBeNull();
      expect(statusRow!.querySelector('.alap-lens-meta-value')!.textContent).toBe('Ended');
    });

    it('renders string arrays as chips', () => {
      const trigger = createTrigger('t1', 'mrrobot');
      lens = new AlapLens(lensTestConfig);
      clickTrigger(trigger);

      const rows = getPanel()!.querySelectorAll('.alap-lens-meta-row');
      const genresRow = findMetaRow(rows, 'Genres');
      expect(genresRow).not.toBeNull();

      const chips = genresRow!.querySelectorAll('.alap-lens-meta-chip');
      expect(chips.length).toBe(3);
      expect(chips[0].textContent).toBe('Drama');
      expect(chips[1].textContent).toBe('Thriller');
      expect(chips[2].textContent).toBe('Science-Fiction');
    });

    it('renders URL arrays as links with truncation', () => {
      const trigger = createTrigger('t1', 'mrrobot');
      lens = new AlapLens(lensTestConfig);
      clickTrigger(trigger);

      const rows = getPanel()!.querySelectorAll('.alap-lens-meta-row');
      const episodesRow = findMetaRow(rows, 'Episodes (7)');
      expect(episodesRow).not.toBeNull();

      const links = episodesRow!.querySelectorAll('.alap-lens-meta-link');
      expect(links.length).toBe(5);

      const firstLink = links[0] as HTMLAnchorElement;
      expect(firstLink.href).toBe('https://example.com/ep/s01e01');
      expect(firstLink.target).toBe('_blank');
      expect(firstLink.rel).toBe('noopener noreferrer');

      const more = episodesRow!.querySelector('.alap-lens-meta-more');
      expect(more).not.toBeNull();
      expect(more!.textContent).toBe('+2 more');
    });

    it('renders long text as text block via display hint', () => {
      const trigger = createTrigger('t1', 'dictword');
      lens = new AlapLens(lensTestConfig);
      clickTrigger(trigger);

      const textBlocks = getPanel()!.querySelectorAll('.alap-lens-meta-row-text');
      const originBlock = Array.from(textBlocks).find((row) => {
        const key = row.querySelector('.alap-lens-meta-key');
        return key && key.textContent === 'Origin';
      });
      expect(originBlock).not.toBeUndefined();
      expect(originBlock!.querySelector('.alap-lens-meta-text')!.textContent).toContain('Horace Walpole');
    });
  });

  // =========================================================================
  // Meta field rendering — filtering
  // =========================================================================

  describe('meta field filtering', () => {
    it('filters out internal meta keys', () => {
      const trigger = createTrigger('t1', 'mrrobot');
      lens = new AlapLens(lensTestConfig);
      clickTrigger(trigger);

      const rows = getPanel()!.querySelectorAll('.alap-lens-meta-row');
      const keys = Array.from(rows).map(
        (r) => r.querySelector('.alap-lens-meta-key')?.textContent
      );

      expect(keys).not.toContain('Source');
      expect(keys).not.toContain('Source label');
      expect(keys).not.toContain('Updated');
    });

    it('filters out underscore-prefixed keys', () => {
      const trigger = createTrigger('t1', 'mrrobot');
      lens = new AlapLens(lensTestConfig);
      clickTrigger(trigger);

      const rows = getPanel()!.querySelectorAll('.alap-lens-meta-row');
      const keys = Array.from(rows).map(
        (r) => r.querySelector('.alap-lens-meta-key')?.textContent
      );

      for (const key of keys) {
        expect(key).not.toMatch(/cache/i);
      }
    });

    it('filters out _display hint keys', () => {
      const trigger = createTrigger('t1', 'hinted');
      lens = new AlapLens(lensTestConfig);
      clickTrigger(trigger);

      const rows = getPanel()!.querySelectorAll('.alap-lens-meta-row');
      const keys = Array.from(rows).map(
        (r) => r.querySelector('.alap-lens-meta-key')?.textContent
      );

      expect(keys).not.toContain('Bio display');
      expect(keys).not.toContain('Count display');
    });

    it('skips null and empty meta values', () => {
      const trigger = createTrigger('t1', 'nullmeta');
      lens = new AlapLens(lensTestConfig);
      clickTrigger(trigger);

      const rows = getPanel()!.querySelectorAll('.alap-lens-meta-row');
      const keys = Array.from(rows).map(
        (r) => r.querySelector('.alap-lens-meta-key')?.textContent
      );

      expect(keys).toContain('Present');
      expect(keys).not.toContain('Empty');
      expect(keys).not.toContain('Nothing');
    });

    it('does not render meta section for empty meta object', () => {
      const trigger = createTrigger('t1', 'emptymeta');
      lens = new AlapLens(lensTestConfig);
      clickTrigger(trigger);

      expect(getPanel()!.querySelector('.alap-lens-meta')).toBeNull();
    });

    it('does not render meta section when all keys are internal', () => {
      const trigger = createTrigger('t1', 'internalmeta');
      lens = new AlapLens(lensTestConfig);
      clickTrigger(trigger);

      expect(getPanel()!.querySelector('.alap-lens-meta')).toBeNull();
    });

    it('does not render separator when no meta section', () => {
      const trigger = createTrigger('t1', 'minimal');
      lens = new AlapLens(lensTestConfig);
      clickTrigger(trigger);

      expect(getPanel()!.querySelector('.alap-lens-separator')).toBeNull();
    });
  });

  // =========================================================================
  // Display hint overrides
  // =========================================================================

  describe('display hint overrides', () => {
    it('respects _display: text to force text block on short string', () => {
      const trigger = createTrigger('t1', 'hinted');
      lens = new AlapLens(lensTestConfig);
      clickTrigger(trigger);

      const textBlocks = getPanel()!.querySelectorAll('.alap-lens-meta-row-text');
      const bioBlock = Array.from(textBlocks).find((row) => {
        const key = row.querySelector('.alap-lens-meta-key');
        return key && key.textContent === 'Bio';
      });
      expect(bioBlock).not.toBeUndefined();
      expect(bioBlock!.querySelector('.alap-lens-meta-text')!.textContent).toBe(
        'Short bio forced to text block.'
      );
    });

    it('respects _display: value to force key-value row', () => {
      const trigger = createTrigger('t1', 'hinted');
      lens = new AlapLens(lensTestConfig);
      clickTrigger(trigger);

      const rows = getPanel()!.querySelectorAll('.alap-lens-meta-row');
      const countRow = findMetaRow(rows, 'Count');
      expect(countRow).not.toBeNull();
      expect(countRow!.querySelector('.alap-lens-meta-value')!.textContent).toBe('five');
    });

    it('auto-detects string array as chips', () => {
      const trigger = createTrigger('t1', 'dictword');
      lens = new AlapLens(lensTestConfig);
      clickTrigger(trigger);

      const rows = getPanel()!.querySelectorAll('.alap-lens-meta-row');
      const synonymsRow = findMetaRow(rows, 'Synonyms');
      expect(synonymsRow).not.toBeNull();

      const chips = synonymsRow!.querySelectorAll('.alap-lens-meta-chip');
      expect(chips.length).toBe(5);
      expect(chips[0].textContent).toBe('luck');
    });
  });

  // =========================================================================
  // Meta key formatting
  // =========================================================================

  describe('meta key formatting', () => {
    it('capitalizes first letter of simple keys', () => {
      const trigger = createTrigger('t1', 'mrrobot');
      lens = new AlapLens(lensTestConfig);
      clickTrigger(trigger);

      const rows = getPanel()!.querySelectorAll('.alap-lens-meta-row');
      expect(findMetaRow(rows, 'Rating')).not.toBeNull();
    });

    it('splits camelCase keys', () => {
      const trigger = createTrigger('t1', 'dictword');
      lens = new AlapLens(lensTestConfig);
      clickTrigger(trigger);

      const rows = getPanel()!.querySelectorAll('.alap-lens-meta-row');
      expect(findMetaRow(rows, 'Part Of Speech')).not.toBeNull();
    });

    it('applies custom metaLabels over auto-formatting', () => {
      const trigger = createTrigger('t1', 'fruitdata');
      lens = new AlapLens(lensTestConfig, {
        metaLabels: { sugar: 'Sugar (g)' },
      });
      clickTrigger(trigger);

      const rows = getPanel()!.querySelectorAll('.alap-lens-meta-row');
      expect(findMetaRow(rows, 'Sugar (g)')).not.toBeNull();
    });
  });

  // =========================================================================
  // Actions zone
  // =========================================================================

  describe('actions zone', () => {
    it('renders visit button with correct URL and attributes', () => {
      const trigger = createTrigger('t1', 'mrrobot');
      lens = new AlapLens(lensTestConfig);
      clickTrigger(trigger);

      const visit = getPanel()!.querySelector('.alap-lens-visit') as HTMLAnchorElement;
      expect(visit).not.toBeNull();
      expect(visit.href).toBe('https://example.com/mrrobot');
      expect(visit.target).toBe('_blank');
      expect(visit.rel).toBe('noopener noreferrer');
      expect(visit.textContent).toContain('Visit');
    });

    it('does not render visit button for URL-less items', () => {
      const trigger = createTrigger('t1', 'fruitdata');
      lens = new AlapLens(lensTestConfig);
      clickTrigger(trigger);

      expect(getPanel()!.querySelector('.alap-lens-visit')).toBeNull();
    });

    it('renders close button when panelCloseButton is true', () => {
      const trigger = createTrigger('t1', 'fruitdata');
      lens = new AlapLens(lensTestConfig, { panelCloseButton: true });
      clickTrigger(trigger);

      const closeBtn = getPanel()!.querySelector('.alap-lens-close-btn');
      expect(closeBtn).not.toBeNull();
      expect(closeBtn!.textContent).toBe('Close');
    });

    it('omits close button by default', () => {
      const trigger = createTrigger('t1', 'fruitdata');
      lens = new AlapLens(lensTestConfig);
      clickTrigger(trigger);

      expect(getPanel()!.querySelector('.alap-lens-close-btn')).toBeNull();
    });

    it('respects targetWindow on visit link', () => {
      const trigger = createTrigger('t1', 'apple');
      lens = new AlapLens(lensTestConfig);
      clickTrigger(trigger);

      const visit = getPanel()!.querySelector('.alap-lens-visit') as HTMLAnchorElement;
      expect(visit.target).toBe('_self');
    });
  });

  // =========================================================================
  // Custom options
  // =========================================================================

  describe('custom options', () => {
    it('applies custom visitLabel', () => {
      const trigger = createTrigger('t1', 'mrrobot');
      lens = new AlapLens(lensTestConfig, { visitLabel: 'Read more' });
      clickTrigger(trigger);

      const visit = getPanel()!.querySelector('.alap-lens-visit');
      expect(visit!.textContent).toBe('Read more');
    });

    it('applies custom closeLabel', () => {
      const trigger = createTrigger('t1', 'mrrobot');
      lens = new AlapLens(lensTestConfig, { closeLabel: 'Done', panelCloseButton: true });
      clickTrigger(trigger);

      const closeBtn = getPanel()!.querySelector('.alap-lens-close-btn');
      expect(closeBtn!.textContent).toBe('Done');
    });

    it('applies custom metaLabels', () => {
      const trigger = createTrigger('t1', 'mrrobot');
      lens = new AlapLens(lensTestConfig, {
        metaLabels: { rating: 'IMDb Rating', network: 'TV Network' },
      });
      clickTrigger(trigger);

      const rows = getPanel()!.querySelectorAll('.alap-lens-meta-row');
      expect(findMetaRow(rows, 'IMDb Rating')).not.toBeNull();
      expect(findMetaRow(rows, 'TV Network')).not.toBeNull();
    });

    it('hides copy button when copyable is false', () => {
      const trigger = createTrigger('t1', 'mrrobot');
      lens = new AlapLens(lensTestConfig, { copyable: false });
      clickTrigger(trigger);

      expect(getPanel()!.querySelector('.alap-lens-copy')).toBeNull();
    });

    it('shows copy button by default', () => {
      const trigger = createTrigger('t1', 'mrrobot');
      lens = new AlapLens(lensTestConfig);
      clickTrigger(trigger);

      const copyBtn = getPanel()!.querySelector('.alap-lens-copy');
      expect(copyBtn).not.toBeNull();
      expect(copyBtn!.getAttribute('aria-label')).toBe('Copy to clipboard');
    });
  });

  // =========================================================================
  // Navigation (multiple items)
  // =========================================================================

  describe('navigation', () => {
    const navOpts = { transition: 'none' as const };

    it('shows nav controls when multiple items resolved', () => {
      const trigger = createTrigger('t1', '@shows');
      lens = new AlapLens(lensTestConfig, navOpts);
      clickTrigger(trigger);

      const nav = getPanel()!.querySelector('.alap-lens-nav');
      expect(nav).not.toBeNull();

      const counter = nav!.querySelector('.alap-lens-counter');
      expect(counter!.textContent).toBe('1 / 2');
    });

    it('hides nav controls for single item', () => {
      const trigger = createTrigger('t1', 'mrrobot');
      lens = new AlapLens(lensTestConfig, navOpts);
      clickTrigger(trigger);

      expect(getPanel()!.querySelector('.alap-lens-nav')).toBeNull();
    });

    it('navigates forward with next button', () => {
      const trigger = createTrigger('t1', '@shows');
      lens = new AlapLens(lensTestConfig, navOpts);
      clickTrigger(trigger);

      const label1 = getPanel()!.querySelector('.alap-lens-label')!.textContent;

      const nextBtn = document.querySelector('.alap-lens-nav-next') as HTMLButtonElement;
      nextBtn.click();

      const label2 = getPanel()!.querySelector('.alap-lens-label')!.textContent;
      const counter = document.querySelector('.alap-lens-counter')!.textContent;

      expect(label1).not.toBe(label2);
      expect(counter).toBe('2 / 2');
    });

    it('navigates backward with prev button', () => {
      const trigger = createTrigger('t1', '@shows');
      lens = new AlapLens(lensTestConfig, navOpts);
      clickTrigger(trigger);

      const nextBtn = document.querySelector('.alap-lens-nav-next') as HTMLButtonElement;
      nextBtn.click();
      expect(document.querySelector('.alap-lens-counter')!.textContent).toBe('2 / 2');

      const prevBtn = document.querySelector('.alap-lens-nav-prev') as HTMLButtonElement;
      prevBtn.click();
      expect(document.querySelector('.alap-lens-counter')!.textContent).toBe('1 / 2');
    });

    it('wraps forward from last to first', () => {
      const trigger = createTrigger('t1', '@shows');
      lens = new AlapLens(lensTestConfig, navOpts);
      clickTrigger(trigger);

      const nextBtn = document.querySelector('.alap-lens-nav-next') as HTMLButtonElement;
      nextBtn.click();
      expect(document.querySelector('.alap-lens-counter')!.textContent).toBe('2 / 2');

      nextBtn.click();
      expect(document.querySelector('.alap-lens-counter')!.textContent).toBe('1 / 2');
    });

    it('wraps backward from first to last', () => {
      const trigger = createTrigger('t1', '@shows');
      lens = new AlapLens(lensTestConfig, navOpts);
      clickTrigger(trigger);

      const prevBtn = document.querySelector('.alap-lens-nav-prev') as HTMLButtonElement;
      prevBtn.click();
      expect(document.querySelector('.alap-lens-counter')!.textContent).toBe('2 / 2');
    });

    it('navigates with ArrowRight key', () => {
      const trigger = createTrigger('t1', '@shows');
      lens = new AlapLens(lensTestConfig, navOpts);
      clickTrigger(trigger);

      const label1 = getPanel()!.querySelector('.alap-lens-label')!.textContent;
      pressKey('ArrowRight');
      const label2 = getPanel()!.querySelector('.alap-lens-label')!.textContent;

      expect(label1).not.toBe(label2);
    });

    it('navigates with ArrowLeft key', () => {
      const trigger = createTrigger('t1', '@shows');
      lens = new AlapLens(lensTestConfig, navOpts);
      clickTrigger(trigger);

      pressKey('ArrowLeft');
      expect(document.querySelector('.alap-lens-counter')!.textContent).toBe('2 / 2');
    });

    it('ignores arrow keys for single item', () => {
      const trigger = createTrigger('t1', 'mrrobot');
      lens = new AlapLens(lensTestConfig, navOpts);
      clickTrigger(trigger);

      pressKey('ArrowRight');
      pressKey('ArrowLeft');

      expect(getPanel()!.querySelector('.alap-lens-label')!.textContent).toBe('Mr. Robot');
    });
  });

  // =========================================================================
  // Copy to clipboard
  // =========================================================================

  describe('copy to clipboard', () => {
    it('copies structured text on button click', async () => {
      let capturedText = '';
      const writeText = vi.fn((text: string) => {
        capturedText = text;
        return Promise.resolve();
      });
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText },
        writable: true,
        configurable: true,
      });

      const trigger = createTrigger('t1', 'breakingbad');
      lens = new AlapLens(lensTestConfig);
      clickTrigger(trigger);

      const copyBtn = getPanel()!.querySelector('.alap-lens-copy') as HTMLButtonElement;
      copyBtn.click();

      await vi.waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalled();
      });

      expect(capturedText).toContain('Breaking Bad');
      expect(capturedText).toContain('https://example.com/breakingbad');
      expect(capturedText).toContain('chemistry teacher');
      expect(capturedText).toContain('Rating: 9.5');
      expect(capturedText).toContain('Status: Ended');
    });

    it('includes tags in clipboard text', async () => {
      let capturedText = '';
      const writeText = vi.fn((text: string) => {
        capturedText = text;
        return Promise.resolve();
      });
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText },
        writable: true,
        configurable: true,
      });

      const trigger = createTrigger('t1', 'mrrobot');
      lens = new AlapLens(lensTestConfig);
      clickTrigger(trigger);

      const copyBtn = getPanel()!.querySelector('.alap-lens-copy') as HTMLButtonElement;
      copyBtn.click();

      await vi.waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalled();
      });

      expect(capturedText).toContain('drama');
      expect(capturedText).toContain('thriller');
      expect(capturedText).toContain('scifi');
    });

    it('shows "Copied" feedback after click', async () => {
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: vi.fn(() => Promise.resolve()) },
        writable: true,
        configurable: true,
      });

      const trigger = createTrigger('t1', 'mrrobot');
      lens = new AlapLens(lensTestConfig);
      clickTrigger(trigger);

      const copyBtn = getPanel()!.querySelector('.alap-lens-copy') as HTMLButtonElement;
      copyBtn.click();

      await vi.waitFor(() => {
        expect(copyBtn.textContent).toBe('Copied');
        expect(copyBtn.classList.contains('alap-lens-copy-done')).toBe(true);
      });
    });

    it('excludes internal meta keys from clipboard text', async () => {
      let capturedText = '';
      const writeText = vi.fn((text: string) => {
        capturedText = text;
        return Promise.resolve();
      });
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText },
        writable: true,
        configurable: true,
      });

      const trigger = createTrigger('t1', 'mrrobot');
      lens = new AlapLens(lensTestConfig);
      clickTrigger(trigger);

      const copyBtn = getPanel()!.querySelector('.alap-lens-copy') as HTMLButtonElement;
      copyBtn.click();

      await vi.waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalled();
      });

      expect(capturedText).not.toContain('Source:');
      expect(capturedText).not.toContain('Source label:');
      expect(capturedText).not.toContain('_cacheKey');
    });
  });

  // =========================================================================
  // Macro and expression resolution
  // =========================================================================

  describe('expression resolution', () => {
    it('resolves macro expressions', () => {
      const trigger = createTrigger('t1', '@fruits');
      lens = new AlapLens(lensTestConfig);
      clickTrigger(trigger);

      expect(getOverlay()).not.toBeNull();
      const label = getPanel()!.querySelector('.alap-lens-label')!.textContent;
      expect(label).toBe('Apple Inc.');
    });

    it('resolves tag expressions', () => {
      const trigger = createTrigger('t1', '.drama');
      lens = new AlapLens(lensTestConfig);
      clickTrigger(trigger);

      expect(getOverlay()).not.toBeNull();
      // mrrobot and breakingbad both have drama tag
      expect(getPanel()!.querySelector('.alap-lens-nav')).not.toBeNull();
    });

    it('resolves direct item IDs', () => {
      const trigger = createTrigger('t1', 'minimal');
      lens = new AlapLens(lensTestConfig);
      clickTrigger(trigger);

      expect(getPanel()!.querySelector('.alap-lens-label')!.textContent).toBe('Minimal Link');
    });
  });

  // =========================================================================
  // destroy
  // =========================================================================

  describe('destroy', () => {
    it('removes overlay on destroy', () => {
      const trigger = createTrigger('t1', 'mrrobot');
      lens = new AlapLens(lensTestConfig);
      clickTrigger(trigger);

      expect(getOverlay()).not.toBeNull();
      lens.destroy();
      expect(getOverlay()).toBeNull();
    });

    it('removes role attribute from triggers', () => {
      const trigger = createTrigger('t1', 'mrrobot');
      lens = new AlapLens(lensTestConfig);

      expect(trigger.getAttribute('role')).toBe('button');
      lens.destroy();
      expect(trigger.getAttribute('role')).toBeNull();
    });

    it('is safe to call destroy multiple times', () => {
      lens = new AlapLens(lensTestConfig);
      expect(() => {
        lens.destroy();
        lens.destroy();
      }).not.toThrow();
    });
  });

  // =========================================================================
  // Transitions
  // =========================================================================

  describe('transitions', () => {
    describe('fade mode', () => {
      it('adds fading class to panel on navigate', () => {
        const trigger = createTrigger('t1', '@shows');
        lens = new AlapLens(lensTestConfig, { transition: 'fade' });
        clickTrigger(trigger);

        const nextBtn = document.querySelector('.alap-lens-nav-next') as HTMLButtonElement;
        nextBtn.click();

        // Panel should have the fading class immediately
        const panel = getPanel()!;
        expect(panel.classList.contains('alap-lens-panel-fading')).toBe(true);
      });

      it('swaps content after fade duration', async () => {
        vi.useFakeTimers();

        const trigger = createTrigger('t1', '@shows');
        lens = new AlapLens(lensTestConfig, { transition: 'fade' });
        clickTrigger(trigger);

        const label1 = getPanel()!.querySelector('.alap-lens-label')!.textContent;

        pressKey('ArrowRight');

        // Content not yet swapped
        expect(getPanel()!.querySelector('.alap-lens-label')!.textContent).toBe(label1);

        // Advance past the fade-out duration (fallback 250ms in happy-dom)
        vi.advanceTimersByTime(300);

        const label2 = getPanel()!.querySelector('.alap-lens-label')!.textContent;
        expect(label2).not.toBe(label1);

        vi.useRealTimers();
      });

      it('queues navigation during fade and drains on completion', () => {
        vi.useFakeTimers();

        const trigger = createTrigger('t1', '@shows');
        lens = new AlapLens(lensTestConfig, { transition: 'fade' });
        clickTrigger(trigger);

        // First navigate starts a fade (index 0→1)
        pressKey('ArrowRight');

        // Second navigate queues delta +1 while first is in flight
        pressKey('ArrowRight');

        // After first fade lands at 1, queued delta +1 advances to 0 (wraps in 2-item set)
        vi.advanceTimersByTime(1000);

        expect(document.querySelector('.alap-lens-counter')!.textContent).toBe('1 / 2');

        vi.useRealTimers();
      });

      it('is the default transition mode', () => {
        const trigger = createTrigger('t1', '@shows');
        lens = new AlapLens(lensTestConfig);
        clickTrigger(trigger);

        const nextBtn = document.querySelector('.alap-lens-nav-next') as HTMLButtonElement;
        nextBtn.click();

        // Should behave like fade — panel gets fading class
        const panel = getPanel()!;
        expect(panel.classList.contains('alap-lens-panel-fading')).toBe(true);
      });
    });

    describe('resize mode', () => {
      it('locks panel height on navigate', () => {
        const trigger = createTrigger('t1', '@shows');
        lens = new AlapLens(lensTestConfig, { transition: 'resize' });
        clickTrigger(trigger);

        const panel = getPanel()!;
        // No inline height before navigation
        expect(panel.style.height).toBe('');

        const nextBtn = document.querySelector('.alap-lens-nav-next') as HTMLButtonElement;
        nextBtn.click();

        // After navigate, the new panel should have an explicit height
        const newPanel = getPanel()!;
        expect(newPanel.style.height).not.toBe('');
        expect(newPanel.style.overflow).toBe('hidden');
      });

      it('does not add fading class', () => {
        const trigger = createTrigger('t1', '@shows');
        lens = new AlapLens(lensTestConfig, { transition: 'resize' });
        clickTrigger(trigger);

        pressKey('ArrowRight');

        const panel = getPanel()!;
        expect(panel.classList.contains('alap-lens-panel-fading')).toBe(false);
      });
    });

    describe('none mode', () => {
      it('swaps content synchronously', () => {
        const trigger = createTrigger('t1', '@shows');
        lens = new AlapLens(lensTestConfig, { transition: 'none' });
        clickTrigger(trigger);

        const label1 = getPanel()!.querySelector('.alap-lens-label')!.textContent;
        pressKey('ArrowRight');
        const label2 = getPanel()!.querySelector('.alap-lens-label')!.textContent;

        expect(label1).not.toBe(label2);
      });

      it('does not add fading class', () => {
        const trigger = createTrigger('t1', '@shows');
        lens = new AlapLens(lensTestConfig, { transition: 'none' });
        clickTrigger(trigger);

        pressKey('ArrowRight');

        const panel = getPanel()!;
        expect(panel.classList.contains('alap-lens-panel-fading')).toBe(false);
      });

      it('does not set inline height', () => {
        const trigger = createTrigger('t1', '@shows');
        lens = new AlapLens(lensTestConfig, { transition: 'none' });
        clickTrigger(trigger);

        pressKey('ArrowRight');

        const panel = getPanel()!;
        expect(panel.style.height).toBe('');
      });
    });
  });

  // ===========================================================================
  // Placement
  // ===========================================================================

  describe('placement', () => {
    it('reads data-alap-placement from the trigger', () => {
      const trigger = createTrigger('t1', 'mrrobot');
      trigger.setAttribute('data-alap-placement', 'NW');
      lens = new AlapLens(lensTestConfig);
      clickTrigger(trigger);

      const overlay = getOverlay()!;
      expect(overlay.style.alignItems).toBe('flex-start');
      expect(overlay.style.justifyContent).toBe('flex-start');
    });

    it('parses strategy suffix and applies compass only', () => {
      const trigger = createTrigger('t1', 'mrrobot');
      trigger.setAttribute('data-alap-placement', 'SE, clamp');
      lens = new AlapLens(lensTestConfig);
      clickTrigger(trigger);

      const overlay = getOverlay()!;
      expect(overlay.style.alignItems).toBe('flex-end');
      expect(overlay.style.justifyContent).toBe('flex-end');
    });

    it('trigger attribute wins over constructor option', () => {
      const trigger = createTrigger('t1', 'mrrobot');
      trigger.setAttribute('data-alap-placement', 'N');
      lens = new AlapLens(lensTestConfig, { placement: 'SE' });
      clickTrigger(trigger);

      const overlay = getOverlay()!;
      expect(overlay.style.alignItems).toBe('flex-start');
      expect(overlay.style.justifyContent).toBe('center');
    });

    it('falls back to config.settings.placement when no trigger attr', () => {
      const trigger = createTrigger('t1', 'mrrobot');
      const config = { ...lensTestConfig, settings: { ...lensTestConfig.settings, placement: 'S' } };
      lens = new AlapLens(config);
      clickTrigger(trigger);

      const overlay = getOverlay()!;
      expect(overlay.style.alignItems).toBe('flex-end');
      expect(overlay.style.justifyContent).toBe('center');
    });

    it('falls back to centered default when nothing is configured', () => {
      const trigger = createTrigger('t1', 'mrrobot');
      lens = new AlapLens(lensTestConfig);
      clickTrigger(trigger);

      const overlay = getOverlay()!;
      expect(overlay.style.alignItems).toBe('');
      expect(overlay.style.justifyContent).toBe('');
    });
  });
});
