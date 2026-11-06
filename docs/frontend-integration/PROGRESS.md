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
