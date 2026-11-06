# Frontend integration and localization

Branch: feature/frontend-integration-i18n, based on origin/main (589de2e).

## Phase 1: audit

Reviewed the React/Capacitor app, Spring APIs and environment examples, shared
catalogue/domain, OIDC login, voice assistant, existing unit and browser tests.
The newer assistant implements hands-free conversations, language detection,
Gemini key/quota fallbacks and cleanup. Provider secrets stay server-side.

Baseline: production build passes, 15 frontend/domain unit tests pass and all
21 sales/voice service tests pass. The backend's merged CI passed 180 tests.

The frontend still mutates local demo state after login. Cloud integration must
load real records, preserve access-token auth/refresh, follow pagination, upload
actual file bytes, and use server quotes and checkout. Payments, subscription
changes and installation rescheduling lack backend endpoints and must remain
local-demo-only controls. Cloud failures must not create local demo successes.

Plan: integrate authenticated API operations and state/actions, test the real
Spring/React flow plus existing demo/assistant on desktop and mobile, then add
English/Hindi and additional translated UI with a persistent language selector.
Live AWS/Cognito/provider tests require configured infrastructure; local integration
will use real JWT signatures and Spring HTTP endpoints with test-only signing keys.

## Phase 2: frontend/API integration

Implemented API-backed profiles, saved recommendations, server checkout quotes,
idempotent orders, invoices, document-byte upload/completion and pending-reservation
cleanup, KYC consent/demo verification, tickets/resolution and notification reads.
Collections follow all pagination cursors. Access tokens renew through OIDC, stay
in sessionStorage (never localStorage), and logout/account changes clear records.
Configured cloud mode never seeds or persists the local demo workspace. Local
cart/preferences remain separate from server-owned records; unsupported cloud
payment, rescheduling and subscription simulation controls cannot change records.

Assistant suggestions can populate a bundle only after canonical product,
quantity, eligibility and quote checks; model-supplied prices never set checkout
totals. Voice recording/session cleanup remains intact. A separately configured
voice API URL supports deployments without leaking Cognito credentials to it.

Verification: production build, 19 unit tests and the 16 existing desktop/mobile
browser tests passed. Six additional desktop/mobile full-stack tests passed using
an actual Spring HTTP server, locally signed JWTs, real upload bytes and persisted
backend records. They cover profile → recommendations → KYC → checkout → invoice,
reload, support, cross-customer isolation, API failure without demo fallback and
101-ticket pagination. These tests do not claim live Cognito/AWS/provider coverage.
The backend's Java 21 clean verify also passed all 180 tests after adding the
test-only HTTP harness. Test signing configuration is excluded from production.

## Phase 3 checkpoint: localization and delivery checks

Implemented English, Hindi and Marathi UI dictionaries, persistent language
selection, localized navigation/forms/status/date/currency, canonical API values,
Devanagari web/PDF fonts and Unicode-preserving invoice exports. Added browser,
dictionary-coverage and PDF tests, explicit voice enablement, isolated test ports
and a frontend/full-stack CI workflow. Updated customer setup documentation.

Verified before this checkpoint: production build and 23 unit tests pass; both
Hindi/Marathi mobile language flows pass using touch input; eight local full-stack
tests passed before the last canonical-selection/CORS adjustments. The Android
SDK was found and an Android debug APK build succeeded after setting ANDROID_HOME.
Final combined browser/full-stack reruns and the new default-development-CORS test
were pending when the project case/data audit was requested. This checkpoint does
not claim live AWS, Cognito, provider or device-runtime verification.
