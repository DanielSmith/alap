/** Copyright 2026 Daniel Smith — Apache 2.0 */

import { describe, it, expect } from 'vitest';
import { readCappedJson } from '../../src/protocols/shared/readCappedJson';
import { MAX_WEB_RESPONSE_BYTES } from '../../src/constants';

function jsonResponse(body: string, headers: Record<string, string> = {}): Response {
  return new Response(body, {
    headers: { 'content-type': 'application/json', ...headers },
  });
}

function streamedJsonResponse(
  payload: string,
  { includeContentLength = false }: { includeContentLength?: boolean } = {},
): Response {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(payload);
  const stream = new ReadableStream({
    start(controller) {
      // chunk into 16 KB pieces to exercise the loop
      const CHUNK = 16 * 1024;
      for (let i = 0; i < bytes.byteLength; i += CHUNK) {
        controller.enqueue(bytes.slice(i, Math.min(i + CHUNK, bytes.byteLength)));
      }
      controller.close();
    },
  });
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (includeContentLength) headers['content-length'] = String(bytes.byteLength);
  return new Response(stream, { headers });
}

describe('readCappedJson', () => {
  it('parses a small honest response', async () => {
    const data = await readCappedJson(jsonResponse('{"ok":true}'));
    expect(data).toEqual({ ok: true });
  });

  it('short-circuits when content-length declares > cap', async () => {
    const tooBig = JSON.stringify({ pad: 'x'.repeat(32) });
    const response = new Response(tooBig, {
      headers: {
        'content-type': 'application/json',
        'content-length': String(MAX_WEB_RESPONSE_BYTES + 1000),
      },
    });
    expect(await readCappedJson(response)).toBeNull();
  });

  it('parses a streamed response with no content-length header', async () => {
    const payload = JSON.stringify({ items: [1, 2, 3] });
    const response = streamedJsonResponse(payload);
    expect(await readCappedJson(response)).toEqual({ items: [1, 2, 3] });
  });

  // Regression: Surface 4-1 from the 2026-04-22 security pass. A hostile
  // server omits content-length and streams unbounded bytes.
  it('cancels and returns null when a streamed response exceeds the cap', async () => {
    // Build a payload one byte larger than the cap.
    const payload = 'x'.repeat(MAX_WEB_RESPONSE_BYTES + 1);
    const response = streamedJsonResponse(payload);
    expect(await readCappedJson(response)).toBeNull();
  });

  it('passes through a stream exactly at the cap', async () => {
    // A valid JSON string padded to exactly MAX_WEB_RESPONSE_BYTES.
    const prefix = '{"pad":"';
    const suffix = '"}';
    const filler = 'x'.repeat(MAX_WEB_RESPONSE_BYTES - prefix.length - suffix.length);
    const payload = prefix + filler + suffix;
    expect(new TextEncoder().encode(payload).byteLength).toBe(MAX_WEB_RESPONSE_BYTES);
    const result = await readCappedJson(streamedJsonResponse(payload));
    expect(result).toEqual({ pad: filler });
  });

  it('throws on invalid JSON (caller handles in try/catch)', async () => {
    const response = jsonResponse('{not json');
    await expect(readCappedJson(response)).rejects.toThrow();
  });
});
