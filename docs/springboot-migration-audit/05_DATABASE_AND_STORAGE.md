# Database and storage

Audit date: 6 November 2026. Scope: repository evidence only; no AWS account inspection, deployment, application changes, or provider calls. Line references refer to the audited source snapshot.

Evidence labels: **VERIFIED IN CODE** = directly inspected implementation/data; **DOCUMENTED ONLY** = assertion/design in project documentation; **PARTIALLY IMPLEMENTED** = only some required behavior exists; **MOCKED** = local/synthetic behavior; **NOT IMPLEMENTED** = no implementation found; **UNVERIFIED** = cannot establish from available evidence. Recommendations and proposed schemas below are future design, not deployed facts.


## What actually exists in source

VERIFIED IN CODE: the only DynamoDB application access is diagnostic PutItem/GetItem/DeleteItem in infra-placeholder/api/index.mjs:27–61. It assumes string PK and SK but does not create tables. Table names come from CUSTOMERS_TABLE, ORDERS_TABLE, ACTIVITY_TABLE. docs/architecture.md:89–103 describes on-demand PK/SK tables and explicitly labels business keys and GSI as proposed. No real customer records, migration/seed script, repository implementation, LSI/GSI definition, TTL configuration, backup/PITR, KMS configuration or capacity read-back exists. Actual deployed settings are UNVERIFIED.

No application-level data ownership checks exist server-side. Workspace JSON is a local aggregate shape, not a DynamoDB schema. Do not write an entire ever-growing Workspace into one item (size/contention/query problems). All entity ownership, business IDs, memberships and billing accounts must be designed explicitly.

## Recommended prototype schema (NOT IMPLEMENTED)

Use documented three-table direction and single-customer identity model initially. customerKey = stable resolved customer ID, initially Cognito sub; later business membership may map multiple subs to businessId. Store owner/customerKey on every authoritative aggregate; never authorize through a GSI projection alone. Types below are proposed: PK/SK strings, version integer, timestamps UTC ISO, monetary amounts Java long integer paise, quantity integer. TTL epoch seconds only on transient records; no automatic TTL on invoices/KYC evidence until retention approved.

| Table | PK / SK proposal | Attributes and access pattern |
| --- | --- | --- |
| customers | CUSTOMER#customerKey / PROFILE | Profile DTO fields, owner, version, createdAt/updatedAt; exact Get/conditional Update |
| customers | USER#sub / MEMBERSHIP#businessId | Only if multiuser businesses selected: role/customerKey/status; identity lookup then membership validation |
| customers | CUSTOMER#customerKey / DISCOVERY#id | Draft profile, step, catalogueVersion, version; query prefix |
| customers | CUSTOMER#customerKey / QUOTE#id | Exact Quote plus price snapshots, expiry/version; immutable acceptance basis; Get by owner/id |
| customers | CUSTOMER#customerKey / KYC#sessionId | Provider/mode/status/consent reference/document IDs/reasons/evidence refs/version; query sessions |
| customers | CUSTOMER#customerKey / DOCUMENT#documentId | Original filename, declared/actual size/type, bucket/key, checksum/ETag, processing status, KYC session, version; contents in S3 |
| customers | CUSTOMER#customerKey / CONSENT#id | noticeVersion, purpose, provider/mode, accepted, capturedAt, sessionId, revocationAt?; append evidence |
| customers | CUSTOMER#customerKey / TICKET#timestamp#id, NOTIFICATION#timestamp#id, PREFERENCES | Small records mapped from existing DTOs; sorted prefix query; stable ID lookup mapping if timestamp not known |
| customers | CUSTOMER#customerKey / ADVISOR#sessionId | Model-independent validated profile draft, missingFields, language, revision/status, expiresAt; separate MESSAGE#sessionId#sequence items to bound item size |
| customers | CUSTOMER#customerKey / IDEMPOTENCY#operation#key | payloadHash, state/result reference, expiresAt; conditional first writer, reject changed payload |
| orders | ORDER#id / META | Owner, Order DTO snapshot, version, billingAccountId, GSI1PK=CUSTOMER#customerKey, GSI1SK=ORDER#createdAt#id |
| orders | ORDER#id / SERVICE#serviceId | Product/quantity/price snapshot, independent state/activation/appointment/version; query partition; aggregate projected to old Order DTO |
| orders | INVOICE#id / META | Immutable billedTo/InvoiceLine snapshots, amounts, period/billing account/version; GSI1PK same owner, GSI1SK=INVOICE#issuedAt#id |
| orders | PAYMENT#id / META | Owner, invoiceId, mode/provider, amount/currency, pending|confirmed|failed, provider reference, version; full provider event data restricted |
| orders | BILLING#accountId / PERIOD#yyyy-mm | Unique invoice identity lock/reference; conditional creation prevents duplicate period invoices |
| activity | ORDER#id / EVENT#timestamp#id | Owner, label/detail/at, sequence/aggregateVersion/type, actor/providerEventId, GSI1PK=CUSTOMER#customerKey / GSI1SK=EVENT#timestamp#id for dashboard |
| activity | PROVIDER#provider / EVENT#eventId | Deduplication record, payload hash/result reference, retention expiry if approved |

