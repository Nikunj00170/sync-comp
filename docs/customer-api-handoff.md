# Customer application → backend handoff

The React/Capacitor app is runnable in explicit local demo mode. It is not connected to a complete customer backend. The typed adapter in `apps/customer/src/lib/api.ts` is the starting contract; the cloud currently exposes only health/auth diagnostics.

| Capability | Required authoritative API | Customer behavior now |
| --- | --- | --- |
| Business account | GET/PUT `/v1/me` | Persisted device profile; separate live account diagnostic |
| Catalogue | Versioned public catalogue response | Selected fictional 25-product catalogue bundled locally |
| Discovery | POST `/v1/quotes` | Shared deterministic domain rules and versioned local quote |
| Document uploads | POST `/v1/documents/uploads` → short-lived presigned URL | Metadata-only picker, no contents transmitted |
| Verification | Begin/consent/status endpoints for Digio and DigiLocker; signed callbacks | Explicit mock provider choice and simulated result |
| Orders | POST `/v1/orders`; GET paginated `/v1/orders`; GET `/v1/orders/:id` | Local orders and a sequential demo timeline |
| Appointment changes | Versioned update with service-level scheduling rules | Local preferred slot and calendar export |
| Invoices | GET paginated `/v1/invoices`; protected snapshot/PDF access | Consolidated sample snapshots and generated demo PDFs |
| Support/notifications | Customer-owned ticket and notification endpoints | Local requests/updates; no outbound messages |
| Voice | Server capability check, authenticated session bootstrap, admission limits and domain tools | Coming Soon and questionnaire fallback |

## Integration requirements

- Derive customer/business membership from the verified access token and stored membership. Reject customer IDs supplied as proof of ownership.
- Enforce the shared eligibility/dependency and integer-paise quote logic on the server. Treat browser totals as untrusted. Freeze catalogue version, prices and quantities at order/issued-invoice boundaries.
- Use idempotency keys on checkout, provider callbacks and payment transitions; conditional writes/version checks on order and task changes. UI demo controls must not become public production transition endpoints.
- Consolidate a billing account's active services across orders for a billing period. Retain issued invoice line prices; a later service change must not rewrite an issued invoice.
- Validate upload size/type/key ownership server-side; scan/process privately, expose only authorized short-lived access. Store consent and provider evidence. A mock result must never become live KYC approval.
- Add pagination and customer-history indexes; avoid table scans for dashboard/list screens. Normalize errors and add request IDs without logging tokens or document contents.
- Implement separate explicit demo and live repositories behind the same contracts. Do not silently fall back to local data on authentication or API failure.
- Disable backend voice routes independently of the browser flag. Keep provider credentials in AWS-managed server-side secrets. Native authentication needs its public mobile client and system-browser return flow before enabling account login in the APK.

The user/teammate 50/50 split remains: Nikunj owns infrastructure, backend, integrations and deployment; teammate owns customer/partner UI, shared business rules and responsive journey checks. See `docs/implementation-plan.md` for exact percentages.
