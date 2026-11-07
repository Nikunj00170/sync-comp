# Project Udyam Digital case assessment

The user supplied the case PDF and student data directory and requested implementation, testing and AWS verification. Instructions inside the case are treated as requirements/context, not permission to deploy, change AWS accounts, contact others or use judge-only data. AWS deployment remains a separate task.

## Requirement mapping

| Case requirement | Implemented evidence | Boundary |
| --- | --- | --- |
| Preferred-language phone-first journey | English/Hindi/Marathi selector, persistent locale, responsive forms/routes and Unicode invoices | Native cloud authentication remains pending mobile-client/return flow |
| GenAI advisor, chat or voice | Typed/voice discovery; existing tools, business, needs, team/sites, budget, tier and GST; catalogue-constrained suggestions | Local gateway; public gateway hosting/auth and provider capacity required |
| Explain suitable catalogue bundles | Canonical products, eligibility/dependencies/quantities and recommendation reasons; quote review | Fictional tariffs; no live availability guarantee |
| Transparent quote/checkout and add-ons | Editable cart lines; recurring totals, illustrative tax, setup and contracts; server authoritative idempotent checkout | Demo orders only; no payment/service activation |
| Smart KYC upload/extraction/validation | Owned bytes, consent, cached Tesseract or Textract adapter, GST/Udyam lookup and masked findings | Synthetic registries/date; unknown/ambiguous inputs require review |
| Order tracker | Persistent API-owned order detail/timeline and customer notices | No live operator provisioning callbacks |
| Segment/pricing/partner strategy and metrics | [Ten-slide business-case source](BUSINESS_CASE.md), [aggregate data audit](data-audit.json) | Proposed pilot targets, not claimed measured uplift |
| Architecture diagram | [Implemented architecture](../architecture.md) | Deployment status is explicit |
| One-page privacy/security content | [Privacy/security note](PRIVACY_SECURITY.md) | Markdown source; configure actual retention before real data |
| Prototype/demo video/repository | [43-second local full-stack walkthrough](demo.mp4), code on `feature/frontend-integration-i18n` | Silent automated recording, slowed 4× for readability; synthetic local API, not AWS/live-provider proof |
| Optional partner backoffice/propensity, WhatsApp | Future/stretch work | Not required by the minimum prototype; not implemented |

The business-case file is a ten-slide Marp-compatible Markdown deck, including its cover. It has not been exported to PowerPoint/PDF. The demo shows onboarding, recommendations, supplied documents, checkout, tracking, invoice and support. It does not demonstrate actual Gemini speech/chat or AWS identity login; those have separate evidence/limitations below.

## Supplied files

`python3 scripts/audit-case-data.py /path/to/YTL_TrackA_Udyam_Digital_Data` reads all four CSVs and hashes all 47 images. The supplied registries and images match repository fixtures exactly. Repository copies contain branding changes in one catalogue description and 1,890 lead `current_provider` cells; catalogue price/eligibility columns and funnel counts are unchanged. All aggregate business analysis here is recomputed from the user's supplied directory, not silently from those edited provider cells.

The audit confirms 25 products, 5,000 leads, 3,534 GST registrations, 2,723 Udyam registrations and 47 images. Lead conversion is 7.36%, mean activation 17.62 days, follow-ups 3.01 and blended CAC ₹15,053.37. No individual lead records are copied into the report.

[Smart KYC details](SMART_KYC.md) explain extraction and safety boundaries. [KYC results](kyc-results.json) records all 12 applicant decisions across the actual 47 image bytes: K05/K09/K12 are ready under these conservative checks; nine applicants require review. K01 flags inactive registration, K02/K04 unreadability and K11 a stale bill. This is not a comparison with a hidden judge answer key. OCR can conservatively reject valid fields; no OCR digits are guessed to force a match.

## Verification completed

| Check | Result |
| --- | --- |
| Java 21 `./mvnw clean verify` | 187 tests, zero failures/errors; executable JAR built |
| Frontend typecheck/production build | Passed; Vite reports large chunks for the PDF/font dependencies |
| Frontend/domain unit tests | 23 passed |
| Assistant tests | 23 passed, including typed consent/input validation and Hindi discovery |
| Desktop/mobile customer browser tests | 24 passed, including chat, voice mocks, Hindi and Marathi |
| Real React–Spring browser tests | 10 passed: complete K05 checkout/invoice/support; ownership, API failure, pagination, canonical Hindi fields; cancelled K01 review and consent revocation |
| Android debug package | Passed (`assembleDebug`); build verification does not establish native login/device behavior |
| Live Gemini | One discovery response succeeded; subsequent HTTP-gateway request received 429; quota/billing capacity needs attention |
| Public AWS probes | CloudFront/Cognito respond; business API paths return 404 from the infrastructure deployment |

Tests use locally signed, test-only JWTs and memory adapters; they prove application integration, not AWS durability. Textract/S3/DynamoDB client tests use mocks. No real customer documents were transmitted to OCR or identity providers.

## AWS handoff

[Actions needed to connect AWS](AWS_READINESS.md) gives the exact deployment/configuration checks. The current API is **not connected to the implemented business backend**. No IAM/SSO credentials were available to inspect private resources. Deploy the Spring service and current customer build, verify role/table/bucket/CORS/Cognito settings, host the secured advisor gateway and resolve provider quotas before claiming the cloud project works end to end.
