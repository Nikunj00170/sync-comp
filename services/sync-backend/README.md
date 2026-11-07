# SYNC backend

Java 21 / Spring Boot 4.1.2 modular monolith serving the existing React and
Capacitor applications. All seven existing customer API adapter operations are
implemented. Checkout, KYC, recommendations, tickets and notifications have
additional documented APIs. The customer frontend now uses these APIs; see the root full-stack browser test runner.

## Run and verify

From this directory, with Java 21 selected:

```sh
./mvnw clean verify
./mvnw spring-boot:run
```

On macOS select Java 21 with `export JAVA_HOME=$(/usr/libexec/java_home -v 21)`.
Public smoke checks:

```sh
curl http://localhost:8080/health
curl http://localhost:8080/v1/catalogue
```

Without Cognito configuration the app starts, public GET routes work, and all
protected requests fail closed with JSON 401. In-memory data is empty at startup
and is lost on restart. There are no seeded customers, orders or invoices.

## Configuration

Export environment variables; [.env.example](.env.example) is a reference and is
not loaded automatically by Spring.

| Variable | Default / purpose |
| --- | --- |
| COGNITO_ISSUER_URI | Optional override; otherwise derived from COGNITO_USER_POOL_ID and AWS_REGION |
| COGNITO_USER_POOL_ID | Existing Cognito pool ID |
| COGNITO_CLIENT_ID | Required Cognito access-token client_id |
| SPRING_PROFILES_ACTIVE | Set `aws` for DynamoDB/S3; omit for local memory |
| KYC_MODE | `mock`; demo operations also require explicit opt-in |
| SYNC_STORAGE | `memory`; set `dynamodb` for durable records |
| SYNC_DOCUMENTS | `memory`; set `s3` for private document storage |
| SYNC_KYC_OCR | `fixtures` for supplied specimen bytes, or `textract` for supported images with IAM permission |
| SYNC_DEMO_ENABLED | `false`; explicit opt-in for simulated checkout/KYC |
| SYNC_PUBLIC_BASE_URL | `http://localhost:8080`; local upload URL origin |
| FRONTEND_ORIGIN | Existing CloudFront origin; used for cloud CORS |
| SYNC_CORS_ALLOWED_ORIGINS | Override FRONTEND_ORIGIN; local default `http://localhost:5173,http://127.0.0.1:5173,capacitor://localhost,http://localhost` |
| AWS_REGION | SDK region when AWS adapters are enabled |
| CUSTOMERS_TABLE, ORDERS_TABLE, ACTIVITY_TABLE | Existing customer, order/invoice, and activity tables |
| SYNC_DYNAMODB_TABLE | Optional single-table fallback |
| DOCUMENTS_BUCKET | Existing private S3 bucket name |
| SYNC_DOCUMENTS_BUCKET | Optional bucket-name override |
| SERVER_PORT | Spring server port, defaults to 8080 |

See [AWS setup and IAM requirements](docs/AWS.md). No AWS resources are provisioned
by starting the backend. The SDK uses the standard credentials provider chain.
Never enable demo verification or checkout for real purchases. No live KYC provider
or payment gateway is configured.

## Authentication and ownership

Protected routes accept `Authorization: Bearer <Cognito access token>`. The decoder
checks signature, issuer, expiry/not-before, nonblank `sub`, `token_use=access`, and
configured `client_id`. The app-client check does not use `aud`. ID tokens are
rejected. The default trusted `scope` claim maps to `SCOPE_` authorities;
`/v1/admin/**` requires `SCOPE_admin`. Authentication is stateless.

Every customer record uses the authenticated `sub`. Submitted IDs and contact
emails never choose another customer's partition. Profile email is editable
contact information, not an authentication identity. Before first PUT, GET `/v1/me`
returns unsaved onboarding defaults; empty fields indicate unfinished onboarding.
Save a valid profile before requesting recommendations or placing an order.

## API contract

The complete machine-readable contract is [OpenAPI 3.1](docs/openapi.json).
Errors use `{"error":{"code":"...","message":"...","details":[]}}`.

