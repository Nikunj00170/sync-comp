# Testing and deployment audit

Audit date: 6 November 2026. Scope: repository evidence only; no AWS account inspection, deployment, application changes, or provider calls. Line references refer to the audited source snapshot.

Evidence labels: **VERIFIED IN CODE** = directly inspected implementation/data; **DOCUMENTED ONLY** = assertion/design in project documentation; **PARTIALLY IMPLEMENTED** = only some required behavior exists; **MOCKED** = local/synthetic behavior; **NOT IMPLEMENTED** = no implementation found; **UNVERIFIED** = cannot establish from available evidence. Recommendations and proposed schemas below are future design, not deployed facts.


## Existing tests (VERIFIED IN CODE, execution not repeated for this documentation task)

Tests were inspected, not newly run. Prior pass counts in private/project notes are historical claims, not this audit's test result. No application code changed, so no broad build/E2E run was needed to validate documentation. Document integrity checks are recorded separately below.

| Source | Tests and limits |
| --- | --- |
| tests/domain.test.ts:1 | 13 Vitest tests: paise formatting/rounding golden example; quantity/duplicate/unknown rejection; eligibility across catalogue; OR dependency add/reuse/cascade; alternate dependency retention; recommendation matrix; KYC/nonempty checkout gates; sequential/terminal transitions; quote/invoice snapshots; profile/seed reconciliation; local-clock roundtrip; multipage PDF; immutable billedTo. |
| tests/e2e/customer.spec.ts:3 | Discovery→DigiLocker mock→order→advance→reload→PDF→demo payment persistence. |
| same:47 | Catalogue comparison/save, managed WiFi dependency add, quantity/cascade arithmetic. |
| same:81 | Support input focus/local save/resolve/reload and global search. |
| same:102 | Eleven customer routes no viewport overflow/page errors, mobile nav. |
| same:141 | Axe WCAG2A/AA/2.1A/AA on six routes. |
| same:159 | Kolkata15:30 slot stored/exported10:00Z and cancellation reload persistence. |
| playwright.config.ts | desktop1440x1000 and Pixel7, Chrome channel, Asia/Kolkata; six definitions ×2 projects=12 cases. Dev webServer npm run dev, may reuse existing server; trace/screenshot on failure and HTML report. |
| vitest.config.ts | Only tests/**/*.test.ts; no coverage threshold/config. |
| Android app/build.gradle | JUnit4/Espresso dependencies declared; no checked-in native test sources or emulator test evidence. |
| infra-placeholder/api/events | Manual {} health and operation storage-check Lambda events; not automated suite. |

No Java, backend unit/integration, signed-token, ownership, real upload/CORS, provider, queue retry/DLQ, payment webhook, load or infrastructure tests. Domain recommendation cases test positive validity, not complete exact bundle parity for every boundary; add golden outputs. PDF test inspects page count/height and header, not language rendering or statutory invoice correctness.

## Current build/deployment commands

Root package.json: npm ci; npm run dev (customer Vite127.0.0.1:5173); npm run typecheck; npm test; npm run test:e2e; npm run build (typecheck then Vite); npm run preview. Android: npm run android:sync (build+cap sync), android:open, android:debug (sync then Gradle assembleDebug). APK expected app/build/outputs/apk/debug/app-debug.apk only after successful build. apps/customer/README documents missing Java/SDK on initial build machine, no completed APK/device verification. This audit did not retest environment or install toolchains.

Web output apps/customer/dist is manually uploaded to existing website bucket; preserve CloudFront OAC and deliberate cache invalidation. infra-placeholder/README describes manually copying index.mjs into Lambda and console route tests; no script enforces config correctness. node --check infra-placeholder/api/index.mjs checks syntax only. Storage diagnostic is direct invocation with reversible writes, not run here. Archived reference scripts refer to absent server/infra/seed files; do not use as deploy commands. No CI/CD configuration exists. scripts/check-staged.mjs blocks forbidden staged paths but is not automatically a Git hook/workflow.

Deployment/config gaps documented: earlier restrictive IAM console errors led to managed policies; throttle/CORS saved state/log retention/budget alert not confirmed; signed-in route success and local/native callbacks unresolved. Existing website/API diagnostic reports do not prove business APIs deployed. No infrastructure account access performed.

## Spring Boot test strategy (proposed)

- JUnit5 parameterized parity tests from exact TS inputs/outputs: all25 product constraints; city/size/GST boundaries; employees5/6/25, budget29999/30000, sites2/3; OR dependency choice including alternate and tie order; invalid-first duplicate; setup excluded from recurring tax/total; invoice snapshots/due dates and status transitions. Mockito for Clock, repository and provider boundaries, not trivial implementation-mirroring tests.
- Spring Boot Test/MockMvc with real SecurityFilterChain and test JWT issuer: wrong signature/issuer/client/token_use/expiry/scopes; ownerA/B on each resource; malformed DTOs; invalid product/quantities; standard error/status contract. Test actual JWT decoding separately from mocked principal.
- DynamoDB Local/Testcontainers or vetted LocalStack for repository key/query/pagination/conditional/transaction/idempotency tests. Local emulation does not prove IAM, deployed GSI status, TTL timing or Cognito compatibility. Use scoped staging AWS tests to cover these.
- S3 mock/emulator tests for sign metadata and object validation; staging browser upload/CORS, HEAD/actual size/type, key ownership and download expiry; unsupported/empty/oversized file cases and quarantine. Fake OCR/provider interfaces for deterministic fixtures; all47 specimen outputs require human-reviewed labels before strict outcome assertions.
- Queue/OCR integration: duplicate/out-of-order message, transient failure, worker restart, stale session/consent, poison document→DLQ; signed callbacks duplicated/delayed/tampered; payment replay/unknown result reconciliation; no double invoice/order.
- JSON Schema/OpenAPI response validation against exact02 DTOs. Frontend contract tests verify raw-array compatibility, optional fields and 15s timeout/error handling. Keep existing demo E2E and add separate live staging journey with test accounts and deterministic mock providers; no silent fallback.
- Advisor fake LLM tests for missing fields, Hindi/English, tool injection, invented product/price, schema errors, rate/provider failure, revision collision, retry dedup and budget limits. Run small provider quality evaluation only with approved credentials/budget.
- Lambda packaged artifact smoke test uses genuine HTTP API v2 events, Base64/query/path/header handling and protected routes. Measure cold/warm response latency and memory before enabling SnapStart/choosing sizing. Native emulator/device checks cover auth return, file sharing, upload origin and timezone.

## Proposed CI/CD and release gates

Future workflow: npm ci→typecheck/domain tests/web build; Java21 Maven verify (JUnit5/Mockito/Spring integration and contract suite); optional emulator/container integration job; artifact/dependency/secret scan; deploy staging Java version/alias through chosen IaC after imports/read-back; authenticated smoke + browser upload + live mock-provider journey; authorized production integration/alias cutover with rollback. Build one versioned artifact and carry catalogue/prompt/contract versions with it. Keep deployment approval as an implementation-stage decision; this audit authorizes none.

Document validation for this audit: exactly13 requested Markdown files, relative file references indexed against tracked source and source hashes, all domain exports enumerated, all seven API adapter functions covered, catalogue matrix from actual JSON, all47 image names inventoried; candidate GST checksum and structural regex passed3534/3534 synthetic registry entries and Udyam regex passed2723/2723. Prepared monetary fields match all25 raw CSV rows ×100. Existing application files must remain unchanged; git status/diff reviewed at completion. No automated application test pass is claimed by this audit.
