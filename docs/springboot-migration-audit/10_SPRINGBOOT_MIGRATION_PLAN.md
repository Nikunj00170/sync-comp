# Spring Boot migration blueprint and roadmap

Audit date: 6 November 2026. Scope: repository evidence only; no AWS account inspection, deployment, application changes, or provider calls. Line references refer to the audited source snapshot.

Evidence labels: **VERIFIED IN CODE** = directly inspected implementation/data; **DOCUMENTED ONLY** = assertion/design in project documentation; **PARTIALLY IMPLEMENTED** = only some required behavior exists; **MOCKED** = local/synthetic behavior; **NOT IMPLEMENTED** = no implementation found; **UNVERIFIED** = cannot establish from available evidence. Recommendations and proposed schemas below are future design, not deployed facts.


## Architecture decision (recommendation, NOT IMPLEMENTED)

Create services/backend as an independent Maven Java21/Spring Boot3.x modular monolith, runnable as ordinary Spring Web locally and packaged with a thin Lambda HTTP API v2 adapter. Maven is independent of npm workspaces. Keep one API deployment plus later independent asynchronous worker entry point, shared tested services where sensible. Do not introduce microservices, SQL, cache or production cell infrastructure for prototype. AWS SDK for Java v2 DynamoDB Enhanced Client/S3/SQS/Textract; Jakarta Validation; Spring Security OAuth2 Resource Server; JUnit5/Mockito/Spring Boot Test. Evaluate direct HTTP LlmGateway first; Spring AI only after compatible Boot3 BOM/tool/schema behavior validation. No backend files are created by this audit.

Proposed dependency set: spring-boot-starter-web, validation, security, oauth2-resource-server, actuator (restricted endpoints), spring-boot-starter-test; AWS SDK BOM with dynamodb,dynamodb-enhanced,s3,sqs,textract,secretsmanager if chosen; aws-serverless-java-container-springboot3 and Lambda runtime interfaces in deployment profile; Maven compiler release21 and reproducible packaging, Surefire/Failsafe test split. Avoid JPA/Hibernate and Spring Data repositories pretending DynamoDB is relational. Pin compatible supported versions after a build spike. No exact artifact versions beyond required Java21/Boot3.x are established here.

## Proposed files/package structure

```text
services/backend/
  pom.xml
  mvnw, mvnw.cmd, .mvn/wrapper/       generated during implementation
  src/main/java/com/airtelsync/backend/
    SyncApplication.java
    config/                          AwsConfig, SecurityConfig, CorsConfig, AppProperties, ClockConfig
    controller/                      Profile, Catalogue, Quote, Recommendation, Order, Document,
                                     Kyc, Invoice, Payment, Support, Notification, Advisor controllers
    service/                         CatalogueService, EligibilityService, QuantityPolicy, CartService,
                                     QuoteService, RecommendationService, OrderService,
                                     OrderTransitionService, InvoiceService, KycService,
                                     DocumentService, AdvisorService, ConsentService
    repository/                      CustomerRepository, OrderRepository, ActivityRepository,
                                     ConversationRepository, dynamodb/* implementations
    model/                           domain types/statuses and persistence entities
    dto/                             requests/responses matching02 plus proposed integration DTOs
    mapper/                          wire↔domain↔Dynamo mappings, snake_case fixture mapping
    security/                        CognitoTokenValidator, CurrentCustomer, MembershipService
    integration/                     llm/LlmGateway, speech/SpeechGateway, kyc/KycProvider,
                                     registry/RegistryGateway, ocr/OcrGateway, payment/PaymentGateway
    exception/                       ApiExceptionHandler, error types/codes
    validation/                      GstinValidator, UdyamValidator,
                                     ProfileValidator, UploadValidator
    lambda/                          ApiStreamHandler; later document/DocumentWorkerHandler
  src/main/resources/
    application.yml, application-local.yml, application-lambda.yml
    catalogue/case-2026-07-v1.json
    prompts/advisor/system-v1.txt
    contracts/                       reviewed OpenAPI/JSON schemas
  src/test/java/...                  domain, security, API, repository, integration tests
  src/test/resources/                golden vectors, fixture-clock data, provider events
infra/                              future adopted-resource CDK or chosen IaC, not current code
```

