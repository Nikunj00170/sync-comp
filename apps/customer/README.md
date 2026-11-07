# Accel Telecom customer app

React web and Capacitor Android frontend, with English, Hindi and Marathi UI,
a customer API adapter for the Spring backend, and an optional voice advisor.
Use Node.js 24+ (CI uses Node 26) and Java 21 for the backend/full-stack checks.

## Local demo

From the repository root:

```sh
npm ci
VITE_API_BASE_URL= npm run dev
```

Open http://127.0.0.1:5173/. An unset/empty/placeholder API URL selects the local
sample workspace, stored in this browser. The demo needs no cloud/provider keys.
Demo documents store metadata only; orders, payments and milestones are simulations.

## Connect the Spring backend

Configure the public VITE values from the root `.env.example` in ignored
`.env.local`. Vite reads that root file. A configured API URL selects the cloud
workspace: it requires Cognito access-token sign-in, loads actual account records,
and never substitutes sample data when an API request fails.

Start the Spring backend with Java 21 and the Cognito issuer/client configuration:

```sh
cd services/sync-backend
./mvnw spring-boot:run
```

For local web login, set `VITE_API_BASE_URL=http://localhost:8080`, point
VITE_COGNITO_AUTHORITY/CLIENT_ID/DOMAIN at the same pool/client as the backend, and
set VITE_REDIRECT_URI and VITE_LOGOUT_URI to `http://127.0.0.1:5173/`. Register those
exact callback/logout URLs in Cognito first. Set backend SYNC_CORS_ALLOWED_ORIGINS
to include that origin. The current deployed CloudFront callback cannot complete
a local redirect until this registration is made.

The OIDC flow uses authorization code + PKCE, access tokens (never ID tokens),
refresh before expiry, callback cleanup and Cognito logout. User tokens live in
sessionStorage rather than localStorage. Account switches and logout clear loaded
records. Preferences/cart UI state cannot overwrite API-owned profiles or orders.
Cloud profiles are not copied into the browser's demo workspace storage.

Connected journeys include profile save, deterministic recommendations, server
quotes, idempotent demo checkout, paginated orders/invoices, private document-byte
upload and completion, consent/demo KYC, tickets/resolution and notification reads.
Document uploads send bearer credentials only to the backend's owned local upload
endpoint; S3 receives only its presigned headers. Pending uploads can be removed.
The catalogue must match the shared app catalogue before transactions continue.

The backend defaults to disabling simulated checkout/KYC. To exercise those paths
in a demo environment, explicitly set SYNC_DEMO_ENABLED=true and KYC_MODE=mock.
This does not enable real identity verification, payments or service purchase.
Service quantity mutation, installation rescheduling and
customer milestone advancement are unavailable because those customer APIs do not
exist. Local demo controls remain available only in local demo mode.

Real AWS/Cognito deployment is separate from local integration testing. See
[backend configuration](../../services/sync-backend/README.md).

## Assistant

Typed chat is also available with `VITE_CHAT_ENABLED=true`, using the same local gateway and a Gemini key without microphone/Sarvam. It has separate conversation consent and can clear the transient history. Do not share identity documents or secrets in chat.

The assistant supports speech-pause sending, continuous listening, detected-language
replies, provider quota/key fallbacks and session cleanup. It still needs the
separate server-side voice service and provider credentials; never expose API keys
through VITE variables. Run `npm run dev:voice` alongside the frontend for the
loopback development proxy and explicitly set VITE_VOICE_ENABLED=true for voice
controls. With the flag disabled, the questionnaire is offered instead.
VITE_VOICE_API_BASE_URL can select a separately hosted
voice endpoint with appropriate authentication/CORS; the development service itself
must not be exposed publicly as a production gateway.

Suggestions can be reviewed as a bundle after product, quantity and eligibility
checks. Checkout prices always come from the catalogue/backend rather than the
assistant's displayed price range. Recording and provider transmission require
explicit consent. The questionnaire remains available without speech providers.

## Languages and exports

The top-bar selector offers English, हिन्दी and मराठी. The choice persists across
reloads, updates document language, navigation, forms, consent, help, status labels,
dates and currency. API enums, product IDs, quantities and prices stay canonical;
customer names, addresses, transcripts and product trade names are not translated.
Unknown provider messages fall back to their original text.

Hindi and Marathi share bundled Noto Sans Devanagari, including its SIL OFL license.
Invoice PDFs embed the Unicode font so business names and addresses are preserved;
PDF headings remain English. No online translation provider or language API key is
required. Dictionaries live in `src/locales/`; tests check static UI coverage and
placeholder consistency.

## Verification

```sh
npm run build
npm test
npm run test:sales-bot
npm run test:e2e
# With JAVA_HOME pointing to Java 21:
npm run test:integration
```

Demo browser tests use a dedicated frontend at port 5175. The integration runner
starts Spring on 18081 and Vite on 5174, supplies locally signed test JWTs via an
external temporary fixture, and removes all fixtures/stops servers on exit. It
uses actual Spring routes and uploaded bytes; it does not mock successful business
API responses. A few failure tests deliberately simulate network/API failures.
The signing configuration exists only in test sources and is not packaged in the
production JAR. Tests never require real customer credentials or provider credits.

Playwright tests use installed Google Chrome by default, or set
PLAYWRIGHT_CHANNEL=chromium after installing the Playwright browser. Both desktop
and mobile viewports are covered, with accessibility and horizontal-overflow checks.
CI runs the build, unit, assistant, browser and real local full-stack suites.

## Android and hosting

Hash-based routes work on CloudFront/S3 and the packaged WebView without SPA
rewrites. Publish `dist/` through the existing website-hosting setup when authorized;
this repository does not automatically deploy infrastructure.

```sh
npm run android:sync
npm run android:debug
```

The Android project uses Java 21, SDK 36 and minimum SDK 24. Building an APK requires
a configured Android SDK. Native exports use the share sheet and app-cache files.
Native cloud sign-in still requires a mobile client, system-browser flow, registered
return URI and secure platform token handling. The application explains that
limitation rather than pretending the web redirect is a native login. Device and
live-provider testing are separate from the mobile browser checks.

Font source: [Google Noto Sans Devanagari](https://github.com/google/fonts/tree/main/ofl/notosansdevanagari).

## Demo checkout and request recovery

Checkout opens a browser-only UPI/card/net-banking simulation; it collects no payment
credentials and makes no payment-provider or payment-API calls. After confirmation,
the normal order API still creates the demo order/invoice; no API failure is silently
replaced with a local order. Local-demo checkout also creates its invoice and notice.
Receipts persist per account on this device and appear beside order tracking. Invoice
payment simulation overlays only the browser view; the server invoice remains unchanged.
Clear site data to remove stored demo receipts. Server demo checkout/KYC still needs
`SYNC_DEMO_ENABLED=true` with `KYC_MODE=mock` in the controlled prototype environment.

Cognito renewal is single-flight and retains a still-valid token during temporary
provider outages. HTTP 429 does not sign out the customer. Account reads have bounded
backoff and limited concurrency; successful uploads update document state directly.
Interrupted upload completion can resume using the existing reservation and stored
bytes. Unreadable or mismatched KYC documents still require review; errors do not
fabricate verification. No live identity or payment gateway is connected.


## Verification paths

DigiLocker displays a disabled demo connection step: no document retrieval or live
provider connection is implemented. Choose Digio for the manual document-upload
prototype (local sample metadata or private backend uploads). A failed document
assessment disables completion until the documents change; consent alone does not
clear a review result. Neither path performs live government identity verification.
