/**
 * Copyright 2026 Daniel Smith
 * SPDX-License-Identifier: Apache-2.0
 */

import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { AlapExtension } from '@alap/tiptap';
import { registerConfig, defineAlapLink } from 'alap';
import { demoConfig } from './config';
import type { AlapConfig } from 'alap/core';

// --- Elements ---

const queryInput = document.getElementById('query-input') as HTMLInputElement;
const configEl = document.getElementById('config') as HTMLTextAreaElement;
const configStatus = document.getElementById('config-status')!;
const helpPanel = document.getElementById('help-panel')!;
const helpBackdrop = document.getElementById('help-backdrop')!;

// --- Tiptap editor with AlapExtension ---

const editor = new Editor({
  element: document.getElementById('editor')!,
  extensions: [
    StarterKit,
    AlapExtension.configure({
      HTMLAttributes: { class: 'alap-link' },
    }),
  ],
  content: `
    <p>Check out some <alap-link query=".coffee" class="alap-link">coffee spots</alap-link>
       or famous <alap-link query=".bridge" class="alap-link">bridges</alap-link>.</p>
    <p>Try editing this text — the Alap links are inline nodes you can select and modify.</p>
    <p>Use the toolbar to insert new links, or press <strong>Cmd+Shift+A</strong>.</p>
  `,
  onUpdate({ editor }) {
    updateOutput(editor);
  },
});

// --- Register web component for preview ---

defineAlapLink();
registerConfig(demoConfig);

// --- Toolbar ---

document.getElementById('btn-insert')!.addEventListener('click', function() {
  const query = queryInput.value || '.coffee';
  editor.commands.setAlapLink({ query });
  editor.commands.focus();
});

let queryTimer: ReturnType<typeof setTimeout>;
queryInput.addEventListener('input', function() {
  clearTimeout(queryTimer);
  queryTimer = setTimeout(function() {
    const query = queryInput.value;
    if (query) editor.commands.updateAlapLink({ query });
  }, 300);
});

document.getElementById('btn-remove')!.addEventListener('click', function() {
  editor.commands.unsetAlapLink();
  editor.commands.focus();
});

// --- HTML output + live preview ---

function formatHtml(html: string): string {
  let indent = 0;
  return html
    .replace(/></g, '>\n<')
    .split('\n')
    .map(function(line) {
      if (line.match(/^<\//)) indent--;
      const pad = '  '.repeat(Math.max(0, indent));
      if (line.match(/^<[^/!]/) && !line.match(/\/>/)) indent++;
      if (line.match(/<\/.*>$/)) indent--;
      return pad + line;
    })
    .join('\n');
}

function updateOutput(ed: Editor) {
  const html = ed.getHTML();
  document.getElementById('html-output')!.textContent = formatHtml(html);
  document.getElementById('preview')!.innerHTML = html;
}

updateOutput(editor);

// --- Config editor ---

let currentConfig: AlapConfig = demoConfig;
configEl.value = JSON.stringify(demoConfig, null, 2);

function applyConfig(config: AlapConfig) {
  currentConfig = config;
  registerConfig(config);
  updateOutput(editor);
  updateHelpPanel(config);
}

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

document.getElementById('btn-reset')!.addEventListener('click', function() {
  configEl.value = JSON.stringify(demoConfig, null, 2);
  applyConfig(demoConfig);
  configStatus.textContent = 'Config reset';
  configStatus.className = 'config-status ok';
  setTimeout(function() { configStatus.textContent = ''; }, 1500);
});

// --- Help panel ---

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

// Initialize help panel content
updateHelpPanel(demoConfig);

// --- Copy buttons ---

document.querySelectorAll('.copy-btn').forEach(function(btn) {
  btn.addEventListener('click', function() {
    const target = (btn as HTMLElement).dataset.target!;
    let text: string;
    if (target === 'editor') {
      text = editor.getHTML();
    } else {
      text = (document.getElementById(target) as HTMLTextAreaElement).value;
    }
    navigator.clipboard.writeText(text).then(function() {
      const orig = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(function() { btn.textContent = orig; }, 1500);
    });
  });
});

// --- Tab switching ---

document.querySelectorAll('.tab').forEach(function(btn) {
  btn.addEventListener('click', function() {
    const target = (btn as HTMLElement).dataset.tab!;
    document.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('active'); });
    document.querySelectorAll('.tab-content').forEach(function(c) { c.classList.remove('active'); });
    btn.classList.add('active');
    document.getElementById('tab-' + target)!.classList.add('active');
  });
});
