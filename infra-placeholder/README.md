# AWS prototype provisioning handoff

Updated 6 November 2026 from the user's AWS-console reports and test output. This directory contains diagnostic placeholders and resource configuration. The actual application is not implemented.

## Resource configuration template

Read aws-prototype-config.example.json for the configuration shape; substitute your local deployment values before use. Regional resources are in ap-south-1 (Mumbai); CloudFront delivers public website assets.

| Component | Example / configuration |
| --- | --- |
| Website | https://YOUR_CLOUDFRONT_DOMAIN/ |
| Website S3 bucket | sync-prototype-YOUR_AWS_ACCOUNT_ID-web |
| HTTP API | sync-prototype-api; ID YOUR_API_ID |
| API base | https://YOUR_API_ID.execute-api.ap-south-1.amazonaws.com |
| Stage | $default; automatic deployment enabled in the supplied screenshot |
| Lambda | sync-prototype-api; index.handler |
| Runtime settings used in walkthrough | Node.js 24, arm64, 256 MB; timeout raised to 30 seconds for the storage check |
| Execution role | arn:aws:iam::YOUR_AWS_ACCOUNT_ID:role/sync-prototype-api-role |
| User pool | ap-south-1_YOUR_POOL_ID |
| Web app client | sync-prototype-web; YOUR_PUBLIC_CLIENT_ID |
| Login domain | https://YOUR_COGNITO_DOMAIN.auth.ap-south-1.amazoncognito.com |
| JWT authorizer | sync-customer-jwt |
| Data tables | sync-prototype-customers, sync-prototype-orders, sync-prototype-activity |
| Document bucket | sync-prototype-YOUR_AWS_ACCOUNT_ID-documents |
| Log group | /aws/lambda/sync-prototype-api |

Website and document buckets are separate. The website uses an S3 REST origin and CloudFront OAC; S3 website hosting stays disabled. The document bucket remains private and does not use the website's public distribution.

## Tests reported as passed

| Check | Evidence |
| --- | --- |
| Website HTTPS | Placeholder displayed through CloudFront |
| Public backend | GET /health returned status ok |
| Anonymous access control | GET /auth-check returned Unauthorized |
| Customer storage | Lambda temporary write/read/delete passed |
| Order storage | Lambda temporary write/read/delete passed |
| Activity storage | Lambda temporary write/read/delete passed |
| Document storage | Lambda temporary S3 write/read/delete passed |

The successful storage test returned status passed and four checks labelled passed. Its cleanup completed. Previous denied runs failed before writing their test records.

These results do not demonstrate signed-in token acceptance, saved scope enforcement, browser CORS/presigned uploads, actual KYC, recommendation logic, or production load capacity.

## Placeholder deployment and diagnostics

- Upload index.html to the website bucket root.
- Copy api/index.mjs to Lambda's index.mjs and deploy it.
- Use api/events/health-check.json for a private health test.
- Use api/events/storage-check.json for the direct IAM-only storage diagnostic.
- Keep GET /health public and GET /auth-check attached to the JWT authorizer.
- Require email as the diagnostic route scope; confirm the setting persisted and test an actual access token during frontend integration.

The Lambda diagnostic lazily uses the AWS SDK v3 supplied by the Node runtime. The real app should bundle/pin its dependencies. The storage-check branch rejects API Gateway event shapes; it must not become a public API route.

## Console permissions

The user chose AWS-managed service access for prototype provisioning after repeated restrictive-policy console errors.

Relevant builder policies added during setup:

- AmazonAPIGatewayAdministrator
- AWSLambda_FullAccess
- CloudWatchLogsFullAccess
- AmazonS3FullAccess
- AmazonDynamoDBFullAccess

The group may still have the earlier Cognito, CloudFront, role-listing and password policies. Inspect IAM for the authoritative attachment list.

The execution role has AmazonDynamoDBFullAccess and AmazonS3FullAccess, plus its inline SyncPrototypeApiLogs policy. Builder-group permissions alone do not grant runtime access to Lambda.

Superseded custom Lambda/API Gateway setup JSON files are intentionally excluded from this handoff.

## Configuration and remaining confirmations

The backend configuration and intended frontend values are captured in ../.env.example. Values there do not load themselves into Lambda or a browser application.

| Setting | Intended value / current verification |
| --- | --- |
| Document CORS | api/documents-cors.json; instructed before the storage test; no browser upload test yet |
| API CORS | api/http-api-cors.json; user entered the expanded methods; Save/read-back not separately reported |
| API throttle | Prototype target 5 requests/second and burst 10; exact saved values need console confirmation |
| Logs | Seven-day retention instructed; storage checks do not verify retention |
| Budget | USD 10 monthly email alert planned; creation/notification not confirmed |
| Voice | VOICE_ENABLED=false; frontend flag also false when implemented |
| KYC | KYC_MODE=mock |

API CORS origins do not include a trailing slash. Cognito's registered root callback/logout URL includes one. Local-development and native-app origins/callbacks still need explicit configuration.

## Work not yet provisioned

- SQS/DLQ and the asynchronous document-processing Lambda/Textract path.
- Customer-history secondary indexes.
- Android app client, package-specific return URI, and native origins.
- Live speech, model, KYC, payment, CRM or billing-provider integrations.
- Production cells, SQL, cache, search, regional recovery, or automated infrastructure deployment.

Do not deploy the production topology for this low-usage prototype.
