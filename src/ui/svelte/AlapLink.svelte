<!--
  Copyright 2026 Daniel Smith

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
-->

<script lang="ts">
  import { onDestroy, onMount, tick } from 'svelte';
  import { getAlapContext, type AlapContextValue } from './context';
  import type { AlapLink as AlapLinkType, SourceState } from '../../core/types';
  import {
    sanitizeUrlByTier,
    sanitizeCssClassByTier,
    sanitizeTargetWindowByTier,
  } from '../../core/sanitizeByTier';

  // Template helpers — keep per-item sanitization concise in the markup.
  // (AlapLinkType is already imported above alongside SourceState.)
  function classFor(item: AlapLinkType): string {
    const safe = sanitizeCssClassByTier(item.cssClass, item);
    return safe ? `alapListElem ${safe}` : 'alapListElem';
  }
  function targetFor(item: AlapLinkType): string {
    return sanitizeTargetWindowByTier(item.targetWindow, item) ?? 'fromAlap';
  }
  import type { TriggerHoverDetail, TriggerContextDetail, ItemHoverDetail, ItemContextDetail, ProgressiveRenderContext } from '../shared';
  import { applyPlacementAfterLayout, clearPlacementClass, observeTriggerOffscreen, ProgressiveRenderer, flipFromRect, centerOverTrigger, placeholderDescriptor, installMenuDismiss, type MenuDismissHandle } from '../shared';
  import { DEFAULT_MENU_Z_INDEX, REM_PER_MENU_ITEM } from '../../constants';

  type ResolvedLink = { id: string } & AlapLinkType;

  interface Props {
    query: string;
    anchorId?: string;
    mode?: 'dom' | 'webcomponent' | 'popover';
    class?: string;
    menuClassName?: string;
    menuStyle?: Record<string, string>;
    listType?: 'ul' | 'ol';
    maxVisibleItems?: number;
    children: import('svelte').Snippet;
    onTriggerHover?: (detail: TriggerHoverDetail) => void;
    onTriggerContext?: (detail: TriggerContextDetail) => void;
    onItemHover?: (detail: ItemHoverDetail) => void;
    onItemContext?: (detail: ItemContextDetail) => void;
    /** Placement string, e.g. "SE", "SE, clamp", "N, place". When set, uses the placement engine. */
    placement?: string;
    /** Pixel gap between trigger and menu edge. Default: 4. */
    gap?: number;
    /** Minimum pixel distance from viewport edges. Default: 8. */
    padding?: number;
  }

  let {
    query,
    anchorId,
    mode = 'dom',
    class: className,
    menuClassName,
    menuStyle,
    listType,
    maxVisibleItems,
    children,
    onTriggerHover,
    onTriggerContext,
    onItemHover,
    onItemContext,
    placement,
    gap: gapProp,
    padding: paddingProp,
  }: Props = $props();

  const ctx: AlapContextValue = getAlapContext();

  let isOpen = $state(false);
  // $state.raw so each ResolvedLink keeps its raw object identity. Svelte's
  // default $state deep-proxies array elements, which would break the
  // WeakMap-keyed provenance lookup that sanitizeByTier relies on — the
  // proxied item is a different reference from the one validateConfig
  // stamped, and getProvenance(proxy) returns undefined (fail-closed
  // drops cssClass, clamps target). The items array is replaced as a
  // whole on each resolve cycle, so raw state is enough.
  let items = $state.raw<ResolvedLink[]>([]);
  let sources = $state<SourceState[]>([]);
  let isLoadingOnly = $state(false);
  let progressive: ProgressiveRenderer | null = null;
  let pendingFlipRect: DOMRect | null = null;
  let lastClickEvent: MouseEvent | null = null;

  // IDs for ARIA
  const uid = Math.random().toString(36).slice(2, 8);
  const triggerId = `alap-trigger-${uid}`;
  const menuId = `alap-menu-${uid}`;

  // Element refs
  let triggerEl: HTMLElement | undefined = $state();
  let menuEl: HTMLElement | undefined = $state();
  let wrapperEl: HTMLElement | undefined = $state();
  let itemEls: HTMLAnchorElement[] = $state([]);

  // Resolved props
  let resolvedListType = $derived(listType ?? ctx.defaultListType);
  let resolvedMaxVisibleItems = $derived(maxVisibleItems ?? ctx.defaultMaxVisibleItems);

  // Merged styles and classes
  let mergedMenuClassName = $derived(
    ['alapelem', ctx.defaultMenuClassName, menuClassName].filter(Boolean).join(' ')
  );

  const menuPositionDefaults: Record<string, string> = {
    position: 'absolute',
    top: '100%',
    left: '0',
    'z-index': '10',
  };

  let mergedMenuStyle = $derived<Record<string, string>>(
    { ...menuPositionDefaults, ...ctx.defaultMenuStyle, ...menuStyle }
  );

  let scrollStyle = $derived<string | undefined>(
    resolvedMaxVisibleItems > 0 && items.length > resolvedMaxVisibleItems
      ? `max-height: ${resolvedMaxVisibleItems * REM_PER_MENU_ITEM}rem; overflow-y: auto`
      : undefined
  );

  let openedViaKeyboard = false;

  // --- Dismiss (timer, click-outside, Escape) ---

  let dismissHandle: MenuDismissHandle | null = null;

  function startTimer() { dismissHandle?.startTimer(); }
  function stopTimer() { dismissHandle?.stopTimer(); }

  // --- Menu coordinator (close others when this one opens) ---

  const unsubscribe = ctx.menuCoordinator.subscribe(triggerId, () => {
    progressive?.stop();
    isOpen = false;
    isLoadingOnly = false;
  });

  // --- Progressive rendering ---

  onMount(() => {
    progressive = new ProgressiveRenderer({
      engine: ctx.engine,
      onRender: (renderCtx: ProgressiveRenderContext) => {
        if (renderCtx.transitioningFromLoading && menuEl) {
          pendingFlipRect = menuEl.getBoundingClientRect();
        }
        if (!renderCtx.isUpdate) {
          ctx.menuCoordinator.notifyOpen(triggerId);
        }
        items = renderCtx.state.resolved as ResolvedLink[];
        sources = renderCtx.state.sources as SourceState[];
        isLoadingOnly = renderCtx.isLoadingOnly;
        isOpen = true;
      },
      cancelFetchOnDismiss: () => ctx.config?.settings?.cancelFetchOnDismiss === true,
    });
  });

  // --- Open / close ---

  function closeMenu() {
    progressive?.stop();
    const wasOpen = isOpen;
    isLoadingOnly = false;
    isOpen = false;
    if (wasOpen) triggerEl?.focus();
  }

  function openMenu(event: MouseEvent) {
    if (!triggerEl) return;
    lastClickEvent = event;
    progressive?.start(triggerEl, query, event, anchorId);
  }

  function toggleMenu(event: MouseEvent) {
    if (isOpen) closeMenu();
    else openMenu(event);
  }

  // --- Focus first item on open ---

  $effect(() => {
    if (isOpen && !isLoadingOnly) {
      // Wait for DOM update
      requestAnimationFrame(() => {
        if (openedViaKeyboard) itemEls[0]?.focus();
        openedViaKeyboard = false;
        startTimer();
      });
    }
  });

  // --- Center-over-trigger while loading-only; FLIP on transition ---
  //
  // Loading-only uses CSS-var-driven inline styles from `centerOverTrigger`.
  // A tiny "Loading…" box would flip direction differently from the resolved
  // menu, so we skip compass placement until items arrive, then FLIP-animate.
  $effect(() => {
    // Touch reactive deps so this re-runs on state transitions.
    void items; void sources;
    const loading = isLoadingOnly;
    const open = isOpen;

    tick().then(() => {
      if (!menuEl || !triggerEl) return;

      if (open && loading && lastClickEvent) {
        centerOverTrigger(menuEl, triggerEl, lastClickEvent, DEFAULT_MENU_Z_INDEX);
        return;
      }

      if (pendingFlipRect && !loading) {
        flipFromRect(menuEl, pendingFlipRect);
        pendingFlipRect = null;
      }
    });
  });

  // --- Compass placement ---

  let placementScrollHandler: (() => void) | null = null;

  $effect(() => {
    // Re-run when items/sources change so we recompute placement as the
    // menu grows past the loading-only phase.
    void items; void sources;

    // Clean up previous
    if (placementScrollHandler) {
      window.removeEventListener('scroll', placementScrollHandler);
      placementScrollHandler = null;
    }

    if (!isOpen || isLoadingOnly || !placement || mode === 'popover') return;
    if (!triggerEl || !menuEl || !wrapperEl) return;

    const tEl = triggerEl;
    const mEl = menuEl;
    const wEl = wrapperEl;
    const p = placement;

    // Clear any inline styles set by centerOverTrigger so placement can take over.
    mEl.style.cssText = '';

    const applyNow = applyPlacementAfterLayout(tEl, mEl, wEl, {
      placement: p,
      gap: gapProp,
      padding: paddingProp,
    });

    placementScrollHandler = () => applyNow();
    window.addEventListener('scroll', placementScrollHandler, { passive: true });

    return () => {
      if (placementScrollHandler) {
        window.removeEventListener('scroll', placementScrollHandler);
        placementScrollHandler = null;
      }
      clearPlacementClass(mEl);
    };
  });

  // --- Trigger scroll-away detection ---

  $effect(() => {
    if (!isOpen || mode === 'popover') return;
    if (!triggerEl) return;

    const observer = observeTriggerOffscreen(triggerEl, closeMenu);
    return () => observer.disconnect();
  });

  // Install dismiss primitive while open; tear down on close / unmount.
  // `mode === 'popover'` short-circuits click-outside and Escape inside the
  // helper (the browser's popover API owns dismissal there).
  $effect(() => {
    if (!isOpen) {
      dismissHandle?.dispose();
      dismissHandle = null;
      return;
    }
    dismissHandle = installMenuDismiss({
      close: closeMenu,
      getTrigger: () => triggerEl ?? null,
      getMenu: () => menuEl ?? null,
      mode,
      timeoutMs: ctx.menuTimeout,
    });
    return () => {
      dismissHandle?.dispose();
      dismissHandle = null;
    };
  });

  onDestroy(() => {
    dismissHandle?.dispose();
    dismissHandle = null;
    progressive?.stop();
    progressive = null;
    unsubscribe();
  });

  // --- Trigger handlers ---

  function handleTriggerClick(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (mode === 'popover' && !isOpen) {
      openMenu(e);
    } else {
      toggleMenu(e);
    }
  }

  function handleTriggerKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openedViaKeyboard = true;
      const synth = new MouseEvent('click', { bubbles: true, cancelable: true });
      if (mode === 'popover' && !isOpen) {
        openMenu(synth);
      } else {
        toggleMenu(synth);
      }
    }
  }

  // --- Menu keyboard nav ---

  function handleMenuKeyDown(e: KeyboardEvent) {
    const els = itemEls.filter(Boolean);
    if (els.length === 0) return;

    const activeIndex = els.indexOf(document.activeElement as HTMLAnchorElement);

    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault();
        const next = activeIndex < els.length - 1 ? activeIndex + 1 : 0;
        els[next].focus();
        els[next].scrollIntoView({ block: 'nearest' });
        break;
      }
      case 'ArrowUp': {
        e.preventDefault();
        const prev = activeIndex > 0 ? activeIndex - 1 : els.length - 1;
        els[prev].focus();
        els[prev].scrollIntoView({ block: 'nearest' });
        break;
      }
      case 'Home':
        e.preventDefault();
        els[0].focus();
        els[0].scrollIntoView({ block: 'nearest' });
        break;
      case 'End':
        e.preventDefault();
        els[els.length - 1].focus();
        els[els.length - 1].scrollIntoView({ block: 'nearest' });
        break;
      case 'Escape':
        closeMenu();
        break;
      case 'Tab':
        closeMenu();
        break;
    }
  }

  // --- Event hooks ---

  function handleTriggerMouseEnter() {
    onTriggerHover?.({ query, anchorId });
  }

  function handleTriggerContextMenu(e: MouseEvent) {
    onTriggerContext?.({ query, anchorId, event: e });
  }

  function handleItemMouseEnter(item: ResolvedLink) {
    onItemHover?.({ id: item.id, link: item, query });
  }

  function handleItemContextMenu(e: MouseEvent, item: ResolvedLink) {
    onItemContext?.({ id: item.id, link: item, query, event: e });
  }

  // --- Popover toggle ---

  function handlePopoverToggle(e: Event) {
    if ((e as ToggleEvent).newState === 'closed') {
      progressive?.stop();
      isOpen = false;
      isLoadingOnly = false;
    }
  }
