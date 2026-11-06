# AWS adapter configuration

Deployment is separate from implementation. Nothing here asserts that a table,
bucket, Cognito pool or IAM role currently exists.

The root `.env.example` defines API Gateway/Lambda, CloudFront, three DynamoDB
tables, Cognito and private S3. Configure the Spring runtime with these existing
names (replace placeholders before starting):

```
SPRING_PROFILES_ACTIVE=aws
AWS_REGION=ap-south-1
CUSTOMERS_TABLE=<existing-customers-table>
ORDERS_TABLE=<existing-orders-table>
ACTIVITY_TABLE=<existing-activity-table>
DOCUMENTS_BUCKET=<existing-private-bucket>
COGNITO_USER_POOL_ID=ap-south-1_<pool-id>
COGNITO_CLIENT_ID=<app-client>
FRONTEND_ORIGIN=https://<cloudfront-domain>
KYC_MODE=mock
SYNC_DEMO_ENABLED=false
```

The `aws` profile selects DynamoDB and S3 instead of memory and rejects leftover
local memory overrides at startup. The Lambda image
selects it by default. Lambda supplies its AWS region and execution-role credentials.
`COGNITO_ISSUER_URI` may override the issuer derived from the pool ID and region;
`SYNC_CORS_ALLOWED_ORIGINS` may override FRONTEND_ORIGIN with exact comma-separated
web/native origins. No trailing slash belongs in an origin.

For compatibility, `SYNC_DYNAMODB_TABLE` supplies a single-table fallback for any
of the three table names not explicitly set. `SYNC_DOCUMENTS_BUCKET` overrides
DOCUMENTS_BUCKET. The default local profile still uses memory; switching profiles
or changing table routing does not migrate existing customer records.

The SDK uses the default credentials provider chain. Supply runtime IAM roles in
AWS and a named AWS profile in development. Do not put AWS keys in application
properties. SDK calls have a ten-second overall deadline and four-second attempt
deadline. Failures return the common JSON error envelope with HTTP 503.

Each DynamoDB table requires a string partition key `PK` and string sort key `SK`.
The application does not create tables or indexes. No GSI is needed. Items use
`PK=CUSTOMER#<Cognito sub>`, and these sort keys:

| SK | Record | Table |
| --- | --- | --- |
| PROFILE | Contact/business profile | CUSTOMERS_TABLE |
| KYC | Consent and demo KYC status | CUSTOMERS_TABLE |
| ORDER#id | Order snapshot | ORDERS_TABLE |
| INVOICE#id | Invoice snapshot | ORDERS_TABLE |
| CHECKOUT#idempotency-key | Original checkout request and response | ORDERS_TABLE |
| DOCUMENT#id | Upload authorization and completion metadata | CUSTOMERS_TABLE |
| UPLOAD_QUOTA | Document reservation count | CUSTOMERS_TABLE |
| TICKET#id | Customer support ticket | ACTIVITY_TABLE |
| NOTIFICATION#id | Notification/read state | ACTIVITY_TABLE |
| AUDIT#ISO-instant#uuid | KYC consent/verification audit event | ACTIVITY_TABLE |

Each item has JSON string `payload` and numeric `revision`. Do not enable TTL on
these records without a retention policy; deleting checkout records allows reuse
of their idempotency keys. Enable backups/PITR and encryption in infrastructure.
The runtime role needs `dynamodb:GetItem`, `dynamodb:Query`, `dynamodb:PutItem`
and `dynamodb:UpdateItem` on all three tables. DynamoDB authorizes transaction
members through those underlying item actions. Checkout uses one atomic
transaction spanning the configured customer, order and activity tables in the
same AWS account and region. See [IAM for DynamoDB transactions](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/transaction-apis-iam.html)
for optional `dynamodb:EnclosingOperation` restrictions on transactional writes.

Use a private S3 bucket with Block Public Access and Bucket Owner Enforced object
ownership. Require TLS and bucket encryption. The runtime role needs `s3:PutObject`, `s3:DeleteObject`
and `s3:GetObject` (for HeadObject) on `customers/*/documents/*`; no public ACLs or
public object URLs are used. Use bucket policies to require conditional writes if
other writers have access. CORS on that bucket must allow the frontend's exact
origins, PUT, and the signed headers returned by the upload API (including
Content-Type and If-None-Match). Do not send the Cognito Authorization header to S3;
use the upload URL's signature and the returned headers. Configure lifecycle
cleanup for abandoned uploads according to the retention policy.

S3 metadata validation proves upload size/type, not actual MIME contents,
authenticity, malware safety or identity verification. No download endpoint or live government identity provider is enabled. Consented synthetic registry assessment reads owned objects; `SYNC_KYC_OCR=textract` optionally calls Textract for clear PNG/JPEG images up to 5 MiB, with `textract:DetectDocumentText` permission. Default `fixtures` uses cached Tesseract output only for exact supplied synthetic image bytes. Both paths remain mock KYC, not real approval. A real provider adapter and its authorization rules
must precede real purchases; `demo_verified` remains a simulation.

Implementation references: [DynamoDB transactions](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/transaction-apis.html),
[SDK v2 presigned URLs](https://docs.aws.amazon.com/sdk-for-java/latest/developer-guide/examples-s3-presign.html).

## API Gateway / Lambda packaging

`Dockerfile.lambda` includes the [AWS Lambda Web Adapter](https://github.com/aws/aws-lambda-web-adapter)
(pinned at 1.1.0), which translates API Gateway HTTP API events to the Spring HTTP
server without framework-specific Java handler dependencies. It uses Java 21,
port 8080, `/health` readiness, async initialization and `/tmp` for temporary files.
The executable JAR remains independently runnable in the existing Dockerfile.

Build the image from the repository root, selecting the function's architecture:

```sh
docker build --platform linux/arm64 -f services/sync-backend/Dockerfile.lambda -t sync-backend-lambda .
```

Publishing to ECR and updating Lambda are separate deployment steps. An existing
Node.js ZIP Lambda cannot be switched in place to a container package type: create
an image-based function and repoint the existing HTTP API integration when approved.
Do not upload the Spring JAR into the old `index.handler` Node runtime. Configure
function memory and timeout for measured Java cold starts; the diagnostic
placeholder's 256 MiB setting is not validated for this application.

Use HTTP API payload format 2.0 with proxy routes (`ANY /{proxy+}`, and `/` if
needed) and forward the Authorization header. Keep GET `/health` and GET
`/v1/catalogue` public; attach the Cognito authorizer to customer routes. Spring
independently verifies access tokens on every protected request. Handle OPTIONS
without JWT authentication and configure API Gateway CORS consistently with
FRONTEND_ORIGIN (including DELETE, Idempotency-Key and exposed X-Next-Cursor).
Stage `$default` requires no path stripping. Native app origins and return URIs
must be configured separately before a Capacitor cloud rollout.

`VOICE_ENABLED=false` and `KYC_MODE=mock` match the existing prototype. Mock KYC
also requires `SYNC_DEMO_ENABLED=true` to simulate verification/checkout. Setting
KYC_MODE to a live value cannot enable the demo gate. Gemini/Sarvam credentials
belong to the existing separate sales/voice service, not deterministic quote
arithmetic; live Digio/DigiLocker adapters remain unimplemented and their secrets
are not required or consumed by this backend's mock workflow.

The examples contain placeholders, not deployed resource values. No live cloud
resource was read, created, reconfigured or deployed while preparing this PR.
