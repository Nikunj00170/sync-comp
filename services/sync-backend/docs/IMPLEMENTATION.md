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

Phase 1 verification: 140 tests, 0 failures/errors/skips; Java 21 clean verify.

## Phase 2 — Orders, invoices and recommendations

Added the three remaining read APIs with customer isolation and bounded pagination
(array response preserved; `X-Next-Cursor`, `limit`, `after`). Added demo checkout
with explicit consent and `Idempotency-Key`, cancellation and recommendations.
Checkout atomically saves the order, immutable invoice snapshot, notification,
idempotency response and conditional KYC version. Demo actions default to disabled.
All customer records use a repository port with atomic conditional transactions.

Fixed an additional domain bug: tax multiplication overflowed a Java int even at
moderate totals. Integer paise now uses long arithmetic and exact rounding, keeping
the existing 18% formula and separate setup charges. Large valid quantities have
a regression test. API monetary JSON fields remain numbers.

Phase 2 verification: 147 tests, 0 failures/errors/skips; Java 21 clean verify.

## Phase 3 — Private documents and KYC

Upload authorization preserves the adapter's `uploadUrl` and `documentId` fields.
The added completion endpoint checks stored size and MIME metadata before attaching
it to KYC. Local content upload requires the owning customer's bearer token and
reads at most the authorized size plus one byte. Uploads expire after five minutes,
are limited to eight reservations, and cannot overwrite content. KYC consent,
provider selection, revocation and demo verification are customer-scoped and audited.
Changing documents or consent invalidates demo verification. No live verification is
claimed; demo verification requires `SYNC_DEMO_ENABLED=true`.

Phase 3 verification: 153 tests, 0 failures/errors/skips; Java 21 clean verify.

## Phase 4 — Support and notifications

Added ticket creation, list/detail and customer resolution using the existing UI
fields; notifications are created atomically with tickets and checkout. Notification
read state and all ticket operations enforce authenticated ownership. Lists use
bounded pagination. Demo order advancement requires both trusted admin scope and
the demo flag and operates only on that principal's records. No external support
message or payment is sent.

Phase 4 verification: 155 tests, 0 failures/errors/skips; Java 21 clean verify.

## Phase 5 — AWS persistence and object storage adapters

Added AWS SDK v2 DynamoDB and S3 adapters behind the existing application ports.
DynamoDB uses strongly consistent keyed reads, bounded prefix queries and atomic
conditional transactions; it never scans. Customer records are separate items,
so orders and activity do not accumulate in an unbounded customer document.
Unconditional profile updates atomically increment the revision. S3 authorizations
expire after five minutes, bind content metadata and require `If-None-Match: *` to
prevent replacement. Completion verifies private object metadata with HeadObject.

These adapters require configured existing infrastructure; no resource was created
or deployed and no real Cognito/AWS integration test is claimed. Tests exercise
request construction, failure mapping and real local URL signing with fake keys.
