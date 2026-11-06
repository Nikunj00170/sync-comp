# Backend completion log

## Audit — 6 November 2026

Branch: `feature/backend-api`. Existing working tree contained uncommitted catalogue,
quotes, profile, error DTOs and Cognito authentication. Baseline Java 21 Maven verify:
142 tests, 3 failures, 0 errors, 0 skipped (all failures in profile updates).

The domain layer already implements catalogue, eligibility, carts, recommendations,
quotes, demo order transitions and invoice snapshots. The canonical catalogue is
shared with TypeScript. The frontend has seven HTTP adapter operations; checkout,
KYC and support are still local demo flows. No frontend rewrite is needed.

Critical finding: profile persistence keyed by email, email fallback lookup, updates
requiring a nonexistent subject record, and ownership tests issuing identical
subjects for two customers. Quote totals also require review at high valid quantities.

AWS infrastructure is not verified. Deployment is explicitly outside this task.
Real KYC/provider processing and payment integrations require external services;
demo verification must remain explicitly gated and cannot authorize real purchases.

## Phase 1 — API and identity foundation

Retained and reviewed existing uncommitted API/JWT work. Profiles are now stored
only by authenticated `sub`, without email lookup; PUT creates or replaces contact
information, which does not control identity. GET before the first PUT returns
unsaved onboarding defaults; empty fields indicate the customer must finish setup.
Profile trim/required rules follow the TypeScript schema. Phone is a free string as
in that schema. Null cart entries and null priorities are rejected. JWTs require
nonblank subject and expiration. Security uses stateless bearer authentication.
Tests use distinct subjects including identical emails to exercise isolation.
