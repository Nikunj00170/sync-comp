# Authentication and security

Audit date: 6 November 2026. Scope: repository evidence only; no AWS account inspection, deployment, application changes, or provider calls. Line references refer to the audited source snapshot.

Evidence labels: **VERIFIED IN CODE** = directly inspected implementation/data; **DOCUMENTED ONLY** = assertion/design in project documentation; **PARTIALLY IMPLEMENTED** = only some required behavior exists; **MOCKED** = local/synthetic behavior; **NOT IMPLEMENTED** = no implementation found; **UNVERIFIED** = cannot establish from available evidence. Recommendations and proposed schemas below are future design, not deployed facts.


## Existing behavior

VERIFIED IN CODE auth.ts:3 MemoryStorage keeps OIDC user/token material in a Map; authManager:25 validates public authority/client placeholders and creates singleton oidc-client-ts UserManager. response_type=code, scopes hardcoded openid email, automaticSilentRenew=false, userStore uses memory. VITE_OIDC_SCOPE is declared in .env.example but not read. OIDC transaction state uses library default state store (not overridden here); do not infer all redirect state is in memory. PKCE/state handling is delegated to the library, no custom implementation. Token refresh/expiry recovery is not implemented by app code. Reload loses user token; sign-in needed again.

signIn:45 blocks native, checks redirect origin equals page origin, then signinRedirect. finishSignIn:61 caches the callback promise, cleans query by replacing URL with pathname + #/account. App.tsx:77 triggers only when query contains code; error-only OAuth callback is not handled explicitly. Success notice explicitly retains demo workspace. signOut:70 requires hosted login domain, removes OIDC user then navigates to /logout?client_id&logout_uri. No app registration form; signup/recovery/MFA are external hosted Cognito behavior and actual pool settings UNVERIFIED. Account.checkConnection reads getUser, rejects expired/no user and sends access_token to /v1/me. No user-sub representation or business membership mapping in local Workspace.

API Gateway JWT authorizer/anonymous denial and requested email scope are DOCUMENTED ONLY. Scope saved state and signed-in acceptance/refresh/logout UNVERIFIED. Node diagnostic has no token validation or ownership checks. No sensitive business API currently exists to protect. Never expose storage-check over HTTP.

## Compatible Spring Security design (NOT IMPLEMENTED)

Stateless OAuth2 Resource Server, not a new password/login server. Use Cognito issuer from cognito-idp URL, never hosted login domain as issuer. Configure Spring JWT decoder/JWK discovery and validate signature/key rotation, allowed algorithm, iss, exp/nbf. Add Cognito-specific token_use=access and allowlisted client_id validators; standard access tokens use client_id, whereas ID-token aud is not interchangeable. Validate aud when the chosen Cognito resource-binding configuration actually issues it; do not require a nonexistent generic audience claim or accept ID tokens because aud matches. Map scopes to SCOPE_* authorities and decide business scopes deliberately; email is only existing diagnostic intent. Check allowed clients again for native when provisioned.

Permit GET /health and deliberate public catalogue/capability endpoints. Authenticate /v1/** except provider webhook paths, which require independent signature/timestamp verification. Provider routes are not blindly permitAll without their authentication filter/service. Require Spring validation even if Gateway validates JWT, because local/container paths can bypass Gateway. Return 401 invalid authentication, 403 scope/membership denial, and non-enumerating 404 for inaccessible individual resources where appropriate. Establish trace IDs without reflecting untrusted values into logs.

Resolve Jwt.subject to persisted membership/customer identity. Every order/invoice/document/session/payment lookup must prove owner and role. Tenant IDs in DTOs/path are lookup inputs, never proof of authority. No customer control over live KYC approval, payment confirmation, service activation or provider events. Use optimistic version and idempotency for writes. Future reviewer/admin endpoints need explicit role and assignment authorization; partner app is out of current scope.

Frontend requests: Authorization: Bearer <access_token>, Content-Type: application/json on JSON bodies; future Idempotency-Key for create/payment and If-Match for versioned updates. Do not send ID token, raw credentials or API/provider secret. Direct S3 PUT uses signed URL + signed headers, not application bearer token. Keep PKCE public clients without embedded secret. Add 401 reauthentication/refresh strategy before live mutations; do not put live tokens in the demo localStorage. Android needs separate public client, system browser, app return/deep link and secure token lifecycle; remains disabled until tested.

For bearer-only APIs disable CSRF only after confirming no ambient cookie auth; configure strict CORS for CloudFront, deliberate dev origin (127.0.0.1:5173 differs from localhost) and measured Capacitor origin. Allow authorization/content-type and future idempotency/version headers; OPTIONS must work. No need for wildcard credentialed CORS. API CORS and S3 CORS are separate. Hosted callback/logout exact URL matches include root slash; hash routes are not OIDC redirect targets.

## Configuration and secrets inventory

VERIFIED IN CODE: .env.example names below; ignored .env.local exposes the same names and was checked by names only. No values are copied into this audit. Vite envDir points to root and exposes VITE_* to client bundle; backend fields do not load automatically into Lambda.

- Public build config read by source: VITE_API_BASE_URL, VITE_COGNITO_AUTHORITY, VITE_COGNITO_CLIENT_ID, VITE_COGNITO_DOMAIN, VITE_REDIRECT_URI, VITE_LOGOUT_URI.
- Declared but not enabling functionality: VITE_OIDC_SCOPE (scope is hardcoded), VITE_VOICE_ENABLED (voice UI is static Coming Soon).
- Backend config declared: APP_ENV, CUSTOMERS_TABLE, ORDERS_TABLE, ACTIVITY_TABLE, DOCUMENTS_BUCKET, COGNITO_USER_POOL_ID, COGNITO_CLIENT_ID, FRONTEND_ORIGIN, VOICE_ENABLED, KYC_MODE. Diagnostic uses only three table variables and bucket; other variables do not prove enforcement.
- Proposed server-only provider settings: OPENAI_API_KEY, SARVAM_API_KEY, DIGIO_CLIENT_ID, DIGIO_CLIENT_SECRET, DIGILOCKER_CLIENT_ID, DIGILOCKER_CLIENT_SECRET. No app code consumes these providers yet.

Use validated ConfigurationProperties with deployment env/Secrets Manager references and SDK role credentials. Never require long-lived AWS keys in frontend or shared env. Never log tokens/presigned URLs/provider credentials/document contents. IAM least privilege for selected table/index ARNs, object prefixes, queues/OCR/secrets and logs; documented runtime full-access policies need narrowing. Encryption/retention/log policy must be read back before claims. .gitignore and check-staged guard local files but are not a secret scanner or runtime security layer.

## Security verification gates

Wrong issuer/client/token_use/algorithm/expired token; rotating keys; access token with/without required scope; subject A cannot read/write subject B IDs or cursor; server ignores forged prices/KYC/payment states; presigned URL creation/access ownership and actual file validation; repeated/delayed webhooks; mock/live mode isolation; callback query/state/error behavior; untrusted OCR/text prompt injection; no PII in logs. No such backend tests are present now.

Primary references: [Spring Resource Server JWT](https://docs.spring.io/spring-security/reference/servlet/oauth2/resource-server/jwt.html) documents issuer/timestamp validation and custom validators; [Cognito access tokens](https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-the-access-token.html) documents access-token claims/scopes and distinction from ID tokens. These support proposed configuration, not evidence that this repository already validates tokens.
