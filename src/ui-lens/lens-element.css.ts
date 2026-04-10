/**
 * Copyright 2026 Daniel Smith
 * SPDX-License-Identifier: Apache-2.0
 *
 * Shadow DOM styles for <alap-lens>.
 * Extracted from AlapLensElement.ts for maintainability.
 * All visual values are tokenized via CSS custom properties (--alap-lens-*).
 */

export const STYLES = `
  :host {
    display: inline;
  }

  /* --- Overlay --- */

  .overlay {
    position: fixed;
    inset: 0;
    z-index: var(--alap-lens-z-index, 10000);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--alap-lens-overlay-padding, 2rem);
    background: var(--alap-lens-overlay-bg, rgba(0, 0, 0, 0.85));
    backdrop-filter: blur(var(--alap-lens-overlay-blur, 4px));
    opacity: 0;
    transition: opacity var(--alap-lens-fade, 0.5s) ease;
    overflow-y: auto;
  }

  .overlay.visible {
    opacity: 1;
  }

  /* --- Close X --- */

  .close-x {
    position: absolute;
    top: 1rem;
    right: 1.5rem;
    background: none;
    border: none;
    color: var(--alap-lens-close-x-color, #fff);
    font-size: var(--alap-lens-close-x-size, 2rem);
    cursor: pointer;
    line-height: 1;
    opacity: var(--alap-lens-close-x-opacity, 0.7);
    transition: opacity var(--alap-lens-transition, 0.15s);
  }

  .close-x:hover {
    opacity: 1;
  }

  /* --- Panel --- */

  .panel {
    position: relative;
    background: var(--alap-lens-bg, #1a1a2e);
    border-radius: var(--alap-lens-radius, 12px);
    max-width: var(--alap-lens-max-width, 520px);
    width: 90vw;
    max-height: 85vh;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    box-shadow: var(--alap-lens-shadow, 0 24px 80px rgba(0, 0, 0, 0.5));
    padding: var(--alap-lens-padding, 1.5rem);
    transition: height var(--alap-lens-resize-transition, 0.35s) ease-in-out;
  }

  /* Fade transition — content fades out/in, panel stays put */

  .panel-fading .image-wrap,
  .panel-fading .label,
  .panel-fading .tags,
  .panel-fading .description,
  .panel-fading .separator,
  .panel-fading .meta,
  .panel-fading .actions,
  .panel-fading .nav,
  .panel-fading .counter {
    opacity: 0;
  }

  .image-wrap,
  .label,
  .tags,
  .description,
  .separator,
  .meta,
  .actions,
  .nav,
  .counter {
    transition: opacity var(--alap-lens-transition, 0.15s) ease;
  }

  /* --- Top zone --- */

  .image-wrap {
    width: 100%;
    max-height: var(--alap-lens-image-max-height, 280px);
    overflow: hidden;
    border-radius: var(--alap-lens-image-radius, 8px);
    margin-bottom: 1rem;
    background: #111;
  }

  .image-wrap-empty {
    height: 0;
    margin-bottom: 0;
    background: transparent;
  }

  .image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .title-row {
    display: flex;
    align-items: baseline;
    gap: 0.75rem;
    margin: 0 0 0.5rem;
  }

  .title-row .label {
    margin: 0;
  }

  .credit {
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.4);
    flex-shrink: 0;
    margin-left: auto;
  }

  .credit a {
    color: rgba(255, 255, 255, 0.5);
    text-decoration: none;
  }

  .credit a:hover {
    color: #fff;
    text-decoration: underline;
  }

  .label {
    margin: 0 0 0.5rem;
    font-size: var(--alap-lens-label-size, 1.4rem);
    font-weight: var(--alap-lens-label-weight, 600);
    color: var(--alap-lens-label-color, #fff);
    line-height: 1.3;
  }

  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--alap-lens-tag-gap, 0.35rem);
    margin-bottom: 0.75rem;
  }

  .tag {
    display: inline-block;
    padding: var(--alap-lens-tag-padding, 0.15rem 0.6rem);
    background: var(--alap-lens-tag-bg, rgba(255, 255, 255, 0.1));
    color: var(--alap-lens-tag-color, #aac4f0);
    border-radius: var(--alap-lens-tag-radius, 12px);
    font-size: var(--alap-lens-tag-size, 0.8rem);
    cursor: pointer;
    transition: background 0.5s ease, color 0.5s ease;
  }

  .tag:hover {
    background: rgba(255, 255, 255, 0.25);
    color: #fff;
  }

  .tag.active {
    background: rgba(58, 134, 255, 0.3);
    color: #88bbff;
  }

  .description {
    margin: 0 0 0.75rem;
    color: var(--alap-lens-desc-color, #aaa);
    font-size: var(--alap-lens-desc-size, 0.95rem);
    line-height: var(--alap-lens-desc-line-height, 1.5);
  }

  /* --- Meta zone --- */

  .separator {
    border: none;
    border-top: 1px solid var(--alap-lens-separator-color, rgba(255, 255, 255, 0.1));
    margin: 0.5rem 0 0.75rem;
  }

  .meta {
    margin: 0;
  }

  .meta-row {
    display: flex;
    gap: var(--alap-lens-meta-row-gap, 1rem);
    padding: var(--alap-lens-meta-row-padding, 0.3rem 0);
    align-items: baseline;
  }

  .meta-row-text,
  .meta-row-links {
    flex-direction: column;
    gap: 0.25rem;
  }

  .meta-key {
    color: var(--alap-lens-meta-key-color, #7888b8);
    font-size: var(--alap-lens-meta-key-size, 0.85rem);
    min-width: var(--alap-lens-meta-key-width, 100px);
    flex-shrink: 0;
  }

  .meta-value {
    color: var(--alap-lens-meta-value-color, #d0d7e5);
    font-size: var(--alap-lens-meta-value-size, 0.9rem);
    margin: 0;
  }

  .meta-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
    margin: 0;
  }

  .meta-chip {
    display: inline-block;
    padding: 0.1rem 0.5rem;
    background: var(--alap-lens-meta-chip-bg, rgba(255, 255, 255, 0.08));
    color: var(--alap-lens-meta-chip-color, #aac4f0);
    border-radius: var(--alap-lens-meta-chip-radius, 10px);
    font-size: var(--alap-lens-tag-size, 0.8rem);
  }

  .meta-links {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    margin: 0;
  }

  .meta-link {
    color: var(--alap-lens-meta-link-color, #88bbff);
    font-size: var(--alap-lens-meta-link-size, 0.85rem);
    text-decoration: none;
    transition: color var(--alap-lens-transition, 0.15s);
  }

  .meta-link:hover {
    color: var(--alap-lens-meta-link-hover, #ffd666);
    text-decoration: underline;
  }

  .meta-more {
    color: var(--alap-lens-meta-muted-color, #5a6a9a);
    font-size: 0.8rem;
  }

  .meta-text {
    color: var(--alap-lens-meta-text-color, #b8c4e8);
    font-size: var(--alap-lens-meta-value-size, 0.9rem);
    line-height: var(--alap-lens-desc-line-height, 1.5);
    margin: 0;
  }

  /* --- Actions --- */

  .actions {
    display: flex;
    gap: 0.75rem;
    justify-content: center;
    margin-top: 1.25rem;
    flex-shrink: 0;
  }

  .visit {
    display: inline-block;
    padding: var(--alap-lens-visit-padding, 0.5rem 1.25rem);
    background: var(--alap-lens-visit-bg, #3a86ff);
    color: var(--alap-lens-visit-color, #fff);
    border-radius: var(--alap-lens-visit-radius, 6px);
    font-size: var(--alap-lens-visit-size, 0.9rem);
    font-weight: var(--alap-lens-visit-weight, 500);
    text-decoration: none;
    transition: background var(--alap-lens-transition, 0.15s);
  }

  .visit:hover {
    background: var(--alap-lens-visit-bg-hover, #2d6fdb);
  }

  .close-btn {
    padding: var(--alap-lens-visit-padding, 0.5rem 1.25rem);
    background: var(--alap-lens-close-bg, rgba(255, 255, 255, 0.1));
    color: var(--alap-lens-close-color, #b8c4e8);
    border: none;
    border-radius: var(--alap-lens-visit-radius, 6px);
    font-size: var(--alap-lens-visit-size, 0.9rem);
    cursor: pointer;
    transition: background var(--alap-lens-transition, 0.15s), color var(--alap-lens-transition, 0.15s);
  }

  .close-btn:hover {
    background: var(--alap-lens-close-bg-hover, rgba(255, 255, 255, 0.15));
    color: var(--alap-lens-close-color-hover, #fff);
  }

  /* --- Navigation --- */

  .nav {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--alap-lens-meta-row-gap, 1rem);
    margin-top: 1rem;
    flex-shrink: 0;
  }

  .nav-prev,
  .nav-next {
    background: var(--alap-lens-nav-bg, rgba(255, 255, 255, 0.1));
    border: none;
    color: var(--alap-lens-nav-color, #fff);
    font-size: var(--alap-lens-nav-icon-size, 1.5rem);
    width: var(--alap-lens-nav-btn-size, 36px);
    height: var(--alap-lens-nav-btn-size, 36px);
    border-radius: 50%;
    cursor: pointer;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0.25;
    transition: background var(--alap-lens-transition, 0.15s), opacity 0.4s ease;
  }

  .nav:hover .nav-prev,
  .nav:hover .nav-next {
    opacity: 1;
  }

  .nav-prev:hover,
  .nav-next:hover {
    background: var(--alap-lens-nav-bg-hover, rgba(255, 255, 255, 0.2));
  }

  .counter-wrap {
    position: relative;
    z-index: 2;
  }

  .counter {
    display: block;
    color: var(--alap-lens-counter-color, #666);
    font-size: var(--alap-lens-counter-size, 0.85rem);
    cursor: default;
    white-space: nowrap;
    min-width: var(--alap-lens-counter-min-width, 7em);
    text-align: center;
    transition: color var(--alap-lens-counter-transition, 500ms) ease-in-out,
                opacity 500ms ease-in-out;
  }

  .counter-wrap:hover .counter {
    color: var(--alap-lens-counter-hover-color, #aac4f0);
  }

  .counter.tag-tooltip {
    color: var(--alap-lens-tag-tooltip-color, #88bbff);
    font-size: var(--alap-lens-tag-tooltip-size, 0.85rem);
    font-weight: var(--alap-lens-tag-tooltip-weight, 500);
  }

  /* --- Set navigator popup --- */

  .setnav {
    display: none;
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    margin-bottom: 0.25rem;
    min-width: var(--alap-lens-setnav-min-width, 220px);
    max-width: var(--alap-lens-setnav-max-width, 320px);
    background: var(--alap-lens-setnav-bg, #1e1e3a);
    border: 1px solid var(--alap-lens-setnav-border, rgba(255, 255, 255, 0.1));
    border-radius: var(--alap-lens-setnav-radius, 8px);
    box-shadow: var(--alap-lens-setnav-shadow, 0 8px 32px rgba(0, 0, 0, 0.4));
    overflow: hidden;
    flex-direction: column;
    z-index: 10;
  }

  .setnav.open {
    display: flex;
  }

  .setnav:focus {
    outline: none;
  }

  .setnav-list {
    list-style: none;
    margin: 0;
    padding: var(--alap-lens-setnav-list-padding, 0.25rem 0);
    max-height: var(--alap-lens-setnav-max-height, 240px);
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: #444 transparent;
  }

  .setnav-item {
    padding: var(--alap-lens-setnav-item-padding, 0.4rem 0.75rem);
    color: var(--alap-lens-setnav-item-color, #d0d7e5);
    font-size: var(--alap-lens-setnav-item-size, 0.85rem);
    cursor: pointer;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    transition: background 0.1s, color 0.1s;
  }

  .setnav-item:hover {
    background: var(--alap-lens-setnav-item-hover-bg, rgba(255, 255, 255, 0.1));
    color: var(--alap-lens-setnav-item-hover-color, #fff);
  }

  .setnav-item.active {
    background: var(--alap-lens-setnav-item-active-bg, rgba(58, 134, 255, 0.2));
    color: var(--alap-lens-setnav-item-active-color, #88bbff);
    font-weight: var(--alap-lens-setnav-item-active-weight, 600);
  }

  .setnav-item.highlighted {
    background: var(--alap-lens-setnav-item-highlight-bg, rgba(255, 255, 255, 0.15));
    color: var(--alap-lens-setnav-item-highlight-color, #fff);
  }

  .setnav-filter-wrap {
    display: flex;
    align-items: center;
    border-top: 1px solid var(--alap-lens-setnav-border, rgba(255, 255, 255, 0.1));
    flex-shrink: 0;
  }

  .setnav-filter {
    flex: 1;
    padding: var(--alap-lens-setnav-filter-padding, 0.5rem 0.75rem);
    background: var(--alap-lens-setnav-filter-bg, rgba(255, 255, 255, 0.05));
    border: none;
    color: var(--alap-lens-setnav-filter-color, #fff);
    font-size: var(--alap-lens-setnav-filter-size, 0.8rem);
    outline: none;
  }

  .setnav-filter::placeholder {
    color: var(--alap-lens-setnav-placeholder-color, rgba(255, 255, 255, 0.3));
  }

  .setnav-clear {
    background: none;
    border: none;
    color: var(--alap-lens-setnav-clear-color, rgba(255, 255, 255, 0.4));
    font-size: 1rem;
    cursor: pointer;
    padding: 0.25rem 0.5rem;
    line-height: 1;
    transition: color 0.1s;
  }

  .setnav-clear:hover {
    color: var(--alap-lens-setnav-clear-hover-color, #fff);
  }

  /* --- Image zoom popup --- */

  .zoom-overlay {
    position: fixed;
    inset: 0;
    z-index: 10001;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.9);
    opacity: 0;
    transition: opacity 0.2s ease;
    cursor: zoom-out;
  }

  .zoom-overlay.visible {
    opacity: 1;
  }

  .zoom-image {
    max-width: 95vw;
    max-height: 95vh;
    object-fit: contain;
    box-shadow: 0 0 60px rgba(0, 0, 0, 0.8);
  }

  /* --- Copy button --- */

  .copy-btn {
    margin-left: auto;
    background: none;
    border: none;
    color: var(--alap-lens-copy-color, rgba(255, 255, 255, 0.3));
    font-size: var(--alap-lens-copy-size, 1.2rem);
    cursor: pointer;
    opacity: 0;
    transition: opacity var(--alap-lens-transition, 0.15s), color var(--alap-lens-transition, 0.15s);
  }

  .panel:hover .copy-btn {
    opacity: 1;
  }

  .copy-btn:hover {
    color: var(--alap-lens-copy-color-hover, rgba(255, 255, 255, 0.7));
  }

  .copy-btn.done {
    color: var(--alap-lens-copy-done-color, #4ade80);
    opacity: 1;
  }
`;