The package listing is illustrative, not generated Java. Prefer constructor injection and interfaces only at real transport/repository/provider boundaries. Services remain usable in JVM tests without Lambda. Inject Clock and catalogue version. Use Java long checked arithmetic/explicit rounding, Instant timestamps, lowercase JSON enum mappings and DTOs preserving existing names. Avoid directly serializing persistence entities/PK/SK.

## Compatibility/migration map

03 maps every exported TS function/type to Java. Controllers implement02's seven adapter operations first, retaining raw arrays and response bodies. Server quote loads owned profile (POST body lacks one). Checkout needs a NEW create-order endpoint; quote API alone cannot submit an order. Existing Quote no ID/expiry/version-lock protocol beyond catalogue version; add optional quote reference through coordinated client work. Server document metadata/async statuses extend existing Kyc/DocumentMeta rather than pretending current pending/demo_verified is sufficient.

Keep unchanged: React/Router/Capacitor shell, routes, accessible modal, styling/assets, catalogue browsing/filter/compare, preview formatting, local demo and TS domain tests. Update: explicit live repository and session token lifecycle, Account save/load, Discover server recommendations, Checkout create/quote, Orders/Services state mutations, Verification upload+consent+status, Billing empty states/payments/snapshot fetch, Support and App notifications. Update API error parsing, pagination, idempotency/version/capability behavior. Do not use all current setData mutations in live mode.

Reuse AWS after verification: Cognito pool/public web client, Gateway endpoint/authorizer, Dynamo tables, private document/website buckets and CloudFront. Modify: Java function/package/runtime/role, Gateway integration/routes/invoke permission/CORS, table history indexes, logs/metrics, secret config; later queues/worker/Textract. Mobile client/callbacks new. Existing Node diagnostic can be retired only once equivalent operational checks exist; health behavior can be reproduced. No Node business service exists to discard. Keep Node toolchain for React/Vite, Capacitor, tests and any future CDK TypeScript; archived scaffold stays archival, not a migration base.

## Ordered implementation phases

All files listed below are proposed creation targets. Existing sources are read-only references until implementation is explicitly requested. Phase ordering follows requested roadmap, but deploy a staging thin slice early; payments/voice/provider accounts are not prerequisites for profile→quote→mock KYC→order→tracking prototype.

