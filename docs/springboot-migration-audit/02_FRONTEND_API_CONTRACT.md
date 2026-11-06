# Frontend and API contract

Audit date: 6 November 2026. Scope: repository evidence only; no AWS account inspection, deployment, application changes, or provider calls. Line references refer to the audited source snapshot.

Evidence labels: **VERIFIED IN CODE** = directly inspected implementation/data; **DOCUMENTED ONLY** = assertion/design in project documentation; **PARTIALLY IMPLEMENTED** = only some required behavior exists; **MOCKED** = local/synthetic behavior; **NOT IMPLEMENTED** = no implementation found; **UNVERIFIED** = cannot establish from available evidence. Recommendations and proposed schemas below are future design, not deployed facts.


## Runtime and state

VERIFIED IN CODE: apps/customer/package.json pins React/DOM 19.3.1, react-router-dom 7.18.5, oidc-client-ts 3.5.0, Capacitor 8.6.0, pdf-lib 1.17.1. Root pins Vite 8.3.6/TS 7.0.2. main.tsx:1 mounts StrictMode → HashRouter → WorkspaceProvider → FeedbackProvider → App. No React Query, Redux or React Hook Form in active app. Components use useState/useEffect/useMemo and React context.

store.tsx:4 uses airtel-sync:customer:v1. Load checks workspace version, profile schema, selected arrays, nonempty invoices, KYC documents and preferences, then casts remaining nested structures without full runtime validation. Invalid/unavailable storage creates initialWorkspace. Every update serializes the whole workspace; write failure shows a banner. Discover.tsx:50 separately persists airtel-sync:discovery (draft profile), and draftStep is in Workspace. Account reset clears discovery and reseeds workspace. This is demo storage, not a live authenticated cache; do not migrate it to customer truth automatically.

## All pages and components

All pages currently read local Workspace; no route guard. Routes in App.tsx:269 onward; hash fragments never reach Spring controllers.

| Route / module | Behavior / frontend backend dependency when live |
| --- | --- |
| / — Dashboard.tsx:26 | Active services, quote summaries, pending orders, balances, quick links and advisor modal; aggregate owned orders/invoices/profile. |
| /discover — Discover.tsx:45 | Three questionnaire steps, persisted draft, Zod validation, deterministic essential/recommended/growth results, budget comparison, replaces cart. Needs profile/recommendation/quote APIs. |
| /plans — Plans.tsx:31 | All 25 bundled products; text/category/eligibility/saved filters, low/high/eligibility sort, details, compare up to 3, dependency-aware add/remove; needs versioned catalogue, optional saved preferences. |
| /checkout — Checkout.tsx:16 | Quantity 1–1000, cascade removal, quote, editable address, verification/consent gate; local makeOrder then clears cart and navigates to order. Needs authoritative quote/order creation. |
| /orders and /orders/:id — Orders.tsx:31 | Filter/search, detail/timeline, future preferred slot, UTC calendar, cancellation, demo sequential advance. Needs owned order, activity, slot/cancel actions. Demo advance must not become customer production API. |
| /services — Services.tsx:17 | Flattens active order lines; quantity management requotes local order and appends event, preserving issued invoice snapshots. Needs versioned service changes. |
| /verification — Verification.tsx:19 | Provider choice, file metadata, samples, mock consent and verification. Needs real upload/session/status integration; new live statuses require UI changes. |
| /billing — Billing.tsx:18 | Assumes at least one invoice; filters, category totals, PDFs, CSV, simulated UPI/card/net banking selection and paid status. Needs empty/loading/error states, invoice/payment APIs. |
| /support — Support.tsx:50 | Eight static FAQs, local ticket create/resolve/search. Subject >=5 and description >=12 trimmed characters. Needs ticket API; customer resolve permissions must be decided. |
| /account — Account.tsx:22 | Profile validation/save, preferences, export/reset, sign-in/logout and live connectivity check. Only real customer adapter call is checkConnection → profile; result unused. |
| * | App inline not-found page. |

Reusable components: components/Brand.tsx:1 brand SVG; NetworkArt.tsx:1 decorative network illustration; Modal.tsx:3 focus management, Escape/backdrop close, focus restoration and scroll locking. App contains sidebar/mobile navigation, global local catalogue/page search, notification modal/read state, and voice Coming Soon modal. feedback.tsx supplies timed notices. downloads.ts exports download (Blob or native cache/share), invoicePdf/downloadInvoice, downloadStatement and downloadCalendar. These utilities can stay; authoritative PDFs may later use protected downloads. PDF generator strips non-ASCII and uses snapshot fields with legacy catalogue/profile fallbacks; Hindi PDFs require a font/rendering change.

