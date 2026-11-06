import type {
  Profile,
  CartLine,
  Quote,
  Order,
  Invoice,
  Kyc,
  Ticket,
  Notification,
  Product,
  DocumentMeta,
} from '@sync/domain';
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = 'REQUEST_FAILED',
  ) {
    super(message);
  }
}
export const apiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
export const cloudConfigured = Boolean(apiBase && !apiBase.includes('YOUR_'));
export type Recommendation = {
  id: string;
  name: string;
  eyebrow: string;
  description: string;
  ids: string[];
  lines: CartLine[];
  quote: Quote;
};
export type UploadAuthorization = {
  uploadUrl: string;
  documentId: string;
  expiresAt: string;
  headers: Record<string, string>;
};
export type DocumentReservation = {
  id: string;
  name: string;
  type: string;
  size: number;
  expiresAt: string;
  status: 'pending' | 'expired' | 'uploaded';
};
async function response(
  path: string,
  token: string,
  method = 'GET',
  body?: unknown,
  headers: Record<string, string> = {},
) {
  if (!cloudConfigured) throw new ApiError(0, 'The customer API has not been configured.');
  let result: Response;
  try {
    result = await fetch(apiBase + path, {
      method,
      headers: {
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
      cache: 'no-store',
    });
  } catch {
    throw new ApiError(0, 'Cannot reach the customer API. Check your connection and try again.');
  }
  if (!result.ok) {
    const error = await result.json().catch(() => null);
    throw new ApiError(
      result.status,
      error?.error?.message || `Your request could not be completed (${result.status}).`,
      error?.error?.code,
    );
  }
  return result;
}
async function request<T>(
  path: string,
  token: string,
  method = 'GET',
  body?: unknown,
  headers?: Record<string, string>,
): Promise<T> {
  const result = await response(path, token, method, body, headers);
  return result.status === 204 ? (undefined as T) : (result.json() as Promise<T>);
}
async function collection<T>(path: string, token: string): Promise<T[]> {
  const items: T[] = [];
  const seen = new Set<string>();
  let after = '';
  do {
    const result = await response(
      path + '?limit=100' + (after ? '&after=' + encodeURIComponent(after) : ''),
      token,
    );
    const page: unknown = await result.json();
    if (!Array.isArray(page))
      throw new ApiError(502, 'The customer API returned an invalid collection.');
    items.push(...page);
    after = result.headers.get('X-Next-Cursor') || '';
    if (after && seen.has(after))
      throw new ApiError(502, 'The customer API returned a repeated page cursor.');
    seen.add(after);
  } while (after);
  return items;
}
export const customerApi = {
  catalogue: () => request<Product[]>('/v1/catalogue', ''),
  profile: (token: string) => request<Profile>('/v1/me', token),
  saveProfile: (token: string, profile: Profile) =>
    request<Profile>('/v1/me', token, 'PUT', profile),
  quote: (token: string, lines: CartLine[]) =>
    request<Quote>('/v1/quotes', token, 'POST', { lines }),
  recommendations: (token: string) => request<Recommendation[]>('/v1/recommendations', token),
  orders: (token: string) => collection<Order>('/v1/orders', token),
  order: (token: string, id: string) =>
    request<Order>('/v1/orders/' + encodeURIComponent(id), token),
  createOrder: (token: string, lines: CartLine[], key: string) =>
    request<Order>(
      '/v1/orders',
      token,
      'POST',
      { lines, demoConsent: true },
      { 'Idempotency-Key': key },
    ),
  cancelOrder: (token: string, id: string) =>
    request<Order>('/v1/orders/' + encodeURIComponent(id) + '/cancel', token, 'POST'),
  invoices: (token: string) => collection<Invoice>('/v1/invoices', token),
  kyc: (token: string) => request<Kyc>('/v1/kyc', token),
  saveKyc: (token: string, provider: string, consent: boolean) =>
    request<Kyc>('/v1/kyc', token, 'PUT', { provider, consent }),
  verifyDemo: (token: string) => request<Kyc>('/v1/kyc/demo-verification', token, 'POST'),
  documents: (token: string) => collection<DocumentReservation>('/v1/documents', token),
  upload: (token: string, file: { name: string; type: string; size: number }) =>
    request<UploadAuthorization>('/v1/documents/uploads', token, 'POST', file),
  renewUpload: (token: string, id: string) =>
    request<UploadAuthorization>(`/v1/documents/${encodeURIComponent(id)}/uploads`, token, 'POST'),
  completeUpload: (token: string, id: string) =>
    request<DocumentMeta>(`/v1/documents/${encodeURIComponent(id)}/complete`, token, 'POST'),
  deleteDocument: (token: string, id: string) =>
    request<void>(`/v1/documents/${encodeURIComponent(id)}`, token, 'DELETE'),
  tickets: (token: string) => collection<Ticket>('/v1/tickets', token),
  createTicket: (token: string, body: Pick<Ticket, 'subject' | 'category' | 'description'>) =>
    request<Ticket>('/v1/tickets', token, 'POST', body),
  resolveTicket: (token: string, id: string) =>
    request<Ticket>(`/v1/tickets/${encodeURIComponent(id)}/resolve`, token, 'POST'),
  notifications: (token: string) => collection<Notification>('/v1/notifications', token),
  readNotification: (token: string, id: string) =>
    request<Notification>(`/v1/notifications/${encodeURIComponent(id)}/read`, token, 'POST'),
};
/** Only same-origin local content endpoints receive Cognito credentials. Never leak them to S3. */
export async function uploadBytes(authorization: UploadAuthorization, file: Blob, token: string) {
  const url = new URL(authorization.uploadUrl);
  const base = new URL(apiBase);
  const local =
    url.origin === base.origin &&
    url.pathname ===
      base.pathname.replace(/\/$/, '') +
        `/v1/documents/${encodeURIComponent(authorization.documentId)}/content`;
  if (
    !local &&
    (url.protocol !== 'https:' ||
      !/(^|\.)s3([.-][a-z0-9-]+)*\.amazonaws\.com(\.cn)?$/.test(url.hostname))
  )
    throw new ApiError(400, 'The API returned an unexpected document upload destination.');
  const headers = new Headers(authorization.headers);
  if (headers.has('authorization'))
    throw new ApiError(400, 'Unexpected authorization header on an upload.');
  if (local) headers.set('Authorization', 'Bearer ' + token);
  let result: Response;
  try {
    result = await fetch(url, {
      method: 'PUT',
      body: file,
      headers,
      signal: AbortSignal.timeout(60000),
      credentials: 'omit',
      redirect: 'error',
    });
  } catch {
    throw new ApiError(0, 'Document upload failed. You can retry or remove the pending document.');
  }
  if (!result.ok) throw new ApiError(result.status, `Document upload failed (${result.status}).`);
}