| Phase | Files to create | Existing references | Dependencies / endpoints | Completion criteria / required tests |
| --- | --- | --- | --- | --- |
| 1 Backend foundation | services/backend/pom.xml, wrapper, SyncApplication, config/AppProperties/ClockConfig, exception/ApiExceptionHandler, dto/*, lambda/ApiStreamHandler, contracts/OpenAPI | root/package.json for separation; api.ts; domain types; infra diagnostic | Java21/Maven, compatible Boot3; GET /health | mvn verify, ordinary local server and HTTP APIv2 adapter package start, JSON/error casing contracts; no provider credentials |
| 2 AWS/database | config/AwsConfig, repository/interfaces+dynamodb/*, model persistence maps, resource catalogue, future infra/adoption inventory | config example, api/index.mjs, docs/architecture:89; shared/data/catalogue.json | Phase1 + verified AWS schema/config; internal repositories and GET /v1/catalogue | Scoped role credentials connect; exact key/GSI pagination/conditional writes tested with local emulator; staging read-back separate; no duplicate resource creation |
| 3 Authentication | config/SecurityConfig/CorsConfig, security/CognitoTokenValidator/CurrentCustomer/MembershipService, ProfileController/service | auth.ts/api.ts, Cors templates, .env.example | Phases1–2 + actual pool/client/callbacks; GET/PUT /v1/me, protected /auth-check | Signed access token succeeds, expired/wrong client/token_use denied, A/B isolation and browser CORS; deliberate reauth UX |
| 4 Core business APIs | Catalogue/Eligibility/Quantity/Cart/Quote/Recommendation services/controllers; snapshot repositories; parity fixtures | domain/src/index.ts all exports and tests, Discover/Plans/Checkout | Phases1–3; POST /v1/quotes,/v1/recommendations; catalogue | Exact parity across all25 catalogue rows/boundaries, price paise and setup/tax behavior; saved profile required; live preview uses authoritative result |
| 5 AI advisor | AdvisorController/Service, ConversationRepository, LlmGateway HTTP/fake, extraction schemas and prompt resources | Discover and App Coming Soon;07 | Phases3–4; /v1/advisor/sessions and turns | Typed session persistence, missing-field/confirmation logic, deterministic tools; English/Hindi/ownership/rate/injection/failure tests; provider model/budget chosen before live calls |
| 6 Smart KYC | Document/Kyc controllers/services, Consent/Upload/Gstin/Udyam validators, mock registry adapters, worker, S3/SQS/Textract adapters and queue IaC | Verification, case_source guide/47images, mock registry JSON/CSV | Phases2–3; upload/complete/status/consent/lookup/verify endpoints in02 | Private upload→durable job→OCR/checks→status using mock providers; duplicate/DLQ/mismatch/fixture-clock tests; no mock→live approval, retention before live |
| 7 Orders/billing/payments | Order/Transition/Invoice/Payment/Support/Notification services/controllers/repos, provider webhook guards, PDF snapshot generator | domain order/invoice rules, Orders/Services/Billing/Support/downloads | Phases3–4 and6 for checkout; POST /v1/orders, GET lists/detail, cancel/appointment/service/activity, invoices/payment/tickets | One end-to-end persisted mock journey, concurrent/idempotent order creation, owned histories, immutable invoices, replay-safe mock payment; actual payment provider optional and separately gated |
| 8 Voice | SpeechGateway Sarvam/fake, VoiceSessionService/Controller, capability/admission config and typed fallback UI | App/Dashboard, docs/architecture:105;07 | Phase5 + tested credentials/budgets/consent; GET capabilities, proposed POST /v1/voice/sessions and /{id}/turns | Flags enforced server-side, short audio turns reuse advisor tools, permission/provider/rate failure fallback; plan4–5 actual browser demos only after validation; no outbound calling |
| 9 Deployment/testing | adopted-resource IaC, staging/release workflow, operational runbook, packaged Java artifact, contract/live E2E and native checks | infra handoff, root scripts, Playwright/Android config | All selected phases; full /v1 routes plus queue worker | Auth/upload/mocked business journey on staging, cold/warm latency below agreed budgets, scope/ownership/IAM read-back, logs/retention/spend controls, rollback, Android build/device where supported |

Voice endpoint payloads are future design: create {advisorSessionId,language}→{id,status,expiresAt}; turn input owned session+bounded audio reference and clientTurnId→AdvisorTurn with optional short-lived audio URL. Codec/duration/size/provider limits remain undecided; do not expose unrestricted presigning/audio streaming. No implementation or capability promise exists.

## Smallest usable prototype and cutover

First deliver authenticated profile→server quote with deterministic catalogue. Then mock KYC with real private file transfer→persisted order→tracking→immutable demo invoice and simulated payment. Chat can follow this slice; voice and real payments are optional later gates. Select reviewer/manual approval handling without inventing partner UI. Before cutover, confirm unknown resource state, export approved metadata/config (no secrets), adopt resources carefully, test new Java alias and both valid/invalid tokens. Switch API integration with reversible rollback; keep old diagnostic separately if useful. Do not delete tables/buckets/pool/old function in a code migration. No provisioning, application code edits or deployments are authorized by this audit request.