## Existing typed adapter: exhaustive list

VERIFIED IN CODE api.ts:10–50; PARTIALLY IMPLEMENTED contract only, all business endpoints NOT IMPLEMENTED server-side.

Common request: VITE_API_BASE_URL with one trailing slash removed; Authorization: Bearer <Cognito access_token>. Content-Type: application/json only for truthy body; no Accept/idempotency/If-Match header or automatic retry. AbortSignal.timeout(15000). No cookies. Every success calls response.json(), so do not return empty 204 for these operations. No runtime response schema validation. Missing base/YOUR_ placeholder throws ApiError(0). 404 has specific undeployed-route message; other non-2xx have generic status message and ignore server body; fetch/timeout/JSON errors pass through as native errors. No silent demo fallback.

| Method/path | Body | JSON response | Call site now | Live purpose/authorization/DB and proposed success |
| --- | --- | --- | --- | --- |
| GET /v1/me | none | Profile | Account.tsx:50 only; diagnostic discards body | Resolve sub→membership→customer profile; customers GetItem; 200. Proposed absent-profile policy: initialize defaults explicitly or 404; do not invent personal data. |
| PUT /v1/me | Profile | Profile | None | Update caller-owned profile after schema validation; customers conditional Put/Update; 200. |
| POST /v1/quotes | {lines: CartLine[]} | Quote | None | Caller profile, immutable catalogue; compute server prices; proposed persist quote snapshot; customers quote item; 200 for compatibility including errors[]. No profile is sent. |
| GET /v1/orders | none | Order[] | None | Customer-history GSI query, filter authorized scope, hydrate owned orders; 200 raw array. |
| GET /v1/orders/{id} | none; encodeURIComponent(id) | Order | None | orders GetItem / partition query and ownership check; 200 or 404. |
| GET /v1/invoices | none | Invoice[] | None | Customer-history invoice prefix query, return snapshots; 200 raw array. |
| POST /v1/documents/uploads | {name:string,type:string,size:number} | {uploadUrl:string,documentId:string} | None | Validate caller/consent/type/size, create pending metadata under customers; presign private key; proposed 201 with JSON. No file bytes, upload method/headers/expiry/completion contract presently defined. |

All seven require bearer token by adapter. Actual route authorization/scopes/statuses/DTO validation are unspecified server-side. Proposed common failure statuses: 400 malformed input, 401 invalid/expired token, 403 insufficient scope/membership, 404 absent or inaccessible entity, 409 stale/idempotency conflict, 413 too large, 415 unsupported media, 422 semantically invalid operation, 429 limit, 503 dependency failure. Quote business errors remain a 200 Quote.errors[] parity behavior; distinguish malformed payload errors. Proposed error body {code,message,requestId,fieldErrors?:{field,message}[]} will require client adaptation to display details.

## Exact existing wire types

VERIFIED IN CODE: verbatim type/schema extract from packages/domain/src/index.ts:4–143 below. TypeScript optional properties may be absent; use JSON arrays/objects as shown, ISO string timestamps, preserve casing. Java DTOs must not serialize amounts as formatted strings or enum values in uppercase.

