import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
const fetcher = vi.fn<typeof fetch>();
beforeEach(() => {
  vi.resetModules();
  vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080');
  vi.stubGlobal('fetch', fetcher);
  fetcher.mockReset();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
describe('customer API boundary', () => {
  it('follows encoded pagination cursors and uses access-token headers', async () => {
    fetcher
      .mockResolvedValueOnce(
        new Response('[{"id":"one"}]', { headers: { 'X-Next-Cursor': 'ORDER#two' } }),
      )
      .mockResolvedValueOnce(new Response('[{"id":"two"}]'));
    const { customerApi } = await import('../apps/customer/src/lib/api');
    expect(await customerApi.orders('access-token')).toHaveLength(2);
    expect(fetcher.mock.calls[1][0]).toContain('after=ORDER%23two');
    expect(fetcher.mock.calls[0][1]?.headers).toMatchObject({
      Authorization: 'Bearer access-token',
    });
  });
  it('preserves structured validation failures and never substitutes demo data', async () => {
    fetcher.mockResolvedValue(
      new Response('{"error":{"code":"DEMO_DISABLED","message":"Demo checkout is disabled."}}', {
        status: 503,
      }),
    );
    const { customerApi } = await import('../apps/customer/src/lib/api');
    await expect(customerApi.createOrder('token', [], 'checkout-123')).rejects.toMatchObject({
      status: 503,
      code: 'DEMO_DISABLED',
    });
    expect(fetcher.mock.calls[0][1]?.headers).toMatchObject({ 'Idempotency-Key': 'checkout-123' });
  });
  it('handles 204 responses and detects repeated page cursors', async () => {
    const { customerApi } = await import('../apps/customer/src/lib/api');
    fetcher.mockResolvedValueOnce(new Response(null, { status: 204 }));
    expect(await customerApi.deleteDocument('token', 'document')).toBeUndefined();
    fetcher.mockResolvedValue(new Response('[]', { headers: { 'X-Next-Cursor': 'ORDER#same' } }));
    // Each fetch needs a distinct response body.
    fetcher.mockImplementation(
      async () => new Response('[]', { headers: { 'X-Next-Cursor': 'ORDER#same' } }),
    );
    await expect(customerApi.orders('token')).rejects.toThrow('repeated page cursor');
  });
  it('sends bearer credentials only to the owned local upload endpoint', async () => {
    fetcher.mockImplementation(async () => new Response(null, { status: 204 }));
    const { uploadBytes } = await import('../apps/customer/src/lib/api');
    const file = new Blob(['test'], { type: 'application/pdf' });
    await uploadBytes(
      {
        uploadUrl: 'http://localhost:8080/v1/documents/id/content',
        documentId: 'id',
        expiresAt: '',
        headers: { 'Content-Type': 'application/pdf' },
      },
      file,
      'private-token',
    );
    expect(new Headers(fetcher.mock.calls[0][1]?.headers).get('Authorization')).toBe(
      'Bearer private-token',
    );
    await uploadBytes(
      {
        uploadUrl: 'https://private-bucket.s3.ap-south-1.amazonaws.com/key?signature=test',
        documentId: 'id',
        expiresAt: '',
        headers: { 'if-none-match': '*' },
      },
      file,
      'private-token',
    );
    expect(new Headers(fetcher.mock.calls[1][1]?.headers).has('Authorization')).toBe(false);
    expect(fetcher.mock.calls[1][1]?.redirect).toBe('error');
    await expect(
      uploadBytes(
        {
          uploadUrl: 'https://untrusted.example/key',
          documentId: 'id',
          expiresAt: '',
          headers: {},
        },
        file,
        'private-token',
      ),
    ).rejects.toThrow('unexpected document upload destination');
  });
});

it('rate-limited reads back off and recover, while POST reservations are never replayed', async () => {
  vi.useFakeTimers();
  fetcher
    .mockResolvedValueOnce(
      new Response('{"message":"Too Many Requests"}', {
        status: 429,
        headers: { 'Retry-After': '1' },
      }),
    )
    .mockResolvedValueOnce(new Response('{"status":"pending","documents":[]}'));
  const { customerApi } = await import('../apps/customer/src/lib/api');
  const read = customerApi.kyc('token');
  await vi.runAllTimersAsync();
  expect(await read).toMatchObject({ status: 'pending' });
  expect(fetcher).toHaveBeenCalledTimes(2);
  fetcher.mockReset();
  fetcher.mockResolvedValueOnce(
    new Response('{"message":"Too Many Requests"}', {
      status: 429,
      headers: { 'Retry-After': '10' },
    }),
  );
  await expect(
    customerApi.upload('token', { name: 'document.png', type: 'image/png', size: 4 }),
  ).rejects.toMatchObject({ status: 429, retryAfterSeconds: 10 });
  expect(fetcher).toHaveBeenCalledTimes(1);
});