| Method | Route | Behavior |
| --- | --- | --- |
| GET | /health | Public health |
| GET | /v1/catalogue | Public canonical catalogue |
| GET, PUT | /v1/me | Own profile |
| POST | /v1/quotes | Catalogue-based quotation, body `{lines}` |
| GET | /v1/recommendations | Three deterministic groups for saved profile |
| GET, POST | /v1/orders | List own orders / explicit demo checkout |
| GET | /v1/orders/{id} | Own order detail |
| POST | /v1/orders/{id}/cancel | Cancel eligible demo order |
| POST | /v1/admin/demo/orders/{id}/advance | Advance own demo order with admin scope |
| GET | /v1/invoices | Own invoice snapshots |
| GET | /v1/documents | List own active/pending/expired document reservations |
| POST | /v1/documents/uploads | Authorize private upload, body `{name,type,size}` |
| POST | /v1/documents/{id}/uploads | Renew pending upload authorization |
| PUT | /v1/documents/{id}/content | Local mode upload of exact bytes |
| POST | /v1/documents/{id}/complete | Check storage metadata and attach document |
| DELETE | /v1/documents/{id} | Remove document, revoke demo KYC, free slot |
| GET, PUT | /v1/kyc | Read KYC / record `{provider,consent}` |
| POST | /v1/kyc/assessment | Consent-gated OCR and synthetic registry checks |
| POST | /v1/registries/lookup | One masked synthetic GST/Udyam lookup after consent |
| POST | /v1/kyc/demo-verification | Demo-only verification after passing assessment |
| GET, POST | /v1/tickets | List/create own support tickets |
| GET | /v1/tickets/{id} | Own support ticket |
| POST | /v1/tickets/{id}/resolve | Resolve own ticket |
| GET | /v1/notifications | Own notifications |
| POST | /v1/notifications/{id}/read | Mark own notification read |

Collection reads return arrays, preserving the existing adapter. Use `limit` (1–100,
default 100) and optional `after`. If present, `X-Next-Cursor` supplies the next
`after` value. Records are ordered by their keys, not presentation date. Continue
until that header is absent. Cursors cannot change the authenticated partition.

Quotes and invoice amounts are integer paise; profile budget is whole INR. Tax
remains the illustrative 18% recurring tax; setup is reported separately. Backend
arithmetic and eligibility never trust client totals. Valid request bodies may
still return quote eligibility errors in `quote.errors`, matching the domain.

## Local demo journey

1. Configure a real Cognito issuer/client and use a valid **access** token, or run
   the tests with locally signed test JWTs. There is no production auth bypass.
2. Explicitly set `SYNC_DEMO_ENABLED=true` for a demo environment.
3. PUT a complete profile to `/v1/me` using the frontend Profile shape.
4. POST `{name,type,size}` to `/v1/documents/uploads`. Allowed types are PDF, JPEG
   and PNG; maximum 10 MiB and eight active reservations per customer.
5. PUT exact bytes to `uploadUrl` using returned `headers`. In memory mode, include
   the customer's bearer token. With S3, use its signed URL without Cognito auth.
6. POST `/v1/documents/{documentId}/complete`. Completion checks storage metadata;
   it does not verify identity. Upload registration, address proof and signatory ID.
   Default fixture OCR accepts exact supplied images; K05 is a readable active example.
   Use a matching business profile (Balaji Realty LLP for K05).
7. PUT `{"provider":"digio","consent":true}` (or `digilocker`) to `/v1/kyc`,
   then POST `/v1/kyc/assessment`. Resolve all review findings before POST
   `/v1/kyc/demo-verification`. These provider names are demo choices.
8. POST `{"lines":[{"productId":"P01","quantity":1}],"demoConsent":true}` to
   `/v1/orders`, with an `Idempotency-Key` of 8–128 letters/digits/underscores/hyphens.
9. GET orders, invoices and notifications. The checkout stores them atomically.
   Repeating the same key and lines returns the original order and creates no new
   invoice. Changing lines with that key returns 409.

GET `/v1/documents` recovers reservation IDs after a reload. Pending authorizations expire after five minutes; renew rather than consuming a
new reservation. Delete abandoned documents to free slots. Deletion and document
changes reset KYC to pending. Failed object cleanup can be retried with DELETE;
metadata revocation happens before cleanup. Configure S3 lifecycle cleanup for
abandoned objects, including a possible unused URL replay before its expiry.

Tests cover signed JWT validation, customer isolation, conditional transactions,
checkout replay, exact high-value money calculations, upload ownership/metadata,
consent, demo gates, support, notifications, CORS and a full local customer journey.
AWS tests use fake credentials and mocked clients; real Cognito/AWS end-to-end
verification remains part of deployment.

## Packaging

`./mvnw clean verify` builds `target/sync-backend-0.0.1-SNAPSHOT.jar`.
Run with `java -jar target/sync-backend-0.0.1-SNAPSHOT.jar` on Java 21.

From the repository root:

```sh
docker build -f services/sync-backend/Dockerfile -t sync-backend .
docker run --rm -p 8080:8080 --env-file services/sync-backend/.env.example sync-backend
```

The image uses Java 21 and a non-root runtime user. For the API Gateway/Lambda
hosting described in the root environment example, use `Dockerfile.lambda` and
follow [Lambda packaging and environment mapping](docs/AWS.md#api-gateway--lambda-packaging). CI builds/tests backend changes
and canonical catalogue changes. Docker image execution has not been verified in
this workspace because its Docker daemon is not running.

The [audit and phase log](docs/IMPLEMENTATION.md) records the initial failures,
security findings and implementation phases. Frontend wiring, AWS provisioning,
real provider processing, payment integration and deployment remain separate work.
