/**
 * Copyright 2026 Daniel Smith
 * SPDX-License-Identifier: Apache-2.0
 *
 * Shared set navigator: the counter ("2 / 5") that expands into a
 * filterable popup list for jumping to any item in the set.
 *
 * Used by lightbox (DOM + WC) and lens (DOM + WC).
 */

// --- Types ---

export interface SetNavItem {
  label?: string;
  id: string;
}

export interface SetNavCss {
  setnav: string;
  list: string;
  item: string;
  filterWrap: string;
  filter: string;
  clear: string;
}

export interface SetNavOptions {
  /** The counter-wrap element (popup attaches here). */
  counterWrap: HTMLElement;
  /** The counter text span (inside counterWrap). */
  counterText: HTMLElement;
  /** Items to list. */
  links: ReadonlyArray<SetNavItem>;
  /** Current active index. */
  currentIndex: number;
  /** Called when the user selects an item by index. */
  onJump: (index: number) => void;
  /** CSS class names for generated elements. */
  css: SetNavCss;
  /** Close icon character. */
  closeIcon: string;
  /** Part attributes for WC (optional). key = element role, value = part name. */
  parts?: Record<string, string>;
  /**
   * Hover hint style:
   * - 'swap': replace counter text with "menu…" instantly (lightbox)
   * - 'crossfade': fade opacity to 0, swap to "Menu", fade back (lens)
   * Default: 'swap'
   */
  hoverHint?: 'swap' | 'crossfade';
  /** For shadow DOM: return the shadow root's activeElement. */
  getActiveElement?: () => Element | null;
}

export interface SetNavHandle {
  /** Update the active item highlight (e.g. after navigation). */
  setActive(index: number): void;
  /** Update the counter label text. */
  updateCounter(index: number, total: number): void;
}

// --- Constants ---

const DISMISS_DELAY = 300;
const HOVER_FADE_MS = 250;

// --- Implementation ---

/**
 * Build and wire a set navigator popup inside the given counterWrap.
 * Returns a handle for updating state after navigation.
 */
