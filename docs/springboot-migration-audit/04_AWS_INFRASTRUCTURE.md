# AWS infrastructure and compute migration

Audit date: 6 November 2026. Scope: repository evidence only; no AWS account inspection, deployment, application changes, or provider calls. Line references refer to the audited source snapshot.

Evidence labels: **VERIFIED IN CODE** = directly inspected implementation/data; **DOCUMENTED ONLY** = assertion/design in project documentation; **PARTIALLY IMPLEMENTED** = only some required behavior exists; **MOCKED** = local/synthetic behavior; **NOT IMPLEMENTED** = no implementation found; **UNVERIFIED** = cannot establish from available evidence. Recommendations and proposed schemas below are future design, not deployed facts.


## Evidence boundary

VERIFIED IN CODE: no CDK stack, CloudFormation/SAM template, Terraform configuration or deployment script. reference/initial-scaffold/package.json contains a CDK command referencing absent infra/app.ts. infra-placeholder/aws-prototype-config.example.json contains placeholders only. Ignored deployment config is absent at audit time. Regional ap-south-1 values and successful console tests are DOCUMENTED ONLY in infra-placeholder/README.md, not independently read from AWS. No provisioning or diagnostic writes were executed in this audit.

## Resource-by-resource inventory

Names below are logical references/placeholders, not actual deployed identifiers. Region is documented Mumbai for regional services; CloudFront is global.

| Resource / service | Configuration, dependencies, IAM | Evidence/status | Spring reuse/change |
| --- | --- | --- | --- |
| YOUR_WEBSITE_BUCKET / S3 | Private REST origin, website hosting disabled, CloudFront OAC bucket policy; public assets only | DOCUMENTED ONLY; policy/encryption/versioning/lifecycle absent | Reuse; upload React dist rather than placeholder once authorized; keep separate from documents |
| YOUR_CLOUDFRONT_DOMAIN / CloudFront | HTTPS, S3 OAC; distribution ID, policy/OAC IDs and cache settings absent | DOCUMENTED ONLY HTTPS test report | Reuse frontend delivery; no Spring hosting role |
| YOUR_API_ID / API Gateway HTTP API | execute-api base, $default auto-deploy reported; public GET /health, JWT GET /auth-check; future /v1 routes absent | DOCUMENTED ONLY route provisioning; handler doesn't dispatch routes | Reuse API/base/JWT authorizer, add business routes or protected /v1/{proxy+}, update integration and invoke permission |
| YOUR_LAMBDA_FUNCTION_NAME / Lambda | index.handler, Node24 arm64 256MB; 30s timeout reported, env table/bucket refs | VERIFIED IN CODE handler; runtime/deployment DOCUMENTED ONLY | New Java21 function/handler/package, measured memory/timeout/concurrency; integration cutover after tests |
| YOUR_LAMBDA_EXECUTION_ROLE / IAM | AmazonDynamoDBFullAccess, AmazonS3FullAccess, inline log policy name placeholder | DOCUMENTED ONLY attachment report | Replace with table/index/prefix-scoped runtime rights; grant queue/provider-secret/OCR access only when used |
| YOUR_AWS_REGION_YOUR_POOL_ID / Cognito | User pool, hosted domain, public web client, issuer and callback/logout in example; openid email | DOCUMENTED ONLY pool/client configuration; code consumes public config | Reuse pool/client; validate actual issuer/client and scopes, add local/native callbacks deliberately |
| YOUR_JWT_AUTHORIZER_NAME / API JWT authorizer | Cognito issuer/client audience, email scope requested on diagnostic route | DOCUMENTED ONLY; scope save/token success UNVERIFIED | Reuse after read-back; protect business routes, retain Spring validation |
| YOUR_CUSTOMERS_TABLE / DynamoDB | Documented on-demand, string PK/SK, customer profile/KYC/discovery intent | Diagnostic Put/Get/Delete VERIFIED IN CODE, actual schema DOCUMENTED ONLY | Reuse after describe-table; add application mappings and indexes as needed |
| YOUR_ORDERS_TABLE / DynamoDB | Documented on-demand, string PK/SK, orders/invoices; no history GSI provisioned per docs | Same boundary | Reuse, add sparse history index and conditional transactional writes |
| YOUR_ACTIVITY_TABLE / DynamoDB | Documented on-demand, string PK/SK | Same boundary | Reuse; activity ownership/projection schema new |
| YOUR_DOCUMENTS_BUCKET / S3 | Private/block public access described; document CORS template allows origin placeholder, GET/PUT/HEAD, all headers, exposes ETag, maxage300 | Diagnostic object Put/Get/Delete VERIFIED IN CODE; actual bucket controls DOCUMENTED ONLY | Reuse with Java presigner, restricted prefixes, lifecycle/quarantine and authorized download |
| /aws/lambda/YOUR_LAMBDA_FUNCTION_NAME / CloudWatch Logs | Inline logs policy documented; 7-day retention instructed, not read back | DOCUMENTED ONLY / UNVERIFIED retention | New function log group, retention, request metrics, PII-safe logs/alarms |
| Builder IAM group | AmazonAPIGatewayAdministrator, AWSLambda_FullAccess, CloudWatchLogsFullAccess, AmazonS3FullAccess, AmazonDynamoDBFullAccess reported; older Cognito/CloudFront policies uncertain | DOCUMENTED ONLY, exact attachments UNVERIFIED | Do not copy builder rights to runtime; deployment role limited to chosen stack |
| API throttles and budget | 5rps/burst10 target; USD10 monthly alert planned | UNVERIFIED saved/created state | Read back/establish; alerts are not caps, limit voice/provider spend separately |
| SQS/DLQ, worker, Textract | No queue URL/ARN/policy/event-source/SNS/OCR workflow | NOT IMPLEMENTED | Create later; retry/visibility/DLQ/alarms and narrowly scoped OCR permissions |
| ECS/ECR/VPC/ALB/NAT | No resources/configuration | NOT IMPLEMENTED | Only create for chosen Fargate alternative, not needed for initial Lambda |
| Production cells/Aurora/Valkey/OpenSearch/Step Functions/EventBridge/lake/DR/WAF | Architecture targets only | DOCUMENTED ONLY | Exclude from prototype migration |

