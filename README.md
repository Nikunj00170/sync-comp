# Accel Telecom / Airtel SYNC

Phone-first business discovery, catalogue bundles, Smart KYC, demo checkout, order tracking and invoice snapshots. React/TypeScript customer web and Capacitor Android share the interface; the authoritative API is Java 21 / Spring Boot.

**Status — 7 November 2026:** frontend and backend work together in local authenticated full-stack tests. English, Hindi and Marathi UI and Unicode invoice exports are implemented. The configured AWS website/Cognito endpoints respond, but the hosted API is still the infrastructure placeholder and returns 404 for business routes. [AWS actions needed](docs/case-assessment/AWS_READINESS.md) distinguish implementation from deployment.

## Run locally

Node 24+ (tested on 26), Java 21 and npm are required.

```sh
npm ci
# Leave VITE_API_BASE_URL empty for an explicit local demo.
npm run dev
```

The customer build reads ignored root `.env.local`; copy public configuration from [.env.example](.env.example). Provider secrets stay server-side. See [customer setup](apps/customer/README.md) for cloud login, callbacks, languages and Android; [backend setup](services/sync-backend/README.md) for `services/sync-backend/.env.local`, loaded automatically by Spring during local development. The root env file is reserved for frontend and Node AI-service settings.

For GenAI, run `npm run dev:voice` alongside Vite. Set `VITE_CHAT_ENABLED=true` for typed advice and `VITE_VOICE_ENABLED=true` for optional voice. Gemini powers conversation; Sarvam powers speech. Consent precedes transmission. The local gateway is loopback-only; public hosting requires an authenticated/throttled gateway. Questionnaire discovery works without AI providers.

## What is implemented

- Canonical 25-product catalogue, deterministic recommendations, editable bundle/add-ons, server eligibility/dependency/quantity checks and integer-paise quotes.
- Cognito PKCE web flow and access-token ownership; API-owned profiles, private uploads, orders, invoices, support and notices; no demo fallback on API failure.
- Smart KYC consent, byte-owned OCR, GST checksum/Active checks, synthetic GST/Udyam lookup, address/signatory checks and masked review reasons. The fixed date applies only to the supplied synthetic case.
- Atomic/idempotent **demo** checkout, persisted tracking timeline and invoice snapshots; PDFs preserve Devanagari text.
- Local memory adapters and selectable AWS DynamoDB/S3 adapters, with durable-storage guards in the AWS profile. Optional Textract image adapter; exact-byte cached Tesseract output covers supplied specimens by default.

This is not live government KYC, payment collection, e-signing or telecom activation. DigiLocker/Digio choices are labelled mock. Partner backoffice is optional future work. Native cloud authentication needs its separate client/return flow; APK compilation does not establish a working native sign-in.

## Verify

```sh
npm run build
npm test
npm run test:sales-bot
npm run test:e2e
npm run test:integration
cd services/sync-backend
./mvnw clean verify
```

The full-stack runner uses a real Spring server and isolated test JWTs; no test credentials or auth bypass enter the production JAR. Browser suites isolate ports from the developer's running app. Set `PLAYWRIGHT_CHANNEL=chromium` in environments without installed Chrome.

## Case evidence and handoff

[Case assessment](docs/case-assessment/README.md) maps the brief to code, tests, dataset results and remaining external work. It includes the [ten-slide business-case source](docs/case-assessment/BUSINESS_CASE.md), [privacy/security note](docs/case-assessment/PRIVACY_SECURITY.md), [Smart KYC details](docs/case-assessment/SMART_KYC.md) and [AWS readiness](docs/case-assessment/AWS_READINESS.md). [Architecture](docs/architecture.md) documents implemented flows. [Future production design](docs/production-direction.md) is separate and unimplemented.

The supplied pack contains 25 catalogue rows, 5,000 fictional leads, 3,534 GST entries, 2,723 Udyam entries and 47 images for 12 applicants. Analysis uses only these student-visible files, never judge-only materials. `python3 scripts/audit-case-data.py <student-data-directory>` reproduces aggregate findings without printing lead PII. Repository branding edits are documented in the audit.