export function createSetNavigator(options: SetNavOptions): SetNavHandle {
  const {
    counterWrap, counterText, links, onJump,
    css, closeIcon, parts,
    hoverHint = 'swap',
    getActiveElement,
  } = options;

  let { currentIndex } = options;

  // --- Build popup DOM ---

  const setNav = document.createElement('div');
  setNav.className = css.setnav;
  setNav.setAttribute('tabindex', '-1');
  if (parts?.setnav) setNav.setAttribute('part', parts.setnav);

  const setList = document.createElement('ul');
  setList.className = css.list;
  setList.setAttribute('role', 'listbox');

  for (let i = 0; i < links.length; i++) {
    const item = links[i];
    const li = document.createElement('li');
    li.className = css.item;
    li.setAttribute('role', 'option');
    li.setAttribute('data-index', String(i));
    li.textContent = item.label ?? item.id;
    if (i === currentIndex) li.classList.add('active');
    li.addEventListener('click', (e) => {
      e.stopPropagation();
      onJump(i);
    });
    setList.appendChild(li);
  }

  setNav.appendChild(setList);

  // Filter input
  const filterWrap = document.createElement('div');
  filterWrap.className = css.filterWrap;

  const filterInput = document.createElement('input');
  filterInput.className = css.filter;
  filterInput.type = 'text';
  filterInput.placeholder = 'Filter\u2026';
  filterInput.setAttribute('aria-label', 'Filter items');
  if (parts?.filter) filterInput.setAttribute('part', parts.filter);
  filterWrap.appendChild(filterInput);

  const clearBtn = document.createElement('button');
  clearBtn.className = css.clear;
  clearBtn.setAttribute('aria-label', 'Clear filter');
  clearBtn.textContent = closeIcon;
  clearBtn.style.display = 'none';
  clearBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    filterInput.value = '';
    filterInput.dispatchEvent(new Event('input'));
    filterInput.focus();
  });
  filterWrap.appendChild(clearBtn);

  setNav.appendChild(filterWrap);
  counterWrap.appendChild(setNav);

  // --- Counter label ---

  const counterLabel = () => `${currentIndex + 1} / ${links.length}`;
  counterText.textContent = counterLabel();

  // --- Hide / show ---

  const hideNav = () => {
    setNav.classList.remove('open');
    counterText.textContent = counterLabel();
    filterInput.value = '';
    filterInput.dispatchEvent(new Event('input'));
  };

  // --- Keyboard navigation (shared by setnav and filter) ---

  let highlightIdx = -1;

  const getVisibleItems = (): HTMLElement[] =>
    Array.from(setList.querySelectorAll<HTMLElement>(`.${css.item}`))
      .filter((el) => el.style.display !== 'none');

  const updateHighlight = (visible: HTMLElement[]) => {
    for (const item of setList.querySelectorAll<HTMLElement>(`.${css.item}`)) {
      item.classList.remove('highlighted');
    }
    if (highlightIdx >= 0 && highlightIdx < visible.length) {
      visible[highlightIdx].classList.add('highlighted');
      visible[highlightIdx].scrollIntoView({ block: 'nearest' });
    }
  };

  const handleNavKeys = (e: KeyboardEvent): boolean => {
    const visible = getVisibleItems();
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      highlightIdx = Math.min(highlightIdx + 1, visible.length - 1);
      updateHighlight(visible);
      return true;
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      highlightIdx = Math.max(highlightIdx - 1, 0);
      updateHighlight(visible);
      return true;
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = highlightIdx >= 0 ? highlightIdx : (visible.length === 1 ? 0 : -1);
      if (target >= 0 && target < visible.length) {
        const idx = Number(visible[target].getAttribute('data-index'));
        onJump(idx);
      }
      return true;
    }
    return false;
  };

  // --- Setnav keydown ---

  setNav.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      hideNav();
      return;
    }
    const active = getActiveElement ? getActiveElement() : document.activeElement;
    if (active === filterInput) return;
    if (handleNavKeys(e)) return;
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      filterInput.focus();
    }
  });

  // --- Hover hints ---

  counterText.style.cursor = 'pointer';

  if (hoverHint === 'crossfade') {
    const crossfadeCounter = (text: string) => {
      counterText.style.opacity = '0';
      setTimeout(() => {
        counterText.textContent = text;
        counterText.style.opacity = '1';
      }, HOVER_FADE_MS);
    };

    counterWrap.addEventListener('mouseenter', () => {
      if (!setNav.classList.contains('open')) {
        crossfadeCounter('Menu');
      }
    });
    counterWrap.addEventListener('mouseleave', () => {
      if (!setNav.classList.contains('open')) {
        crossfadeCounter(counterLabel());
      }
    });
  } else {
    counterWrap.addEventListener('mouseenter', () => {
      if (!setNav.classList.contains('open')) {
        counterText.textContent = 'menu\u2026';
      }
    });
    counterWrap.addEventListener('mouseleave', () => {
      if (!setNav.classList.contains('open')) {
        counterText.textContent = counterLabel();
      }
    });
  }

  // --- Click-to-open counter ---

  counterText.addEventListener('click', (e) => {
    e.stopPropagation();
    if (setNav.classList.contains('open')) {
      hideNav();
    } else {
      setNav.classList.add('open');
      setNav.focus();
    }
  });

  // --- Dismiss delay on mouseleave ---

  let dismissTimer: ReturnType<typeof setTimeout> | null = null;

  setNav.addEventListener('mouseleave', () => {
    if (dismissTimer) clearTimeout(dismissTimer);
    dismissTimer = setTimeout(hideNav, DISMISS_DELAY);
  });
  setNav.addEventListener('mouseenter', () => {
    if (dismissTimer) { clearTimeout(dismissTimer); dismissTimer = null; }
  });

  // --- Filter input ---

  filterInput.addEventListener('input', () => {
    const raw = filterInput.value.trim();
    clearBtn.style.display = raw ? '' : 'none';

    const items = setList.querySelectorAll<HTMLElement>(`.${css.item}`);
    if (!raw) {
      for (const item of items) item.style.display = '';
      return;
    }

    let re: RegExp;
    try {
      re = new RegExp(raw, 'i');
    } catch {
      re = new RegExp(raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    }

    for (const item of items) {
      const idx = Number(item.getAttribute('data-index'));
      const link = links[idx];
      const searchable = link.label ?? link.id;
      item.style.display = re.test(searchable) ? '' : 'none';
    }
  });

  // Reset highlight when filter changes
  filterInput.addEventListener('input', () => {
    highlightIdx = -1;
  });

  filterInput.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (handleNavKeys(e)) return;
    if (e.key === 'Escape') hideNav();
  });

  // --- Handle ---

  return {
    setActive(index: number) {
      currentIndex = index;
      const items = setList.querySelectorAll<HTMLElement>(`.${css.item}`);
      for (const item of items) {
        const idx = Number(item.getAttribute('data-index'));
        item.classList.toggle('active', idx === index);
      }
    },
    updateCounter(index: number, total: number) {
      currentIndex = index;
      counterText.textContent = total > 1 ? `${index + 1} / ${total}` : '';
    },
  };
}
