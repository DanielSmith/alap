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

/* Alap Server API Demo — shared client */

const BASE = window.location.origin;

// ---- API calls ----

const listConfigs = async () => {
  const res = await api('GET', '/configs');
  if (res.ok) {
    const names = await res.clone().json();
    renderConfigList(names);
  }
};

const loadConfig = async () => {
  const name = document.getElementById('loadName').value.trim();
  if (!name) return;
  await api('GET', `/configs/${encodeURIComponent(name)}`);
};

const saveConfig = async () => {
  const name = document.getElementById('saveName').value.trim();
  const body = document.getElementById('saveBody').value.trim();
  if (!name) return;

  try {
    JSON.parse(body);
  } catch {
    logEntry('PUT', `/configs/${name}`, 0, 'Invalid JSON in body');
    return;
  }

  const res = await api('PUT', `/configs/${encodeURIComponent(name)}`, body);
  if (res.ok) listConfigs();
};

const deleteConfig = async () => {
  const name = document.getElementById('deleteName').value.trim();
  if (!name) return;
  const res = await api('DELETE', `/configs/${encodeURIComponent(name)}`);
  if (res.ok) listConfigs();
};

const searchConfigs = async () => {
  const tag = document.getElementById('searchTag').value.trim();
  const q = document.getElementById('searchQ').value.trim();
  const regex = document.getElementById('searchRegex').value.trim();

  const params = new URLSearchParams();
  if (tag) params.set('tag', tag);
  else if (q) params.set('q', q);
  else if (regex) params.set('regex', regex);
  else {
    logEntry('GET', '/search', 0, 'Provide at least one of: tag, text, regex');
    return;
  }

  await api('GET', `/search?${params}`);
};

const cherryPick = async () => {
  const source = document.getElementById('cherrySource').value.trim();
  const expression = document.getElementById('cherryExpr').value.trim();
  if (!source || !expression) return;

  await api('POST', '/cherry-pick', JSON.stringify({ source, expression }));
};

const queryConfig = async () => {
  const expression = document.getElementById('queryExpr').value.trim();
  const configName = document.getElementById('queryConfig').value.trim();
  if (!expression) return;

  await api('POST', '/query', JSON.stringify({ expression, configName: configName || 'demo' }));
};

// ---- Helpers ----

const escapeHtml = (str) =>
  str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const api = async (method, path, body) => {
  const opts = { method };
  if (body) {
    opts.headers = { 'Content-Type': 'application/json' };
    opts.body = body;
  }

  try {
    const res = await fetch(BASE + path, opts);
    let text = '';
    let json;
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('json')) {
      json = await res.json();
      text = JSON.stringify(json, null, 2);
    } else if (res.status !== 204) {
      text = await res.text();
    }
    logEntry(method, path, res.status, text);
    return {
      ok: res.ok,
      status: res.status,
      clone: () => ({ json: () => Promise.resolve(json) }),
    };
  } catch (err) {
    logEntry(method, path, 0, `Network error: ${err.message}`);
    return { ok: false, status: 0 };
  }
};

const logEntry = (method, path, status, body) => {
  const log = document.getElementById('log');
  const entry = document.createElement('div');
  entry.className = 'log-entry';

  const statusClass = status >= 200 && status < 300 ? 'ok' : 'err';
  const statusText = status === 0 ? 'ERR' : status;

  entry.innerHTML =
    `<span class="log-method">${method}</span> ${escapeHtml(path)}` +
    `<span class="log-status ${statusClass}">${statusText}</span>` +
    (body ? `<div class="log-body">${escapeHtml(body)}</div>` : '');

  log.prepend(entry);
};

const clearLog = () => {
  document.getElementById('log').innerHTML = '';
};

const renderConfigList = (names) => {
  const ul = document.getElementById('configList');
  ul.innerHTML = '';
  for (const name of names) {
    const li = document.createElement('li');
    li.textContent = name;
    li.addEventListener('click', () => {
      document.getElementById('loadName').value = name;
      document.getElementById('deleteName').value = name;
      loadConfig();
    });
    ul.appendChild(li);
  }
};

// ---- Init ----

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btnList').addEventListener('click', listConfigs);
  document.getElementById('btnLoad').addEventListener('click', loadConfig);
  document.getElementById('btnSave').addEventListener('click', saveConfig);
  document.getElementById('btnDelete').addEventListener('click', deleteConfig);
  document.getElementById('btnSearch').addEventListener('click', searchConfigs);
  document.getElementById('btnCherry').addEventListener('click', cherryPick);
  document.getElementById('btnQuery').addEventListener('click', queryConfig);
  document.getElementById('btnClear').addEventListener('click', clearLog);

  listConfigs();
});
