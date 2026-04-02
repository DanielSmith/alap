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

import { AlapUI } from 'alap';
import { demoConfig } from './config';

/**
 * Bluesky / AT Protocol demo.
 *
 * Two data modes in one page:
 *   1. Static allLinks — hand-curated, no network calls
 *   2. Dynamic :atproto: — live API calls via the generate handler
 *
 * The :atproto: protocol is async — it fetches from the public API
 * before the expression parser can use the results. We pre-resolve
 * all :atproto: expressions on page load, then menus open instantly.
 *
 * Optional login (app password) unlocks :atproto:search: for post
 * search. Everything else works without authentication.
 *
 * The session token is always stored in sessionStorage (survives page
 * refreshes and navigation within the tab). If "Remember me" is checked,
 * it's also stored in localStorage (survives browser close, like Bluesky).
 */

const BSKY_PDS = 'https://bsky.social/xrpc';
const SESSION_KEY = 'alap_atproto_session';

// ═══════════════════════════════════════════════════════════════
// Session storage
//
// Always saved to sessionStorage (tab-scoped, survives navigation).
// If "Remember me" is checked, also saved to localStorage
// (survives browser close — like Bluesky itself).
// ═══════════════════════════════════════════════════════════════

function saveSession(handle: string, accessJwt: string, remember: boolean) {
  const data = JSON.stringify({ handle, accessJwt });
  try { sessionStorage.setItem(SESSION_KEY, data); } catch { /* */ }
  if (remember) {
    try { localStorage.setItem(SESSION_KEY, data); } catch { /* */ }
  }
}

function loadSession(): { handle: string; accessJwt: string } | null {
  // Try sessionStorage first (current tab), then localStorage (persisted)
  for (const store of [sessionStorage, localStorage]) {
    try {
      const raw = store.getItem(SESSION_KEY);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (parsed.handle && parsed.accessJwt) return parsed;
    } catch { /* corrupt — try next */ }
  }
  return null;
}

function clearSession() {
  try { sessionStorage.removeItem(SESSION_KEY); } catch { /* */ }
  try { localStorage.removeItem(SESSION_KEY); } catch { /* */ }
}

// ═══════════════════════════════════════════════════════════════
// Apply token to the protocol config
// ═══════════════════════════════════════════════════════════════

function setToken(token: string | null) {
  const protocol = demoConfig.protocols?.atproto;
  if (protocol) {
    protocol.accessJwt = token;
  }
}

// ═══════════════════════════════════════════════════════════════
// Init
// ═══════════════════════════════════════════════════════════════

