/**
 * Copyright 2026 Daniel Smith
 * SPDX-License-Identifier: Apache-2.0
 *
 * Next.js App Router pattern demo.
 *
 * This example simulates the Next.js App Router layout/page structure
 * using plain React. It shows how next-alap's AlapLayout and AlapLink
 * work in the App Router pattern — a root layout wrapping page components,
 * with no 'use client' needed in the pages themselves.
 *
 * In a real Next.js app, the layout.tsx and page.tsx files would be
 * separate files in the app/ directory. Here they're in one file
 * for demo purposes.
 */

import { createRoot } from 'react-dom/client';
import { useState, type ReactNode } from 'react';
import { AlapProvider, AlapLink, useAlap } from 'alap/react';
import { registerConfig, defineAlapLink } from 'alap';
import type { AlapConfig } from 'alap/core';
import config from './config';

// Register web component for MDX-style usage
registerConfig(config);
defineAlapLink();

// --- Simulated "pages" (in real Next.js, these are files in app/) ---

function HomePage() {
  return (
    <div class="page">
      <h2>Home</h2>
      <p>
        Welcome to the city guide. Start your day at one of our
        favorite <AlapLink query=".coffee">coffee spots</AlapLink>,
        then walk across an iconic <AlapLink query=".bridge">bridge</AlapLink>.
      </p>
      <p>
        For lunch, check out the <AlapLink query="@nycfood">NYC food scene</AlapLink> —
        we've curated the best spots.
      </p>
      <p>
        Car enthusiasts: browse our <AlapLink query="@cars">classic cars</AlapLink> collection.
      </p>
    </div>
  );
}

function BridgesPage() {
  const { resolve } = useAlap();
  const nycBridges = resolve('@nycbridges');
  const allBridges = resolve('.bridge');

  return (
    <div class="page">
      <h2>Bridges</h2>
      <p>
        NYC has {nycBridges.length} famous bridges:
        {' '}<AlapLink query="@nycbridges">explore them</AlapLink>.
      </p>
      <p>
        Or see <AlapLink query=".bridge">all {allBridges.length} bridges</AlapLink> across
        cities, including the <AlapLink query="golden">Golden Gate</AlapLink> in San Francisco.
      </p>
    </div>
  );
}

function WebComponentPage() {
  return (
    <div class="page">
      <h2>Web Component Mode</h2>
      <p>
        These links use the <code>&lt;alap-link&gt;</code> web component
        instead of the React adapter. This is how MDX content and
        server-rendered HTML work in Next.js — the web component
        hydrates independently.
      </p>
      <p>
        Visit some{' '}
        <alap-link query=".coffee">coffee spots</alap-link>
        {' '}or explore the{' '}
        <alap-link query=".bridge">bridges</alap-link>.
      </p>
      <p>
        Browse{' '}
        <alap-link query="@favorites">our favorites</alap-link>
        {' '} — a macro combining specific items.
      </p>
    </div>
  );
}

// --- Layout (simulates app/layout.tsx) ---

function RootLayout({ children }: { children: ReactNode }) {
  return (
    <AlapProvider config={config}>
      <div className="app-shell">
        {children}
      </div>
    </AlapProvider>
  );
}

// --- App with "routing" ---

function App() {
  const [page, setPage] = useState<'home' | 'bridges' | 'webcomponent'>('home');

  return (
    <RootLayout>
      <header className="app-header">
        <h1>next-alap demo</h1>
        <code>App Router pattern</code>
      </header>

      <nav className="nav">
        <button
          className={page === 'home' ? 'active' : ''}
          onClick={() => setPage('home')}
        >
          Home
        </button>
        <button
          className={page === 'bridges' ? 'active' : ''}
          onClick={() => setPage('bridges')}
        >
          Bridges
        </button>
        <button
          className={page === 'webcomponent' ? 'active' : ''}
          onClick={() => setPage('webcomponent')}
        >
          Web Component
        </button>
      </nav>

      {page === 'home' && <HomePage />}
      {page === 'bridges' && <BridgesPage />}
      {page === 'webcomponent' && <WebComponentPage />}

      <div className="info-bar">
        In a real Next.js app: <code>AlapLayout</code> in <code>app/layout.tsx</code>,
        {' '}<code>AlapLink</code> in any page — no <code>'use client'</code> needed
        when importing from <code>next-alap</code>.
        The Web Component tab shows <code>&lt;alap-link&gt;</code> for MDX/Markdown content.
      </div>
    </RootLayout>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
