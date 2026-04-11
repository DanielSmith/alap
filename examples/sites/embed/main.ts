/**
 * Copyright 2026 Daniel Smith
 * SPDX-License-Identifier: Apache-2.0
 */

import { AlapUI } from 'alap';
import { AlapLightbox } from '../../../src/ui-lightbox';
import { AlapLens } from '../../../src/ui-lens';
import { createEmbed } from '../../../src/ui-embed';
import '../../../src/ui-lightbox/lightbox.css';
import '../../../src/ui-lens/lens.css';
import '../../../src/ui-embed/embed.css';
import { demoConfig } from './config';

// ── Standalone embeds ─────────────────────────────────────────────
// createEmbed() is a pure DOM builder — no renderer needed.

const standaloneVideo = document.getElementById('standalone-video');
if (standaloneVideo) {
  standaloneVideo.appendChild(
    createEmbed('https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
  );
  standaloneVideo.appendChild(
    createEmbed('https://vimeo.com/126718838'),
  );
}

const standaloneAudio = document.getElementById('standalone-audio');
if (standaloneAudio) {
  standaloneAudio.appendChild(
    createEmbed('https://open.spotify.com/track/4vLYewWIvqHfKtJDk8c8tq'),
  );
}

const standaloneInteractive = document.getElementById('standalone-interactive');
if (standaloneInteractive) {
  standaloneInteractive.appendChild(
    createEmbed('https://codepen.io/keithclark/pen/JycFw'),
  );
}

// Auto-allow policy — no consent prompt
const standaloneAllow = document.getElementById('standalone-allow');
if (standaloneAllow) {
  standaloneAllow.appendChild(
    createEmbed('https://www.youtube.com/watch?v=dTAAsCNK7RA', undefined, {
      embedPolicy: 'allow',
    }),
  );
}

// Unknown provider — plain link fallback
const standaloneUnknown = document.getElementById('standalone-unknown');
if (standaloneUnknown) {
  standaloneUnknown.appendChild(
    createEmbed('https://en.wikipedia.org/wiki/Jazz'),
  );
}

// ── Renderers ─────────────────────────────────────────────────────
// All four renderers share the same config. Only the presentation differs.

const menu = new AlapUI(demoConfig, { selector: '.alap-menu' });

const lightbox = new AlapLightbox(demoConfig, {
  selector: '.alap-lightbox',
  embedPolicy: 'allow',
});

const lens = new AlapLens(demoConfig, {
  selector: '.alap-lens',
  embedPolicy: 'allow',
});

// Expose for console debugging
(window as any).alapMenu = menu;
(window as any).alapLightbox = lightbox;
(window as any).alapLens = lens;