async function init() {
  // Check for a saved session (only exists if user opted in)
  const saved = loadSession();
  const isLoggedIn = !!saved;
  if (saved) {
    setToken(saved.accessJwt);
  }

  const ui = new AlapUI(demoConfig);
  const engine = ui.getEngine();

  // Collect all :atproto: expressions on the page
  const triggers = document.querySelectorAll<HTMLElement>('[data-alap-linkitems]');
  const atprotoExpressions = Array.from(triggers)
    .map(el => el.dataset.alapLinkitems ?? '')
    .filter(expr => expr.includes(':atproto:'));

  // Pre-resolve — if logged in, resolve everything including search.
  // If not, skip search expressions (they'd return empty anyway).
  const toResolve = isLoggedIn
    ? atprotoExpressions
    : atprotoExpressions.filter(expr => !expr.includes(':atproto:search:'));

  if (toResolve.length > 0) {
    await engine.preResolve(toResolve);
  }

  document.body.classList.add('loaded');

  // Load config source into the collapsible code block
  const configEl = document.getElementById('config-source');
  if (configEl) {
    import('./config.ts?raw').then(m => { configEl.textContent = m.default; });
  }

  // --- DOM references ---

  const loginForm = document.getElementById('login-form') as HTMLFormElement | null;
  const logoutBtn = document.getElementById('logout-btn') as HTMLButtonElement | null;
  const loginStatus = document.getElementById('login-status');
  const loginError = document.getElementById('login-error');
  const searchSection = document.getElementById('search-section');
  const codeStep = document.getElementById('code-step');
  const codeForm = document.getElementById('code-form') as HTMLFormElement | null;
  const rememberBox = document.getElementById('remember-me') as HTMLInputElement | null;

  // If we restored a session, update the UI immediately
  if (isLoggedIn && saved) {
    loginForm?.classList.add('hidden');
    if (logoutBtn) logoutBtn.classList.remove('hidden');
    if (loginStatus) loginStatus.textContent = `Logged in as ${saved.handle}`;
    if (searchSection) searchSection.classList.remove('auth_required');
    // If it came from localStorage, they must have checked "Remember me" before
    try {
      if (localStorage.getItem(SESSION_KEY) && rememberBox) rememberBox.checked = true;
    } catch { /* */ }
  }

  // --- Password visibility toggle ---

  const pwToggle = document.querySelector('.pw_toggle') as HTMLButtonElement | null;
  if (pwToggle) {
    const pwInput = pwToggle.previousElementSibling as HTMLInputElement;
    pwToggle.addEventListener('click', () => {
      const showing = pwInput.type === 'text';
      pwInput.type = showing ? 'password' : 'text';
      pwToggle.textContent = showing ? '\u{1F441}' : '\u{1F441}\u{200D}\u{1F5E8}';
    });
  }

  // --- Login flow ---

  let pendingHandle = '';
  let pendingPassword = '';

  /**
   * Activate search after login — resolve search expressions,
   * re-scan triggers, update UI.
   */
  async function activateSearch(handle: string) {
    engine.clearCache();
    const searchExpressions = atprotoExpressions.filter(
      expr => expr.includes(':atproto:search:'),
    );
    if (searchExpressions.length > 0) {
      await engine.preResolve(searchExpressions);
    }

    loginForm?.classList.add('hidden');
    codeStep?.classList.add('hidden');
    if (logoutBtn) logoutBtn.classList.remove('hidden');
    if (loginStatus) loginStatus.textContent = `Logged in as ${handle}`;
    if (searchSection) searchSection.classList.remove('auth_required');
    ui.refresh();

    pendingPassword = '';
  }

  /**
   * Call createSession, optionally with a 2FA email code.
   */
  async function completeLogin(authFactorToken?: string) {
    if (loginError) loginError.textContent = '';

    const body: Record<string, string> = {
      identifier: pendingHandle,
      password: pendingPassword,
    };
    if (authFactorToken) {
      body.authFactorToken = authFactorToken;
    }

    try {
      const response = await fetch(`${BSKY_PDS}/com.atproto.server.createSession`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json().catch(() => ({})) as Record<string, unknown>;

      if (!response.ok) {
        if (data.error === 'AuthFactorTokenRequired') {
          loginForm?.classList.add('hidden');
          codeStep?.classList.remove('hidden');
          if (loginStatus) {
            loginStatus.textContent = 'Check your email for a verification code.';
          }
          return;
        }

        const msg = (data.message as string) || `Login failed (${response.status})`;
        if (loginError) loginError.textContent = msg;
        return;
      }

      const session = data as { accessJwt: string; handle: string };

      setToken(session.accessJwt);
      saveSession(session.handle, session.accessJwt, !!rememberBox?.checked);
      await activateSearch(session.handle);
    } catch {
      if (loginError) loginError.textContent = 'Network error — check your connection.';
    }
  }

  // Step 1: handle + app password
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      pendingHandle = (loginForm.querySelector('[name="handle"]') as HTMLInputElement).value.trim();
      pendingPassword = (loginForm.querySelector('[name="password"]') as HTMLInputElement).value;
      if (!pendingHandle || !pendingPassword) return;
      await completeLogin();
    });
  }

  // Step 2 (if needed): email verification code
  if (codeForm) {
    codeForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const code = (codeForm.querySelector('[name="code"]') as HTMLInputElement).value.trim();
      if (!code) return;
      await completeLogin(code);
    });
  }

  // --- Custom search ---

  const customForm = document.getElementById('custom-search-form') as HTMLFormElement | null;
  const customInput = document.getElementById('custom-search-input') as HTMLInputElement | null;
  const customResult = document.getElementById('custom-search-result');

  /**
   * Sanitize search input: strip control chars, collapse whitespace,
   * reject anything that looks like script injection or encoded attacks.
   * Returns null if the input is invalid.
   */
  function sanitizeQuery(raw: string): string | null {
    // Strip control characters and zero-width chars
    let cleaned = raw.replace(/[\x00-\x1f\x7f\u200b-\u200f\u2028-\u202f\ufeff]/g, '');
    // Collapse whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    // Length check
    if (cleaned.length === 0 || cleaned.length > 100) return null;
    // Reject HTML/script injection patterns
    if (/<|>|javascript:|data:|on\w+\s*=/i.test(cleaned)) return null;
    // Reject percent-encoded sequences (prevent smuggled payloads)
    if (/%[0-9a-f]{2}/i.test(cleaned)) return null;
    return cleaned;
  }

  if (customForm && customInput && customResult) {
    customForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const query = sanitizeQuery(customInput.value);
      if (!query) {
        customResult.textContent = 'Invalid search query.';
        return;
      }

      const protocol = demoConfig.protocols?.atproto;
      if (!protocol?.accessJwt) {
        customResult.textContent = 'Log in above to search posts.';
        return;
      }

      customResult.textContent = 'Searching...';

      // Register a search alias for the user's query, then create a
      // dynamic trigger element that uses it.
      const aliasKey = `_custom_${Date.now()}`;
      const searches = (protocol.searches ?? {}) as Record<string, string>;
      searches[aliasKey] = query;
      protocol.searches = searches;

      const expr = `:atproto:search:${aliasKey}:limit=10:`;

      // Create a new alap trigger for the result
      customResult.textContent = '';
      const link = document.createElement('a');
      link.className = 'alap';
      link.dataset.alapLinkitems = expr;
      link.textContent = `Search results: "${query}"`;
      link.href = '#';
      customResult.appendChild(link);

      // Pre-resolve and re-scan so Alap picks up the new trigger
      await engine.preResolve([expr]);
      ui.refresh();
    });
  }

  // --- Logout ---

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      setToken(null);
      clearSession();
      engine.clearCache();

      loginForm?.classList.remove('hidden');
      logoutBtn.classList.add('hidden');
      if (loginStatus) loginStatus.textContent = '';
      if (loginError) loginError.textContent = '';
      if (searchSection) searchSection.classList.add('auth_required');
      if (rememberBox) rememberBox.checked = false;
    });
  }
}

init();