API CORS template allows GET/POST/PUT/PATCH/DELETE/OPTIONS, authorization and content-type, no credentials, maxage300, single placeholder CloudFront origin. It does not include future Idempotency-Key/If-Match, exposed version headers, local dev or native origins. Preserve strict origin allowlist and explicitly add required headers. Bucket CORS alone grants no S3 permission.

## Lambda diagnostic details (VERIFIED IN CODE)

api/index.mjs:1 static health: 200 JSON {status:ok,service:infrastructure-test-api,mode:infrastructure-test}, Content-Type JSON and Cache-Control no-store. handler:106 returns that for ALL ordinary events, including arbitrary paths; route protection exists only at documented Gateway configuration. Direct operation=storage-check with no requestContext/httpMethod/version executes three parallel DynamoDB checks plus one S3 check. Dynamic AWS SDK v3 imports; maxAttempts2 and 4-second per-command abort. Table key PK=INFRA_CHECK#<UUID>, SK=CHECK; attribute infrastructureTestId; conditional put, consistent get, conditional cleanup. S3 key _infra-check/<UUID>.txt, text/plain, body read-back/delete. Report shape {status:passed|failed,checks:[{resource,status,error?,cleanupError?,testKey?}]}. No business entities created. This is a manual side-effecting diagnostic, not an API integration test. Keep off HTTP entrypoints and avoid returning internal errors publicly.

## A versus B

| Dimension | A: Spring Boot on Lambda | B: Spring Boot container on ECS Fargate |
| --- | --- | --- |
| Integration | aws-serverless-java-container-springboot3, explicit HTTP API v2 request/response adapter; retain AWS_PROXY route model and alias invoke permission | Retain HTTP API/JWT, use VPC Link + internal ALB listener HTTP_PROXY (or separately evaluate Cloud Map); map path/stage and preserve bearer header |
| Infrastructure | Java21 function/version/alias, log group, runtime role; existing public AWS services need no VPC attachment | ECR, Docker image, VPC/subnets/security groups, ECS cluster/service/task, ALB/target group/listener and VPC link, autoscaling/logs; controlled egress or endpoints |
| Deployment | mvn verify/package deployment artifact with handler, publish version, smoke test then alias/integration switch, rollback alias | mvn verify, build/scan/push image, register task revision, rolling/blue-green health checks, rollback revision |
| IAM | Lambda trust, logs, scoped SDK rights, API invoke resource policy | Task role for application SDK; separate execution role for ECR/logs/secrets; deployment permissions and networking controls |
| Latency | Java/Spring initialization can exceed client timeout; reuse SDK clients/context, measure cold/warm p95; evaluate SnapStart | Warm tasks avoid per-request initialization, but task startup/deployment/scale-out still slow; minimum healthy capacity costs continuously |
| Cost | Request/duration-based plus Gateway/storage/provider costs; closest to current low-volume design, not a price guarantee | Running vCPU/RAM plus ALB/ECR/network/egress; sustained load may justify; no current measurements to claim a crossover |
| Operations | No container host/service scheduler to operate; Lambda/Gateway limits favor short request turns + async work | Health/readiness, image patching, scaling, rollout/drain and availability need configuration; better fit for long-lived media |
| Reusable | API/JWT/pool/tables/buckets/CloudFront | Same state/frontend/identity; Lambda integration replaced, diagnostics can remain separate |

Recommendation: A for prototype, deploy ordinary Spring Web locally on port8080, thin Lambda adapter in deployment profile. Keep business services transport-independent to permit Fargate later. A container *image Lambda* is not ECS; do not confuse packaging choices. SnapStart uses published versions; inspect runtime/region/architecture constraints before enabling and test restored connections, randomness and credentials. Do not assume existing arm64 settings support desired SnapStart configuration or that existing 256MB is suitable. No cost amount or latency SLO is established here.

## Primary technical sources checked during audit

- [AWS Serverless Java Container Spring Boot 3 quick start](https://github.com/aws/serverless-java-container/wiki/Quick-start---Spring-Boot3): adapter-supported Spring Boot integration; verify HTTP API v2 initialization for pinned version.
- [AWS Lambda SnapStart](https://docs.aws.amazon.com/lambda/latest/dg/snapstart.html): published snapshots, startup tradeoffs and limitations; no measured benefit established for this app.
- [HTTP API private integrations](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-private.html): VPC link, ALB/Cloud Map targets and stage/path mapping.

These sources describe platform capabilities. Repository-specific recommendation is an inference from low-volume request-based infrastructure and missing backend, not a benchmark.
