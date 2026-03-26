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

import { describe, it, expect } from 'vitest';
import { sanitizeUrl } from '../../src/core/sanitizeUrl';

describe('sanitizeUrl', () => {
  // --- Safe URLs pass through ---

  it('allows http URLs', () => {
    expect(sanitizeUrl('http://example.com')).toBe('http://example.com');
  });

  it('allows https URLs', () => {
    expect(sanitizeUrl('https://example.com/path?q=1')).toBe('https://example.com/path?q=1');
  });

  it('allows mailto URLs', () => {
    expect(sanitizeUrl('mailto:user@example.com')).toBe('mailto:user@example.com');
  });

  it('allows tel URLs', () => {
    expect(sanitizeUrl('tel:+1-555-0100')).toBe('tel:+1-555-0100');
  });

  it('allows relative URLs (path)', () => {
    expect(sanitizeUrl('/path/to/page')).toBe('/path/to/page');
  });

  it('allows relative URLs (dot-relative)', () => {
    expect(sanitizeUrl('./page.html')).toBe('./page.html');
  });

  it('allows relative URLs (bare path)', () => {
    expect(sanitizeUrl('page.html')).toBe('page.html');
  });

  it('allows empty string', () => {
    expect(sanitizeUrl('')).toBe('');
  });

  it('allows hash-only URLs', () => {
    expect(sanitizeUrl('#section')).toBe('#section');
  });

  it('allows query-only URLs', () => {
    expect(sanitizeUrl('?foo=bar')).toBe('?foo=bar');
  });

  // --- Dangerous schemes are blocked ---

  it('blocks javascript: URLs', () => {
    expect(sanitizeUrl('javascript:alert(1)')).toBe('about:blank');
  });

  it('blocks javascript: with mixed case', () => {
    expect(sanitizeUrl('JavaScript:alert(1)')).toBe('about:blank');
  });

  it('blocks javascript: with uppercase', () => {
    expect(sanitizeUrl('JAVASCRIPT:alert(document.cookie)')).toBe('about:blank');
  });

  it('blocks javascript: with embedded newlines', () => {
    expect(sanitizeUrl('java\nscript:alert(1)')).toBe('about:blank');
  });

  it('blocks javascript: with embedded tabs', () => {
    expect(sanitizeUrl('java\tscript:alert(1)')).toBe('about:blank');
  });

  it('blocks javascript: with embedded carriage return', () => {
    expect(sanitizeUrl('java\rscript:alert(1)')).toBe('about:blank');
  });

  it('blocks javascript: with leading whitespace', () => {
    expect(sanitizeUrl('  javascript:alert(1)')).toBe('about:blank');
  });

  it('blocks javascript: with null bytes', () => {
    expect(sanitizeUrl('java\x00script:alert(1)')).toBe('about:blank');
  });

  it('blocks data: URLs', () => {
    expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBe('about:blank');
  });

  it('blocks data: with mixed case', () => {
    expect(sanitizeUrl('Data:text/html,<h1>phish</h1>')).toBe('about:blank');
  });

  it('blocks vbscript: URLs', () => {
    expect(sanitizeUrl('vbscript:MsgBox("xss")')).toBe('about:blank');
  });

  it('blocks blob: URLs', () => {
    expect(sanitizeUrl('blob:https://example.com/uuid')).toBe('about:blank');
  });

  it('blocks javascript: with space before colon', () => {
    expect(sanitizeUrl('javascript :alert(1)')).toBe('about:blank');
  });

  // --- Edge cases ---

  it('allows URLs that contain "javascript" in the path', () => {
    expect(sanitizeUrl('https://example.com/javascript-tutorial')).toBe('https://example.com/javascript-tutorial');
  });

  it('allows URLs that contain "data" in the path', () => {
    expect(sanitizeUrl('https://example.com/data/report.csv')).toBe('https://example.com/data/report.csv');
  });

  it('allows ftp: URLs (not in blocklist)', () => {
    expect(sanitizeUrl('ftp://files.example.com/doc.pdf')).toBe('ftp://files.example.com/doc.pdf');
  });
});
