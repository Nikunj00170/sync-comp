# Implementation plan and ownership

This plan starts after the manually provisioned AWS foundation. Target effort split: 50/50 between Nikunj and the teammate, with Nikunj owning AWS. Rebalance implementation/testing tasks after each milestone if actual effort differs.

## Two-person ownership

| Owner | Work package | Share |
| --- | --- | --- |
| Nikunj | AWS infrastructure: CDK, S3, CloudFront, Lambda, API Gateway, DynamoDB, Cognito and permissions | 15% |
| Nikunj | Backend foundation: API handlers, authentication, database access, document uploads and activity history | 15% |
| Nikunj | Integrations: Textract, Digio/DigiLocker adapters, payment simulation and browser voice integration | 15% |
| Nikunj | Deployment, monitoring, spending controls and backend security checks | 5% |
| Teammate | Customer interface: discovery, recommendations, checkout, KYC, tracking and billing | 15% |
| Teammate | Partner/reviewer/admin interfaces: pipeline, priorities, tasks, corrections and demo controls | 15% |
| Teammate | Shared business logic: eligibility, bundles, quotes, order/task transitions and demo invoice calculations | 15% |
| Teammate | Responsive design, accessibility and complete journey tests | 5% |

Both owners review contracts and the complete customer journey. The partner application remains a later work package. The current app includes shared demo logic; Nikunj must enforce these rules in authoritative backend handlers.

## Proposed application layout

The customer and domain packages now exist; backend service directories below remain planned:

```text
apps/customer/             React + Vite customer app, Capacitor configuration and Android project
services/api/              Lambda handlers, application services, data repositories and providers
services/document-worker/  Planned asynchronous extraction/verification worker
packages/contracts/       Shared request/response types and schemas
packages/domain/          Catalogue rules, quote arithmetic and state transitions
```

Existing shared/data/, fixtures/, case_source/, and infra-placeholder/ are ready to use. Keep the web interface and Android UI in the same customer codebase.

## Implementation order

### 1. Establish one runnable workspace

Create a coherent package/workspace setup rather than executing the archived scaffold. Pin compatible dependencies and commit the lockfile. Use Node.js 24 for backend parity. The customer workspace now builds from the root; see apps/customer/README.md for commands.

Acceptance: a local customer shell builds; TypeScript contracts compile; a deliberately configured local origin/callback can authenticate against the existing pool.

### 2. Finish identity end to end

Implement authorization code + PKCE, callback cleanup, refresh and logout. Send access tokens in the Authorization header. Verify a valid signed-in request, expired/wrong-client tokens, required route scope persistence, and customer isolation.

Create an Android public app client when the package identifier and platform callback URI are selected; add that client to API Gateway's accepted audiences.

### 3. Build discovery and recommendations

Use the fictional catalogue. Apply city-tier and size eligibility, registration requirements and product dependencies before scoring recommendations. Store questionnaire answers and versioned quote snapshots. Treat prices as integer paise in business logic.

Acceptance: questionnaire and later voice requirements produce the same rule-based eligible offers for the same profile.

### 4. Add KYC and private files

Keep both Digio and direct DigiLocker options visible with accurate mock labels. Return short-lived presigned URLs only after validating customer ownership, expected object path, file type, and size.

Add SQS/DLQ and the document worker/Textract permissions only when wiring the processing flow. Use mock registries and the fixture date in fixture mode; production/live mode uses appropriate current provider results.

Acceptance: an authorized browser upload works; another customer cannot read it; mock/provider failures and retries are understandable in the UI.

### 5. Add orders, tracking and consolidated invoices

Persist service-level state with optimistic concurrency and activity. Add customer-history indexes for paginated queries. Generate invoice snapshots and PDFs across all services for a billing period.

Acceptance: a quote can become an order; individual services progress independently; the customer sees one consolidated demonstration invoice view.

### 6. Add limited real voice sessions

Keep UI and backend flags false until credentials and adapters are validated. Use the same domain tools as questionnaire-based recommendations. Add admission limits and a questionnaire fallback. Plan 4–5 real browser voice demos, with telephone calls still “Coming soon.”

Acceptance: disabling the feature removes live controls and blocks backend voice endpoints; missing/invalid credentials fail safely; requirements and quote arithmetic remain deterministic.

### 7. Deliver Android and web

Build the customer web assets for S3/CloudFront and package the same UI with Capacitor. Handle system-browser login, app return links, secure token storage, upload origins, microphone permissions and API connectivity on an emulator/device.

Acceptance: the complete customer journey works on both interfaces with the same account and stored state.

## Work deliberately unfinished

- Customer web UI and Android project now exist. A compiled APK, business API implementation, CI/CD and CDK stack are still outstanding.
- No live Sarvam/OpenAI, Digio, DigiLocker or payment integration.
- No SQS/Textract worker or secondary indexes provisioned.
- No partner application or million-user production infrastructure.

## Reference boundaries

The case PDF and dataset guide are source material. Their fixture conventions do not authorize account actions, change the real clock, or establish live-government/provider verification. Preserve the distinction between simulated case outcomes and actual provider results.
