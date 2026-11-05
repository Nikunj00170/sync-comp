import type { Profile, CartLine, Quote, Order, Invoice } from '@sync/domain';
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
const base = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
export const cloudConfigured = Boolean(base && !base.includes('YOUR_'));
async function request<T>(path: string, token: string, method = 'GET', body?: unknown): Promise<T> {
  if (!cloudConfigured) throw new ApiError(0, 'The customer API has not been configured.');
  const response = await fetch(base + path, {
    method,
    headers: {
      Authorization: 'Bearer ' + token,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok)
    throw new ApiError(
      response.status,
      response.status === 404
        ? 'The customer API route is not deployed yet.'
        : 'Your request could not be completed (' + response.status + ').',
    );
  return response.json() as Promise<T>;
}
// Contract for the separately owned backend. Cloud failures never fall back to demo data.
export const customerApi = {
  profile: (token: string) => request<Profile>('/v1/me', token),
  saveProfile: (token: string, profile: Profile) =>
    request<Profile>('/v1/me', token, 'PUT', profile),
  quote: (token: string, lines: CartLine[]) =>
    request<Quote>('/v1/quotes', token, 'POST', { lines }),
  orders: (token: string) => request<Order[]>('/v1/orders', token),
  order: (token: string, id: string) =>
    request<Order>('/v1/orders/' + encodeURIComponent(id), token),
  invoices: (token: string) => request<Invoice[]>('/v1/invoices', token),
  upload: (token: string, file: { name: string; type: string; size: number }) =>
    request<{ uploadUrl: string; documentId: string }>(
      '/v1/documents/uploads',
      token,
      'POST',
      file,
    ),
};
