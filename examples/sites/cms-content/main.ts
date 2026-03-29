/**
 * Copyright 2026 Daniel Smith
 * SPDX-License-Identifier: Apache-2.0
 */

import { unified } from 'unified';
import rehypeParse from 'rehype-parse';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import rehypeAlap from 'rehype-alap';
import { registerConfig, defineAlapLink } from 'alap';
import config from './config';

// --- Initialize Alap ---

registerConfig(config);
defineAlapLink();

// --- Build the rehype pipeline ---

// Allow <alap-link> through the sanitizer
const sanitizeSchema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), 'alap-link'],
  attributes: {
    ...defaultSchema.attributes,
    'alap-link': ['query', 'class', 'id'],
  },
};

const processor = unified()
  .use(rehypeParse, { fragment: true })
  .use(rehypeAlap)
  .use(rehypeSanitize, sanitizeSchema)
  .use(rehypeStringify);

// --- DOM elements ---

const input = document.getElementById('cms-input') as HTMLTextAreaElement;
const transformedOutput = document.getElementById('transformed-output') as HTMLElement;
const livePreview = document.getElementById('live-preview') as HTMLElement;
const configDisplay = document.getElementById('config-display') as HTMLElement;

// --- Sample CMS content ---

const sampleContent = `<h2>Weekend Guide: Best of the City</h2>

<p>Start your morning at one of our favorite
<a href="alap:.coffee">coffee spots</a>, then walk across
one of the iconic <a href="alap:.bridge">bridges</a>.</p>

<p>For lunch, check out the
<a href="alap:@nycfood">NYC food scene</a> — we've
curated the best spots.</p>

<p>Don't miss <a href="alap:golden">the Golden Gate</a>
if you're visiting San Francisco.</p>

<p>Car enthusiasts will love our
<a href="alap:@cars">classic cars</a> collection.</p>

<p>Read more on <a href="https://example.com">our blog</a>
(regular links are untouched).</p>`;

// --- Transform and render ---

let debounceTimer = 0;

async function transform() {
  const html = input.value;
  const result = await processor.process(html);
  const output = String(result);

  // Show transformed HTML as text (not rendered)
  transformedOutput.textContent = output;

  // Render in preview — alap-link auto-initializes
  livePreview.innerHTML = output;
}

function onInput() {
  clearTimeout(debounceTimer);
  debounceTimer = window.setTimeout(transform, 300);
}

// --- Initialize ---

input.value = sampleContent;
input.addEventListener('input', onInput);

// Show the config
configDisplay.textContent = JSON.stringify(config, null, 2);

// Initial transform
transform();
