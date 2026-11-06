# Open questions, gaps and discrepancies

Audit date: 6 November 2026. Scope: repository evidence only; no AWS account inspection, deployment, application changes, or provider calls. Line references refer to the audited source snapshot.

Evidence labels: **VERIFIED IN CODE** = directly inspected implementation/data; **DOCUMENTED ONLY** = assertion/design in project documentation; **PARTIALLY IMPLEMENTED** = only some required behavior exists; **MOCKED** = local/synthetic behavior; **NOT IMPLEMENTED** = no implementation found; **UNVERIFIED** = cannot establish from available evidence. Recommendations and proposed schemas below are future design, not deployed facts.


## Source-versus-documentation discrepancies

| Evidence | Finding and implementation consequence |
| --- | --- |
| docs/architecture.md:16–18 vs active package/source | DOCUMENTED ONLY React Query, React Hook Form, react-oidc-context; actual app uses React context/useState and oidc-client-ts. Do not port nonexistent frontend data layer. |
| README diagram/status prose | Some prose says UI not implemented despite checked-in full customer demo. App is implemented locally; business handlers/providers remain missing. |
| README target backend TypeScript | Existing direction; this request proposes Java21/Boot3 replacement, not evidence a TypeScript service exists. |
| archived package CDK/server/seed scripts | Referenced files absent. No deployable infrastructure stack, Express service, tesseract.js or OpenAI integration. |
| docs/reference fixture paths | fixtures/ absent; 47 files under case_source/kyc_documents. |
| README case PDF/PPTX listing | Files absent in checkout; their requirements cannot be audited. Obtain originals if they contain acceptance criteria beyond supplied guide. |
| prior private context says local AWS JSON available | Ignored infra-placeholder/aws-prototype-config.json absent at audit time. Do not fabricate or republish identifiers. .env.local variable names inspected, values withheld. |
| dataset requires valid active GST registration | Code checks hasGstin boolean only, no lookup. Explicit live hardening needed without silently altering demo parity. |
| docs server-generated pdf/S3/service tracking | Current PDFs client-generated; current status is order-level and services flatten active orders. Server snapshots/per-service activation new work. |
| docs pagination/history indexes | Adapter returns raw arrays, indexes only proposed. Coordinate contract additions and provision verified GSI before use. |
| scope/voice env variables | VITE_OIDC_SCOPE ignored; scope hardcoded. Setting voice env true does not enable any real voice implementation. |

## Questions requiring owner/account evidence

| Priority | Question / missing input | Safe prototype default / impact |
| --- | --- | --- |
| Blocking deployment | Actual API/Lambda/pool/client/table/bucket/distribution identifiers and read-back: runtime, table schemas/GSIs/TTL/PITR, bucket encryption/block-public-access/lifecycle/OAC, authorizer scopes, CORS, role policies, log retention and throttles | No new resource creation until inventory/adoption plan; deployment status UNVERIFIED in this audit |
| Blocking ownership design | One business per sub or multiuser memberships? Billing account mapping and authorized roles? | Single-owner customerKey=sub for first prototype, no assumed partner access; document schema migration path |
| Core pricing | Keep min price, illustrative18% recurring-only tax, setup outside total and no contract formula? Are statutory tax/pro-rata/operator tariffs needed? | Exact demo parity; no claim of live tax invoice/tariff or invented contract commitment |
| Core quote | Quote expiry/acceptance, price-change consent and persisted quote IDs? | Add optional IDs/expiry then coordinated checkout change; never trust client totals |
| KYC | Which document types/product requirements, consent notice/purpose/version, retention/deletion/legal hold, expiry/freshness/matching thresholds, reviewer ownership? | Mock-only clearly labelled;90days only fixture convention, no live document collection before policy |
| Provider | Digio/direct DigiLocker sandbox/live credentials, authorized document scopes, callback signing, provider terms/IDs and failure semantics? | Deterministic mock adapters; no fabricated real API payloads |
| GST/UDYAM | Authoritative live validation/registry source and reference vectors; permissible fixture markers? | Validate against supplied synthetic dataset in isolated fixture mode; lookup doesn't prove live taxpayer status |
| Specimens | Ground-truth K01–K12 outcomes, degradation/mismatch classifications? | OCR observations only; human-reviewed labels needed for strict tests |
| Payments/billing | Payment provider, statutory billing owner, invoice numbering/period/timezone, refunds/reconciliation and activation/proration policy? | Explicit demo invoice/payment mode with immutable snapshots; no real collection |
| Scheduling | Serviceability/slot inventory, technician/provider updates, per-service activation and cancellations/fees? | Future preferred slot only; no booking promise or customer activation endpoint |
| Authentication | Valid signed-in token/scope test, client ID/token settings, web callback/logout origins, renewal policy, Android public client/return URI? | Keep native login disabled; PKCE access tokens, no silent live fallback |
| Advisor | Provider/model/region/data handling, English/Hindi/regional quality, prompt evaluation and spend/token budgets? | Fake LLM tests and deterministic rules; direct HTTP abstraction provisional |
| Voice | Browser audio codec/duration, speech provider permissions, data retention and limited demo budget? | Disabled frontend/backend, questionnaire/text fallback; telephone Coming Soon |
| Operations | Who approves deployment/IaC adoption, staging account/isolation, rollout/rollback and spend alerts? | Documentation only; no resource changes made |
| CI/native | Java21/Maven/Android SDK availability and CI execution environment/browser? | Existing documented missing Android prerequisites; no APK claimed |

## Remaining technical uncertainties

No coverage report, backend security tests, actual AWS output logs, deployed configuration snapshots or infrastructure drift evidence. No checksum validator, catalogue importer/generation script, OCR mapping/test outcome manifest, domain schemas for persisted entities, ownership model, LLM evaluation corpus, webhook DTO, queue/worker or provider SDK versions. No current library patch/support compatibility or cold-start benchmark was established; pin/test Boot3/Java21 and Lambda adapter together at implementation. Missing information is not an invitation to infer deployment or vendor guarantees.

Recommended decisions can be reviewed from this handoff without repeating source discovery. Deployment/provider/retention decisions require human/account input; ordinary DTO/service implementation using the explicitly marked parity baseline can start independently. Source links/index and exact existing types/rule matrix are included to make the next agent's work concrete.
