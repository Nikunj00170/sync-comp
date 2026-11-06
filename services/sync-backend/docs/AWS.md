# AWS adapter configuration

Deployment is separate from implementation. Nothing here asserts that a table,
bucket, Cognito pool or IAM role currently exists.

Set environment variables for the application:

```
AWS_REGION=ap-south-1
SYNC_STORAGE=dynamodb
SYNC_DYNAMODB_TABLE=<existing-table>
SYNC_DOCUMENTS=s3
SYNC_DOCUMENTS_BUCKET=<existing-private-bucket>
COGNITO_ISSUER_URI=https://cognito-idp.<region>.amazonaws.com/<pool>
COGNITO_CLIENT_ID=<app-client>
SYNC_DEMO_ENABLED=false
```

The SDK uses the default credentials provider chain. Supply runtime IAM roles in
AWS and a named AWS profile in development. Do not put AWS keys in application
properties. SDK calls have a ten-second overall deadline and four-second attempt
deadline. Failures return the common JSON error envelope with HTTP 503.

The DynamoDB table requires a string partition key `PK` and string sort key `SK`.
The application does not create tables or indexes. No GSI is needed. Items use
`PK=CUSTOMER#<Cognito sub>`, and these sort keys:

| SK | Record |
| --- | --- |
| PROFILE | Contact/business profile |
| KYC | Consent and demo KYC status |
| ORDER#id | Order snapshot |
| INVOICE#id | Invoice snapshot |
| CHECKOUT#idempotency-key | Original checkout request and response |
| DOCUMENT#id | Upload authorization and completion metadata |
| UPLOAD_QUOTA | Document reservation count |
| TICKET#id | Customer support ticket |
| NOTIFICATION#id | Notification/read state |
| AUDIT#ISO-instant#uuid | KYC consent/verification audit event |

Each item has JSON string `payload` and numeric `revision`. Do not enable TTL on
these records without a retention policy; deleting checkout records allows reuse
of their idempotency keys. Enable backups/PITR and encryption in infrastructure.
The runtime role needs `dynamodb:GetItem`, `dynamodb:Query`, and
`dynamodb:TransactWriteItems` for this table. IAM condition checks for transaction
operations must allow the underlying item actions where required by the policy.

Use a private S3 bucket with Block Public Access and Bucket Owner Enforced object
ownership. Require TLS and bucket encryption. The runtime role needs `s3:PutObject`
and `s3:GetObject` (for HeadObject) on `customers/*/documents/*`; no public ACLs or
public object URLs are used. Use bucket policies to require conditional writes if
other writers have access. CORS on that bucket must allow the frontend's exact
origins, PUT, and the signed headers returned by the upload API (including
Content-Type and If-None-Match). Do not send the Cognito Authorization header to S3;
use the upload URL's signature and the returned headers. Configure lifecycle
cleanup for abandoned uploads according to the retention policy.

S3 metadata validation proves upload size/type, not actual MIME contents,
authenticity, malware safety or identity verification. No download endpoint or
live KYC processor is enabled. A real provider adapter and its authorization rules
must precede real purchases; `demo_verified` remains a simulation.

Implementation references: [DynamoDB transactions](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/transaction-apis.html),
[SDK v2 presigned URLs](https://docs.aws.amazon.com/sdk-for-java/latest/developer-guide/examples-s3-presign.html).
