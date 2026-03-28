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

import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkHtml from 'remark-html';
import remarkAlap from '../../../plugins/remark-alap/src/index';
import { registerConfig, defineAlapLink } from 'alap';
import { demoConfig } from './config';
import markdownSource from './content.md?raw';

import type { AlapConfig } from 'alap/core';

// 1. Register Alap web component and config
defineAlapLink();
registerConfig(demoConfig);

// 2. Elements
const sourceEl = document.getElementById('source') as HTMLTextAreaElement;
const contentEl = document.getElementById('content')!;
const configEl = document.getElementById('config') as HTMLTextAreaElement;
const configStatus = document.getElementById('config-status')!;

const htmlOutputEl = document.getElementById('html-output')!;

// 3. Render markdown through remark-alap pipeline
async function render(markdown: string) {
  const result = await unified()
    .use(remarkParse)
    .use(remarkAlap)
    .use(remarkHtml, { sanitize: false })
    .process(markdown);

  const html = String(result);
  contentEl.innerHTML = html;
  htmlOutputEl.textContent = html;
}

// 4. Initialize
sourceEl.value = markdownSource;
configEl.value = JSON.stringify(demoConfig, null, 2);
render(markdownSource);

// 5. Re-render markdown on edit (debounced)
let mdTimer: ReturnType<typeof setTimeout>;
sourceEl.addEventListener('input', function() {
  clearTimeout(mdTimer);
  mdTimer = setTimeout(function() {
    render(sourceEl.value);
  }, 150);
});

// 6. Config helpers

function updateHelpPanel(config: AlapConfig) {
  const tags = new Set<string>();
  if (config.allLinks) {
    for (const link of Object.values(config.allLinks)) {
      if (link.tags) link.tags.forEach(function(t: string) { tags.add(t); });
    }
  }
  document.getElementById('help-tags')!.innerHTML =
    Array.from(tags).sort().map(function(t) { return '<code>.' + t + '</code>'; }).join(' ');

  const macros = config.macros ? Object.keys(config.macros) : [];
  document.getElementById('help-macros')!.innerHTML =
    macros.sort().map(function(m) { return '<code>@' + m + '</code>'; }).join(' ');
}

function applyConfig(config: AlapConfig) {
  registerConfig(config);
  render(sourceEl.value);
  updateHelpPanel(config);
}

// 7. Reset config button
document.getElementById('btn-reset')!.addEventListener('click', function() {
  configEl.value = JSON.stringify(demoConfig, null, 2);
  applyConfig(demoConfig);
  configStatus.textContent = 'Config reset';
  configStatus.className = 'config-status ok';
  setTimeout(function() { configStatus.textContent = ''; }, 1500);
});

// 8. Re-register config on edit (debounced)
let cfgTimer: ReturnType<typeof setTimeout>;
configEl.addEventListener('input', function() {
  clearTimeout(cfgTimer);
  cfgTimer = setTimeout(function() {
    try {
      const newConfig = JSON.parse(configEl.value);
      applyConfig(newConfig);
      configStatus.textContent = 'Config updated';
      configStatus.className = 'config-status ok';
      setTimeout(function() { configStatus.textContent = ''; }, 1500);
    } catch {
      configStatus.textContent = 'Invalid JSON';
      configStatus.className = 'config-status error';
    }
  }, 300);
});

// 9. Help panel
const helpPanel = document.getElementById('help-panel')!;
const helpBackdrop = document.getElementById('help-backdrop')!;

function openHelp() {
  helpPanel.classList.add('open');
  helpBackdrop.classList.add('open');
}

function closeHelp() {
  helpPanel.classList.remove('open');
  helpBackdrop.classList.remove('open');
}

document.getElementById('btn-help')!.addEventListener('click', openHelp);
document.getElementById('btn-help-close')!.addEventListener('click', closeHelp);
helpBackdrop.addEventListener('click', closeHelp);
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape' && helpPanel.classList.contains('open')) closeHelp();
});

updateHelpPanel(demoConfig);

// 10. Copy buttons
document.querySelectorAll('.copy-btn').forEach(function(btn) {
  btn.addEventListener('click', function() {
    const target = (btn as HTMLElement).dataset.target!;
    const el = document.getElementById(target) as HTMLTextAreaElement;
    navigator.clipboard.writeText(el.value).then(function() {
      const orig = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(function() { btn.textContent = orig; }, 1500);
    });
  });
});

// 10. Tab switching
document.querySelectorAll('.tab').forEach(function(btn) {
  btn.addEventListener('click', function() {
    const target = (btn as HTMLElement).dataset.tab!;
    document.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('active'); });
    document.querySelectorAll('.tab-content').forEach(function(c) { c.classList.remove('active'); });
    btn.classList.add('active');
    document.getElementById('tab-' + target)!.classList.add('active');
  });
});
