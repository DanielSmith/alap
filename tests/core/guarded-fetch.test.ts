import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as dns from 'node:dns';

vi.mock('node:dns', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:dns')>();
  return { ...actual, lookup: vi.fn() };
});

describe('guardedFetch', () => {
  let guardedFetch: typeof import('../../src/protocols/guarded-fetch').guardedFetch;

  beforeEach(async () => {
    vi.resetModules();
    ({ guardedFetch } = await import('../../src/protocols/guarded-fetch'));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects a literal private IP URL synchronously (no socket, no DNS)', async () => {
    await expect(guardedFetch('http://127.0.0.1/x')).rejects.toThrow(/private address/i);
    expect(vi.mocked(dns.lookup)).not.toHaveBeenCalled();
  });

  it('rejects a public hostname that resolves to a private IP', async () => {
    vi.mocked(dns.lookup).mockImplementation(((
      _hostname: string,
      _options: unknown,
      cb: (err: Error | null, address: string, family: number) => void,
    ) => {
      cb(null, '127.0.0.1', 4);
    }) as unknown as typeof dns.lookup);

    // Node's global fetch wraps undici socket errors as "TypeError: fetch failed"
    // with the real cause on `.cause` — so assert on the wrapped chain.
    let thrown: unknown;
    try {
      await guardedFetch('http://rebind.example.com/x');
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(Error);
    const err = thrown as Error & { cause?: Error & { code?: string } };
    expect(err.cause?.code).toBe('ERR_SSRF_PRIVATE_IP');
    expect(err.cause?.message ?? '').toMatch(/resolved to private IP/i);
  });

  it('allows a public hostname that resolves to a public IP', async () => {
    vi.mocked(dns.lookup).mockImplementation(((
      _hostname: string,
      _options: unknown,
      cb: (err: Error | null, address: string, family: number) => void,
    ) => {
      cb(null, '93.184.216.34', 4);
    }) as unknown as typeof dns.lookup);

    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('ok', { status: 200 }));

    const resp = await guardedFetch('http://example.com/x');
    expect(resp.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalled();
  });
});