```typescript
export type Product = {
  id: string;
  category: string;
  name: string;
  description: string;
  unit: string;
  price: number;
  priceMax: number;
  setup: number;
  contract: number;
  tiers: number[];
  minEmployees: number;
  minSites: number;
  requiresGstin: boolean;
  dependencies: string[];
  installDays: number;
  segments: string[];
};
export const catalogue = rawCatalogue as Product[];
export const CATALOGUE_VERSION = 'case-2026-07-v1';
export const DEMO_TAX_BPS = 1800;
export const profileSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name').max(70),
  business: z.string().trim().min(2, 'Enter your business name').max(100),
  email: z.email('Enter a valid email address'),
  industry: z.enum(['professional', 'retail', 'manufacturing', 'hospitality']),
  city: z.string().trim().min(2, 'Enter a city').max(70),
  tier: z.coerce.number().int().min(1).max(2),
  employees: z.coerce.number().int().min(1).max(1000),
  sites: z.coerce.number().int().min(1).max(100),
  budget: z.coerce.number().int().min(500).max(1000000),
  hasGstin: z.boolean(),
  priorities: z.array(z.string()).min(1, 'Choose at least one priority'),
  address: z.string().max(250),
  phone: z.string().max(20),
});
export type Profile = z.infer<typeof profileSchema>;
export type CartLine = { productId: string; quantity: number };
export type Quote = {
  version: string;
  lines: CartLine[];
  monthly: number;
  setup: number;
  tax: number;
  total: number;
  errors: string[];
};
export type OrderStatus =
  'received' | 'verification' | 'confirmed' | 'scheduled' | 'installing' | 'active' | 'cancelled';
export const orderSteps: OrderStatus[] = [
  'received',
  'verification',
  'confirmed',
  'scheduled',
  'installing',
  'active',
];
export const statusLabels: Record<OrderStatus, string> = {
  received: 'Order received',
  verification: 'Verification',
  confirmed: 'Confirmed',
  scheduled: 'Installation scheduled',
  installing: 'Getting you connected',
  active: 'Active',
  cancelled: 'Cancelled',
};
export type TimelineEvent = { label: string; detail: string; at: string };
export type Order = {
  id: string;
  name: string;
  createdAt: string;
  status: OrderStatus;
  lines: CartLine[];
  quote: Quote;
  address: string;
  slot: string;
  events: TimelineEvent[];
};
export type InvoiceLine = CartLine & {
  name?: string;
  unitPrice?: number;
  category?: string;
  unit?: string;
};
export type Invoice = {
  id: string;
  period: string;
  issuedAt: string;
  dueAt: string;
  status: 'paid' | 'unpaid';
  lines: InvoiceLine[];
  subtotal: number;
  tax: number;
  total: number;
  paymentReference?: string;
  billedTo?: Pick<Profile, 'name' | 'business' | 'email' | 'address'>;
};
export type DocumentMeta = {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
};
export type Kyc = {
  status: 'pending' | 'demo_verified';
  provider: 'digio' | 'digilocker' | null;
  consent: boolean;
  documents: DocumentMeta[];
  verifiedAt?: string;
};
export type Ticket = {
  id: string;
  subject: string;
  category: string;
  description: string;
  status: 'open' | 'resolved';
  createdAt: string;
};
export type Notification = {
  id: string;
  title: string;
  text: string;
  route: string;
  read: boolean;
  createdAt: string;
};
export type Workspace = {
  version: 1;
  profile: Profile;
  cart: CartLine[];
  saved: string[];
  orders: Order[];
  invoices: Invoice[];
  kyc: Kyc;
  tickets: Ticket[];
  notifications: Notification[];
  preferences: { emailUpdates: boolean; reminders: boolean; compactMotion: boolean };
  draftStep: number;
};
```

## Proposed additional APIs (NOT IMPLEMENTED)

These are migration requirements, not existing frontend contracts. JWT ownership applies to each customer API; derive customer from sub and membership, never a client-supplied owner. All JSON mutations validate Jakarta DTOs and use conditional writes; non-idempotent operations require Idempotency-Key. Versioned updates use If-Match and return 409 on stale version (an explicitly selected prototype convention).