Only orders history GSI is proposed in old docs; customer activity GSI, lock keys, document/session keys and all attributes above are recommendations. No LSI required initially. Conditional unique IDs and version guards; TransactWriteItems couples order/payment/invoice/activity/idempotency where needed (same account/region). Use transactional outbox if queue delivery must follow committed state; otherwise explicit pending-job record and recoverable reconciliation. GSI is eventually consistent; critical mutations re-read/check base record. Query prefix + LastEvaluatedKey pagination; owner-bound opaque cursors; no dashboard table scans. Current adapter lists return raw arrays, so add coordinated page routes described in 02.

Relationships: customer owns drafts/quotes/KYC/docs/tickets; orders own services/activity; billing account aggregates active services across orders into immutable invoice; payments refer to invoices; advisor references customer/profile and server quote, never owns prices. Existing sample workspace contains two orders/two invoices but no billing-account ID, membership or service identity. Those concepts cannot be inferred as deployed schema.

## Proposed DTOs not present in existing domain

Activity={id,orderId?,type,label,detail,at,version}; Payment={id,invoiceId,mode:mock|live,provider,status:pending|confirmed|failed,amount:number,currency:INR,createdAt,updatedAt,reference?:string}. Public DTOs omit owner keys, PK/SK and raw provider evidence. KycSession/DocumentStatus/RegistryResult in 08, advisor models in 07. Version metadata for existing DTO mutations can initially be supplied in ETag headers; client must retain it and send If-Match, or coordinate additive version fields. Do not publish server internal key formats as API IDs.

## S3 evidence and target

VERIFIED IN CODE: only documents diagnostic writes _infra-check/<UUID>.txt as text/plain. No upload presigner, invoice object generation, document key format, encryption header, lifecycle/deletion policy or S3 event configuration implemented. Document CORS template is not bucket-policy/encryption evidence. Website/document bucket separation and private block-public-access/OAC are DOCUMENTED ONLY. Encryption/key ownership/versioning/retention require AWS read-back.

Recommended private object layout (new): customers/{customerKey}/kyc/{sessionId}/{documentId}/original; customers/{customerKey}/ocr/{documentId}/{jobVersion}.json; customers/{customerKey}/invoices/{invoiceId}/{snapshotVersion}.pdf. Keep untrusted original filename in metadata, not raw key path. No anonymous reads; TLS, server-side encryption baseline verified on bucket (KMS only if approved; add decrypt/data-key rights when required). Separate quarantine/processed status and object access policy. Lifecycle/retention must be approved; delete object versions and derived outputs where policy demands, not just Dynamo metadata.

Upload sequence: validate metadata/consent and caller; server chooses key; S3Presigner creates short-lived PUT for one object and expected content-type (proposed 5min). Preserve uploadUrl/documentId response; additive requiredHeaders/expiresAt only through contract update. Browser PUT sends bytes directly with signed headers, then completion API. A presigned URL is transferable until expiry; protect logs and do not claim issuer JWT is rechecked by S3. Declared size and browser MIME are insufficient: HEAD/read sniff after upload, enforce actual <=10MiB and PDF/PNG/JPEG, reject unsafe/oversized files, malware/quarantine before OCR. If pre-upload hard content-length enforcement is required, evaluate policy-based POST and coordinate a different frontend upload contract. No such mechanism exists today.

## Java SDK v2 access

Use singleton DynamoDbClient + DynamoDbEnhancedClient with explicit TableSchema mappings, converters for Instant/enums and configured table names; no hardcoded deployment identifiers or local credentials. QueryEnhancedRequest for base/index prefixes; conditional/versioned writes and SDK transactions for coupled records; never use scans for primary lists. S3Client/S3Presigner for upload, HEAD, authorized short-lived GET and deletion. SqsClient for durable jobs; TextractClient in worker, provider job ID persisted. SDK default credential provider chain uses Lambda execution role/ECS task role; local developer AWS profile only outside shared config. Centralize region/timeouts/retries and avoid retrying provider side effects without deduplication.

Primary reference: [AWS SDK for Java](https://docs.aws.amazon.com/sdk-for-java/) and [S3Presigner API](https://docs.aws.amazon.com/java/api/latest/software/amazon/awssdk/services/s3/presigner/S3Presigner.html). Validate pinned APIs during implementation.
