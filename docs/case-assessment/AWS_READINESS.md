# AWS readiness and actions needed

Read-only checks on 7 November 2026 IST used the public URLs configured in the ignored root `.env.local`. No deployment, account mutation or resource provisioning was performed. Machine-readable results: [aws-readiness.json](aws-readiness.json).

| Check | Observed result |
| --- | --- |
| CloudFront customer URL | HTTP 200, HTML reachable; this does not prove the latest build is deployed |
| Cognito discovery/JWKS | HTTP 200, issuer matches configured pool, two signing keys |
| API `/health` | HTTP 200, `sync-prototype-api`, `mode: infrastructure-test` |
| API `/v1/catalogue` | HTTP 404; Spring application routes are not deployed there |
| API `/v1/me` without token | HTTP 404, rather than the Spring API's expected 401 |
| IAM/SSO credentials on this machine | No environment credentials or shared AWS config/credentials found |
| Private Lambda/DynamoDB/S3/IAM inspection | Not performed; no authenticated AWS access available |
| Gemini | One live discovery request succeeded; a subsequent HTTP-gateway check returned 429 quota exhausted. Credentials alone do not guarantee available quota |
| Textract/Sarvam/Digio/DigiLocker | No live document/speech/identity requests were made; adapter/fixture tests are not proof of a live connection |

## What you need to do

1. **Provide an AWS login for private verification**, preferably an IAM Identity Center/SSO profile with read access to the project resources. Do not paste access keys into chat or put them in Vite variables. The app in Lambda uses its execution role; local SDK calls use the normal [AWS credential chain](https://docs.aws.amazon.com/sdk-for-java/latest/developer-guide/credentials-chain.html). No long-lived access key is needed in source code.
2. **Deploy the Spring application**, not the diagnostic Node handler. `services/sync-backend/Dockerfile.lambda` packages Java 21, the shared catalogue/registries/OCR fixtures and [AWS Lambda Web Adapter](https://github.com/aws/aws-lambda-web-adapter). Build from repository root, publish the image to ECR and use an image-based Lambda with its own execution role. Point the API Gateway integration and `/v1/*` routes at it. Set gateway timeout/memory for Java startup; test cold starts. The Docker daemon was unavailable locally, so the Lambda image itself has not been built or runtime-tested here; the executable JAR is verified separately.
3. **Set backend runtime variables from root `.env.example`:** `SPRING_PROFILES_ACTIVE=aws`, the three table names, `DOCUMENTS_BUCKET`, matching Cognito pool/client, exact frontend origin and appropriate region. Remove memory-adapter overrides. Spring does **not** automatically load `.env.local`. Use Lambda environment/configuration or exported local variables. Keep `SYNC_DEMO_ENABLED=false` for any real environment; only enable it with `KYC_MODE=mock` in an explicitly controlled synthetic prototype if you want demo checkout.
4. **Verify DynamoDB and S3 permissions/configuration.** Three tables need string `PK` and `SK` keys; assign the actual names in the runtime. Grant the Lambda role only the required table read/query and transactional item-write permissions and `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject` on the private document prefix. Block public access, enable encryption and configure approved retention/noncurrent-version handling. See [backend AWS setup](../../services/sync-backend/docs/AWS.md) for required permissions and S3 CORS settings. Ensure signed browser PUT requests allow `content-type` and `if-none-match` from the exact customer origin.
5. **Finish browser hosting/auth configuration.** Build/upload the updated customer app to the website bucket and invalidate CloudFront. API CORS and Cognito callback/logout URLs must match the actual origin/return URL; add `http://127.0.0.1:5173/` separately for local sign-in if used. Cognito client must be public/PKCE without a client secret, with the required OAuth flows/scopes. Pool discovery being healthy does not prove client callbacks or user sign-in work. Native sign-in additionally needs the dedicated mobile client/system-browser return implementation.
6. **Choose OCR and AI hosting.** `SYNC_KYC_OCR=fixtures` works only for exact supplied synthetic PNGs. To OCR other supported images, select `textract`, grant `textract:DetectDocumentText`, and verify in the chosen region. The adapter deliberately supports PNG/JPEG up to 5 MiB; PDFs/other inputs require review even though [Textract itself has broader capabilities](https://docs.aws.amazon.com/textract/latest/dg/limits-document.html). The mock registry and fixture date still do not become real identity verification. Host an authenticated, throttled AI gateway before setting `VITE_CHAT_ENABLED`/`VITE_VOICE_ENABLED` on a public build; local loopback gateway alone cannot serve CloudFront customers. Resolve Gemini quota/billing; voice also needs Sarvam credentials/credits. Digio/DigiLocker/e-sign require actual provider integration and approved contracts before live use.

## Acceptance after deployment

- `/health` identifies `sync-backend`, public `/v1/catalogue` returns 25 products, and protected `/v1/me` returns 401 without an access JWT.
- A signed-in test customer saves a profile, uploads privately, gets masked KYC findings, creates a clearly labelled demo order and reloads its invoice. Another subject cannot see those records.
- Repeat with the API running in a different instance/restart to prove DynamoDB/S3 durability. Verify relevant records/objects and role denials through authenticated AWS inspection. The local memory-mode browser suite cannot establish this.
- Run `python3 scripts/check-aws-readiness.py` again from repository root to refresh public endpoint evidence. It probes configured URLs read-only and prints no credentials. Successful public probes still do not verify private resources.
