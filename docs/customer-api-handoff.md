# Customer application and backend handoff

The frontend is integrated with the Spring API in local full-stack tests. The configured hosted API still exposes infrastructure diagnostics. Deployment is separate; see [AWS readiness](case-assessment/AWS_READINESS.md).

| Capability | Implemented contract | Integration |
| --- | --- | --- |
| Business account | GET/PUT `/v1/me` | Authoritative profile; sensitive changes invalidate KYC |
| Catalogue/discovery | GET `/v1/catalogue`, GET `/v1/recommendations`, POST `/v1/quotes` | Canonical products, server eligibility/pricing, editable add-ons |
| Documents | POST `/v1/documents/uploads`, owned content/completion/renewal/deletion | Actual private bytes, 8 reservations, type/size limits |
| Smart KYC | GET/PUT `/v1/kyc`, POST `/v1/kyc/assessment`, POST `/v1/registries/lookup` | Consent, OCR, masked synthetic registry checks, review reasons |
| Demo verification | POST `/v1/kyc/demo-verification` | Passing assessment plus explicit demo gate; never live approval |
| Orders/invoices | Owned paginated list/get, POST `/v1/orders` | Server checkout, idempotency, immutable issued invoice snapshot, client PDF |
| Support/notices | Customer ticket/create/resolve and notice/read routes | Persistent account records and complete pagination |
| GenAI discovery | Local Node `/api/voice/chat`, `/api/voice/turn`, DELETE session | Typed or optional speech discovery; canonical quote review |

Web auth uses Cognito access tokens, session storage and silent refresh; logout/account changes clear owned UI state. In cloud mode there is no local-data fallback. Local demo is explicitly selected by leaving the API URL empty. Real DigiLocker/Digio/e-sign, payments, telecom provisioning, native cloud sign-in and a hosted/authenticated AI gateway are not implemented external integrations. Do not enable demo endpoints as a production purchase service.
