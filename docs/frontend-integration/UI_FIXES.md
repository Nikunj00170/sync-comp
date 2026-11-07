# Frontend fixes — 7 November 2026

All work is on `feature/frontend-ui-fixes`, with one commit for each requested fix.

1. Live account controls follow Cognito authentication independently of API availability.
2. Removed the technical API-connected success message from the live account panel.
3. Business priority choices use 18px controls, spaced touch targets and responsive columns.
4. The business workspace card opens the editable account profile and closes mobile navigation.
5. Checkout offers a browser-only payment simulation with decline/retry, order tracking and saved demo receipts. No payment credentials, gateway or payment API is used. Cloud orders still use the existing order endpoint; invoice simulations never change server payment status.
6. KYC throttling leaves the Cognito session intact. Reads use bounded retries/concurrency, token renewals are shared, and document completion can resume without sending stored bytes again. Permanent session revocation still requires sign-in.

Validation: production build, 31 unit tests, 30 desktop/mobile browser tests, and 14 React–Spring integration tests. Four account layout/navigation tests were repeated after the final mobile navigation correction. Tests cover failed payments, persisted tracking/receipts, account isolation, upload completion 429, and transient/revoked token renewal.

Cloud tests use the real local Spring backend and test JWTs; transient errors are injected deliberately. Live AWS/Cognito behavior has not been verified by an interactive login in this change. Hosted frontend changes require deployment. Controlled server demo order/KYC endpoints require `SYNC_DEMO_ENABLED=true` and `KYC_MODE=mock`; the frontend does not bypass these settings or approve invalid documents.