| Method/path | Request → response / success | Authorization/validation and database work | Page |
| --- | --- | --- | --- |
| GET /v1/catalogue | none → {version,products:Product[]} /200 | Public selected catalogue; version immutable; bundled server resource first, no DB necessary | Plans/Discover |
| POST /v1/recommendations | {profile:Profile} → {version,bundles:[{id,name,eyebrow,description,ids:string[],lines:CartLine[],quote:Quote}]} /200 | Validate profile; same domain rules, no client prices; read catalogue, optionally save discovery | Discover |
| POST /v1/orders | {lines:CartLine[],catalogueVersion:string,address:string,quoteId?:string} → Order /201 | Owned saved profile, valid nonempty quote, explicit live verified KYC; transact order/services/idempotency/activity; reject changed version/price via 409 | Checkout |
| POST /v1/orders/{id}/cancel | {version:number,reason?:string} → Order /200 | Owner; current state cancellation rules; conditional state/event write | Orders |
| PATCH /v1/orders/{id}/appointment | {version:number,slot:string} → Order /200 | Owner; future ISO instant, capacity policy still missing; no active/cancelled; conditional order/event | Orders |
| GET /v1/orders/{id}/activity | ?limit&cursor → Page<TimelineEvent> /200 | Owner; query activity partition ordered by time/id | Orders |
| PATCH /v1/orders/{id}/services/{productId} | {quantity:number,version:number} → Order /200 | Owner active order, integer 1–1000, requote, immutable invoices; conditional service/order/activity | Services |
| GET /v1/kyc | none → KycSession /200 | Owner; read current session/evidence metadata; explicit mock/live mode | Verification |
| POST /v1/kyc/sessions | {provider:digio|digilocker,mode:mock|live} → KycSession /201 | Backend permits mode/provider, stores new owned session | Verification |
| POST /v1/kyc/sessions/{id}/consent | {noticeVersion:string,accepted:boolean} → KycSession /200 | Owner; immutable timestamp/purpose/mode/evidence record | Verification |
| POST /v1/documents/{id}/complete | {etag?:string} → DocumentStatus /202 | Owner; HEAD actual object, verify pending upload key/type/size, enqueue idempotently | Verification |
| GET /v1/documents/{id} | none → DocumentStatus /200 | Owner; metadata/processing result only; do not expose another tenant's object | Verification |
| DELETE /v1/documents/{id} | none → {documentId,deleted:boolean} /200 | Owner and retention policy; deletion workflow/object cleanup/evidence | Verification |
| POST /v1/kyc/gstin-lookup | {gstin:string} → RegistryResult /200 | Owner+consent; format/checksum then mode-specific registry/provider lookup; mask output/logs | Verification (new fields) |
| POST /v1/kyc/udyam-lookup | {udyamNumber:string} → RegistryResult /200 | Owner+consent; fixture/live validator split, lookup; persist evidence | Verification (new fields) |
| POST /v1/kyc/sessions/{id}/verify | {documentIds:string[]} → KycSession /202 | Owner, consent, complete owned files; OCR/registry/check jobs; never accept browser status | Verification |
| GET /v1/invoices/{id} | none → Invoice /200 | Owner; snapshot read, no recalculation | Billing |
| GET /v1/invoices/{id}/pdf | none → {downloadUrl:string,expiresAt:string} /200 | Owner; private snapshot PDF, short-lived S3 GET | Billing |
| POST /v1/invoices/{id}/payments | {mode:mock|live,method:string} → Payment /201 | Owner unpaid invoice, server amount, adapter mode; idempotency/payment record | Billing |
| GET /v1/payments/{id} | none → Payment /200 | Owner; pending/confirmed/failed server result | Billing |
| POST /v1/webhooks/payments/{provider} | provider-specific signed raw body → {received:true} /200 | Provider signature/timestamp/dedup, not customer JWT; atomic payment/invoice/activity transition | No direct page |
| POST /v1/webhooks/kyc/{provider} | signed provider event → {received:true} /200 | Provider authentication, session correlation, replay protection, version guard | Verification polling |
| GET /v1/activity | ?limit&cursor → Page<Activity> /200 | Owner, customer-history activity index proposed | Dashboard |
| GET/POST /v1/support/tickets | none / {subject,category,description} → Page<Ticket> /200 or Ticket /201 | Owner, lengths above, allowlisted category, customers ticket items | Support |
| PATCH /v1/support/tickets/{id} | {status:resolved,version:number} → Ticket /200 | Owner resolution permission to confirm; conditional write | Support |
| GET /v1/notifications | ?limit&cursor → Page<Notification> /200 | Owner; customer partition query | App |
| PATCH /v1/notifications/{id} | {read:boolean} → Notification /200 | Owner; conditional notification update | App |
| PUT /v1/preferences | Workspace.preferences → Workspace.preferences /200 | Owner; boolean-only validation, profile/preferences item | Account |
| GET /v1/capabilities | none → {voiceEnabled:boolean,kycModes:string[],advisorEnabled:boolean} /200 | Non-secret server capabilities; no credentials | App |

Page<T> := {items:T[],nextCursor?:string}; proposed limits default 20/max100; opaque signed cursor bound to owner/query. Keep existing arrays at existing endpoints; introduce GET /v1/orders/page and /v1/invoices/page returning Page<T> when frontend supports pagination. No existing route has these query semantics. New entity schemas are specified in 05, 07 and 08; payment provider payloads remain undefined pending provider selection. Existing Quote has no ID/expiry: introduce optional quoteId/expiresAt additively, persist server snapshot and require reference only after coordinated checkout update.

## Frontend migration checklist

Keep routes, visual components, formatting, modal accessibility, catalogue display and local demo. Introduce explicit DemoRepository and LiveRepository, session-wide token lifecycle, server loading/error/empty states, response validation and awaited mutations. Replace each local page mutation above with its live equivalent; do not switch only api.ts's base URL and expect a live app. Preserve demo in separate namespace. Never merge demo orders/documents into signed-in data. Replace client makeOrder/nextOrder/payment/KYC approval in live mode with server results. Refresh/re-login UX, 401 handling, idempotency/version headers, upload PUT/completion and async status polling must be added. Change Billing/Dashboard assumptions for customers with no invoices/orders and remove catalogue dereference assumptions for historical/retired products. Keep minor preview calculations, but display authoritative quote before acceptance.