</script>

{#if mode === 'popover'}
  <span
    bind:this={triggerEl}
    id={triggerId}
    role="button"
    tabindex={0}
    aria-haspopup="true"
    aria-expanded={isOpen}
    aria-controls={isOpen ? menuId : undefined}
    class={className}
    popovertarget={menuId}
    onclick={handleTriggerClick}
    onkeydown={handleTriggerKeyDown}
    onmouseenter={handleTriggerMouseEnter}
    oncontextmenu={handleTriggerContextMenu}
  >
    {@render children()}
  </span>
  <!-- popover element always in DOM, browser controls visibility -->
  <div
    bind:this={menuEl}
    id={menuId}
    role="menu"
    tabindex={-1}
    aria-labelledby={triggerId}
    class={mergedMenuClassName}
    style={mergedMenuStyle ? Object.entries(mergedMenuStyle).map(([k, v]) => `${k}: ${v}`).join('; ') : undefined}
    data-alap-loading-only={isLoadingOnly ? '' : undefined}
    popover="auto"
    onkeydown={handleMenuKeyDown}
    onmouseleave={startTimer}
    onmouseenter={stopTimer}
    ontoggle={handlePopoverToggle}
  >
    {#if isOpen}
      <svelte:element this={resolvedListType} role="presentation" style={scrollStyle}>
        {#each items as item, i}
          <li
            role="none"
            class={classFor(item)}
          >
            <a
              bind:this={itemEls[i]}
              href={sanitizeUrlByTier(item.url, item)}
              target={targetFor(item)}
              rel="noopener noreferrer"
              role="menuitem"
              tabindex={-1}
              onmouseenter={() => handleItemMouseEnter(item)}
              oncontextmenu={(e) => handleItemContextMenu(e, item)}
            >
              {#if item.image}
                <img src={sanitizeUrlByTier(item.image, item)} alt={item.altText ?? `image for ${item.id}`} />
              {:else}
                {item.label ?? item.id}
              {/if}
            </a>
          </li>
        {/each}
        {#each sources as src (src.token)}
          {@const desc = placeholderDescriptor(src)}
          <!-- svelte-ignore a11y_role_supports_aria_props -->
          <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
          <li {...desc.attrs} class={desc.className}>
            <a aria-disabled="true" tabindex={-1}>{desc.label}</a>
          </li>
        {/each}
      </svelte:element>
    {/if}
  </div>

{:else}
  <!-- DOM and Web Component modes -->
  <span bind:this={wrapperEl} style="position: relative; display: inline">
  <span
    bind:this={triggerEl}
    id={triggerId}
    role="button"
    tabindex={0}
    aria-haspopup="true"
    aria-expanded={isOpen}
    aria-controls={isOpen ? menuId : undefined}
    class={className}
    onclick={handleTriggerClick}
    onkeydown={handleTriggerKeyDown}
    onmouseenter={handleTriggerMouseEnter}
    oncontextmenu={handleTriggerContextMenu}
  >
    {@render children()}
  </span>
  {#if isOpen}
    <div
      bind:this={menuEl}
      id={menuId}
      role="menu"
      tabindex={-1}
      aria-labelledby={triggerId}
      class={mergedMenuClassName}
      style={mergedMenuStyle ? Object.entries(mergedMenuStyle).map(([k, v]) => `${k}: ${v}`).join('; ') : undefined}
      data-alap-loading-only={isLoadingOnly ? '' : undefined}
      onkeydown={handleMenuKeyDown}
      onmouseleave={startTimer}
      onmouseenter={stopTimer}
    >
      <svelte:element this={resolvedListType} role="presentation" style={scrollStyle}>
        {#each items as item, i}
          <li
            role="none"
            class={classFor(item)}
          >
            <a
              bind:this={itemEls[i]}
              href={sanitizeUrlByTier(item.url, item)}
              target={targetFor(item)}
              rel="noopener noreferrer"
              role="menuitem"
              tabindex={-1}
              onmouseenter={() => handleItemMouseEnter(item)}
              oncontextmenu={(e) => handleItemContextMenu(e, item)}
            >
              {#if item.image}
                <img src={sanitizeUrlByTier(item.image, item)} alt={item.altText ?? `image for ${item.id}`} />
              {:else}
                {item.label ?? item.id}
              {/if}
            </a>
          </li>
        {/each}
        {#each sources as src (src.token)}
          {@const desc = placeholderDescriptor(src)}
          <!-- svelte-ignore a11y_role_supports_aria_props -->
          <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
          <li {...desc.attrs} class={desc.className}>
            <a aria-disabled="true" tabindex={-1}>{desc.label}</a>
          </li>
        {/each}
      </svelte:element>
    </div>
  {/if}
  </span>
{/if}
