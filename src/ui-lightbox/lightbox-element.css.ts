/**
 * Copyright 2026 Daniel Smith
 * SPDX-License-Identifier: Apache-2.0
 *
 * Shadow DOM styles for <alap-lightbox>.
 * Extracted from AlapLightboxElement.ts for maintainability.
 * All visual values are tokenized via CSS custom properties (--alap-lightbox-*).
 */

export const STYLES = `
  :host {
    display: inline;
  }

  /* --- Overlay --- */

  .overlay {
    position: fixed;
    inset: 0;
    z-index: var(--alap-lightbox-z-index, 10000);
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--alap-lightbox-overlay-bg, rgba(0, 0, 0, 0.85));
    backdrop-filter: blur(var(--alap-lightbox-overlay-blur, 4px));
    opacity: 0;
    transition: opacity var(--alap-lightbox-fade, 0.5s) ease;
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
    color: var(--alap-lightbox-close-x-color, #fff);
    font-size: var(--alap-lightbox-close-x-size, 2rem);
    cursor: pointer;
    line-height: 1;
    opacity: var(--alap-lightbox-close-x-opacity, 0.7);
    transition: opacity var(--alap-lightbox-transition, 0.25s);
  }

  .close-x:hover {
    opacity: 1;
  }

  /* --- Panel --- */

  .panel {
    background: var(--alap-lightbox-bg, #1a1a2e);
    border-radius: var(--alap-lightbox-radius, 12px);
    max-width: var(--alap-lightbox-max-width, 600px);
    width: 90vw;
    max-height: 85vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-shadow: var(--alap-lightbox-shadow, 0 24px 80px rgba(0, 0, 0, 0.5));
  }

  .panel.no-image {
    background: transparent;
    box-shadow: none;
  }

  /* --- Body --- */

  .body {
    display: flex;
    flex-direction: column;
    padding: var(--alap-lightbox-body-padding, 0.75rem 1.5rem 1.5rem);
  }

  .panel.no-image .body {
    background: var(--alap-lightbox-bg, #1a1a2e);
    border-radius: 0 0 var(--alap-lightbox-radius, 12px) var(--alap-lightbox-radius, 12px);
  }

  /* --- Image --- */

  .image-wrap {
    width: 100%;
    height: var(--alap-lightbox-image-height, 350px);
    overflow: hidden;
    position: relative;
    background: var(--alap-lightbox-image-bg, #111);
  }

  .image-wrap.hidden {
    background: transparent;
  }

  .image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    transition: opacity var(--alap-lightbox-transition, 0.25s) ease;
  }

  /* --- Content parts — direct children of panel --- */

  .label-row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 0.5rem;
  }

  .label {
    margin: 0;
    font-size: var(--alap-lightbox-label-size, 1.4rem);
    font-weight: var(--alap-lightbox-label-weight, 600);
    color: var(--alap-lightbox-label-color, #fff);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
    transition: opacity var(--alap-lightbox-transition, 0.25s) ease;
  }

  .label:hover {
    white-space: normal;
    overflow: visible;
  }

  .credit {
    font-size: var(--alap-lightbox-credit-size, 0.75rem);
    color: var(--alap-lightbox-credit-color, rgba(255, 255, 255, 0.4));
    white-space: nowrap;
    flex-shrink: 0;
    transition: opacity var(--alap-lightbox-transition, 0.25s) ease;
  }

  .credit.hidden {
    display: none;
  }

  .credit a {
    color: var(--alap-lightbox-credit-link-color, rgba(255, 255, 255, 0.5));
    text-decoration: none;
  }

  .credit a:hover {
    color: var(--alap-lightbox-credit-link-hover, #fff);
    text-decoration: underline;
  }

  .description {
    margin: var(--alap-lightbox-desc-margin, 0.5rem 0 0);
    color: var(--alap-lightbox-desc-color, #aaa);
    font-size: var(--alap-lightbox-desc-size, 0.95rem);
    line-height: var(--alap-lightbox-desc-line-height, 1.5);
    transition: opacity var(--alap-lightbox-transition, 0.25s) ease;
  }

  .description.hidden {
    display: none;
  }

  .visit {
    display: block;
    width: fit-content;
    margin: var(--alap-lightbox-visit-margin, 1rem auto 0);
    padding: var(--alap-lightbox-visit-padding, 0.5rem 1.25rem);
    background: var(--alap-lightbox-visit-bg, #3a86ff);
    color: var(--alap-lightbox-visit-color, #fff);
    text-decoration: none;
    border-radius: var(--alap-lightbox-visit-radius, 6px);
    font-size: var(--alap-lightbox-visit-size, 0.9rem);
    font-weight: var(--alap-lightbox-visit-weight, 500);
    transition: background var(--alap-lightbox-transition, 0.25s);
  }

  .visit:hover {
    background: var(--alap-lightbox-visit-bg-hover, #2d6fdb);
  }

  .close-btn {
    display: none;
    width: fit-content;
    margin: var(--alap-lightbox-close-margin, 0.5rem auto 0);
    padding: var(--alap-lightbox-visit-padding, 0.5rem 1.25rem);
    background: var(--alap-lightbox-close-bg, rgba(255, 255, 255, 0.1));
    color: var(--alap-lightbox-close-color, #b8c4e8);
    border: none;
    border-radius: var(--alap-lightbox-visit-radius, 6px);
    font-size: var(--alap-lightbox-visit-size, 0.9rem);
    cursor: pointer;
    transition: background var(--alap-lightbox-transition, 0.25s), color var(--alap-lightbox-transition, 0.25s);
  }

  .close-btn:hover {
    background: var(--alap-lightbox-close-bg-hover, rgba(255, 255, 255, 0.15));
    color: var(--alap-lightbox-close-color-hover, #fff);
  }

  .counter-wrap {
    position: relative;
    margin-top: var(--alap-lightbox-counter-margin, 1rem);
    text-align: center;
    z-index: 2;
  }

  .counter {
    display: block;
    color: var(--alap-lightbox-counter-color, #666);
    font-size: var(--alap-lightbox-counter-size, 0.85rem);
    cursor: default;
    transition: opacity var(--alap-lightbox-transition, 0.25s) ease;
  }

  .counter-wrap:hover .counter {
    color: var(--alap-lightbox-counter-hover-color, #aac4f0);
  }

  .counter.hidden {
    display: none;
  }

  /* --- Set navigator popup --- */

  .setnav {
    display: none;
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    margin-bottom: 0.25rem;
    min-width: var(--alap-lightbox-setnav-min-width, 220px);
    max-width: var(--alap-lightbox-setnav-max-width, 320px);
    background: var(--alap-lightbox-setnav-bg, #1e1e3a);
    border: 1px solid var(--alap-lightbox-setnav-border, rgba(255, 255, 255, 0.1));
    border-radius: var(--alap-lightbox-setnav-radius, 8px);
    box-shadow: var(--alap-lightbox-setnav-shadow, 0 8px 32px rgba(0, 0, 0, 0.4));
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
    padding: var(--alap-lightbox-setnav-list-padding, 0.25rem 0);
    max-height: var(--alap-lightbox-setnav-max-height, 240px);
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: #444 transparent;
  }

  .setnav-item {
    padding: var(--alap-lightbox-setnav-item-padding, 0.4rem 0.75rem);
    color: var(--alap-lightbox-setnav-item-color, #d0d7e5);
    font-size: var(--alap-lightbox-setnav-item-size, 0.85rem);
    cursor: pointer;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    transition: background 0.1s, color 0.1s;
  }

  .setnav-item:hover {
    background: var(--alap-lightbox-setnav-item-hover-bg, rgba(255, 255, 255, 0.1));
    color: var(--alap-lightbox-setnav-item-hover-color, #fff);
  }

  .setnav-item.active {
    background: var(--alap-lightbox-setnav-item-active-bg, rgba(58, 134, 255, 0.2));
    color: var(--alap-lightbox-setnav-item-active-color, #88bbff);
    font-weight: var(--alap-lightbox-setnav-item-active-weight, 600);
  }

  .setnav-item.highlighted {
    background: var(--alap-lightbox-setnav-item-highlight-bg, rgba(255, 255, 255, 0.15));
    color: var(--alap-lightbox-setnav-item-highlight-color, #fff);
  }

  .setnav-filter-wrap {
    display: flex;
    align-items: center;
    border-top: 1px solid var(--alap-lightbox-setnav-border, rgba(255, 255, 255, 0.1));
    flex-shrink: 0;
  }

  .setnav-filter {
    flex: 1;
    padding: var(--alap-lightbox-setnav-filter-padding, 0.5rem 0.75rem);
    background: var(--alap-lightbox-setnav-filter-bg, rgba(255, 255, 255, 0.05));
    border: none;
    color: var(--alap-lightbox-setnav-filter-color, #fff);
    font-size: var(--alap-lightbox-setnav-filter-size, 0.8rem);
    outline: none;
  }

  .setnav-filter::placeholder {
    color: var(--alap-lightbox-setnav-placeholder-color, rgba(255, 255, 255, 0.3));
  }

  .setnav-clear {
    background: none;
    border: none;
    color: var(--alap-lightbox-setnav-clear-color, rgba(255, 255, 255, 0.4));
    font-size: 1rem;
    cursor: pointer;
    padding: 0.25rem 0.5rem;
    line-height: 1;
    transition: color 0.1s;
  }

  .setnav-clear:hover {
    color: var(--alap-lightbox-setnav-clear-hover-color, #fff);
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

  /* --- Navigation --- */

  .nav {
    position: absolute;
    top: calc(50% + 9.5rem);
    opacity: 0;
    transition: opacity 0.2s;
  }

  .overlay:hover .nav {
    opacity: 1;
  }

  .nav button {
    background: var(--alap-lightbox-nav-bg, rgba(255, 255, 255, 0.1));
    border: none;
    color: var(--alap-lightbox-nav-color, #fff);
    font-size: var(--alap-lightbox-nav-icon-size, 2rem);
    cursor: pointer;
    line-height: 1;
    width: var(--alap-lightbox-nav-btn-size, 48px);
    height: var(--alap-lightbox-nav-btn-size, 48px);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background var(--alap-lightbox-transition, 0.25s);
  }

  .nav button:hover {
    background: var(--alap-lightbox-nav-bg-hover, rgba(255, 255, 255, 0.2));
  }

  .nav-prev {
    left: var(--alap-lightbox-nav-offset, calc(50% - 340px));
  }

  .nav-next {
    right: var(--alap-lightbox-nav-offset, calc(50% - 340px));
  }

  /* --- Fade transition --- */

  .fading .image,
  .fading .label,
  .fading .credit,
  .fading .description,
  .fading .counter {
    opacity: 0;
  }
`;
