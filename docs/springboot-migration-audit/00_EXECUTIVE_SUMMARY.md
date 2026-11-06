# Executive summary

Audit date: 6 November 2026. Scope: repository evidence only; no AWS account inspection, deployment, application changes, or provider calls. Line references refer to the audited source snapshot.

Evidence labels: **VERIFIED IN CODE** = directly inspected implementation/data; **DOCUMENTED ONLY** = assertion/design in project documentation; **PARTIALLY IMPLEMENTED** = only some required behavior exists; **MOCKED** = local/synthetic behavior; **NOT IMPLEMENTED** = no implementation found; **UNVERIFIED** = cannot establish from available evidence. Recommendations and proposed schemas below are future design, not deployed facts.


## Current architecture and status

| Area | Evidence and finding |
| --- | --- |
| Customer web | VERIFIED IN CODE: React 19.3.1, Router 7.18.5, Vite 8.3.6, TypeScript 7.0.2; ten page modules; hash routing; device-local workspace. |
| Android | PARTIALLY IMPLEMENTED: Capacitor 8.6.0 project, package com.airtelsync.customer, SDK 36/minimum 24. APK/device operation UNVERIFIED; missing build prerequisites documented. |
| Business rules | VERIFIED IN CODE: packages/domain/src/index.ts; Zod 4.6.7, 25-product catalogue, eligibility, OR dependencies, deterministic recommendations, quote arithmetic, demo order/invoice creation. |
| Business operations | MOCKED: profile, checkout, verification, orders, service changes, payments, support and notifications stored locally. |
| Backend | VERIFIED IN CODE: infra-placeholder/api/index.mjs returns static health for HTTP requests and runs private storage diagnostics for direct invocations. No business route dispatch or JWT validation in Lambda. |
| API boundary | PARTIALLY IMPLEMENTED: seven typed /v1 adapter operations. Only Account.checkConnection calls GET /v1/me, discarding returned profile. None of these routes implemented server-side. |
| AWS | DOCUMENTED ONLY: manually provisioned Mumbai HTTP API, Lambda, Cognito, three DynamoDB tables, private website/document S3 buckets, CloudFront and logs. Reported diagnostic successes are recorded in infra-placeholder/README.md; no independent deployment output/account read-back available. |
| IaC/providers | NOT IMPLEMENTED: CDK stack, document worker, SQS/DLQ, Textract workflow, real KYC/payment/LLM/speech adapters, CI/CD and authoritative customer repositories. |

This is primarily a backend implementation project with a small diagnostic-runtime migration, not a port of an existing Node business service. Keep the React/Capacitor app and TypeScript display/demo domain package. Build a Java 21 / Spring Boot 3.x modular monolith using Maven, Spring Web/Security/Resource Server, Jakarta Validation, AWS SDK v2 Enhanced DynamoDB Client, S3 and later SQS/Textract. Pin a compatible maintained Boot 3.x patch and dependencies at implementation time; no version is selected by this audit.

## Recommendation (inference from repository)

Start with Spring Boot on Java Lambda using AWS Serverless Java Container and HTTP API v2 proxy events. Retain existing API domain, Cognito, S3/CloudFront and table resources after read-back. Deploy a new function/alias for reversible integration switching; do not overwrite the only diagnostic before a smoke test. Measure cold startup against the client's 15-second timeout. Evaluate SnapStart only against current runtime/architecture constraints. Fargate adds VPC, service, registry and networking work and recurring capacity for a low-usage prototype; reserve it for demonstrated sustained API demand or long-lived voice/media needs. See 04 for comparison and primary references.

## Decisions that must remain explicit

- Preserve the seven adapter response bodies, especially raw Order[] and Invoice[] arrays. Pagination envelopes require coordinated frontend changes or a new contract.
- All money fields are integer paise except Profile.budget, which is whole INR. Quote total = monthly + rounded 18% illustrative recurring tax; setup is separately reported. priceMax and contract months do not influence totals.
- Keep current deterministic recommendation behavior as parity baseline; budget is not a hard filter. Do not silently impose segment rules or validated-GST requirements while claiming an exact port.
- Server must own identity, ownership, catalogue prices, verification, state changes, invoice snapshots and payment outcomes. Demo verification must never authorize live checkout.
- Start single-customer membership, three DynamoDB tables, mock providers and typed advisor turns. Do not build documented million-user cells/SQL/cache/search before a working prototype.

## Read order and unresolved input

Read 02 and 03 first for contracts/rules, then 04–06 for infrastructure/security, 07–08 for proposed integrations, and 10 for implementation sequence. 11 lists blockers/decisions: resource read-back, tenant/billing model, KYC/provider policies, tax/contract semantics, LLM budget/model, mobile return URI, deployment and retention. The original case PDF and submission PPTX mentioned in README are absent from this checkout. No secrets or local deployment identifiers are reproduced.
