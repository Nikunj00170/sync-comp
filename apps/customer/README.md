# Airtel Sync customer app

A working customer prototype for the web and Capacitor Android, using the supplied fictional case catalogue. Start in the repository root with Node.js 24 or newer:

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:5173/. No credentials or paid services are needed for the demo. The default sample workspace persists in this browser/device. Real AWS customer records are not loaded into the demo.

## Available journeys

- Overview with active services, changing order progress, consolidated balance, notifications and quick actions.
- Three-step business questionnaire, eligibility-aware recommendations and saved drafts.
- All 25 case products: search, category filters, eligibility filter, saved plans, sort, details, and comparison of up to three plans.
- Dependency-aware bundle selection, quantity changes, quote breakdown and verification-gated demo checkout.
- Both Digio and DigiLocker mock paths, document metadata picker, fictional sample documents and explicit consent.
- Order timelines, sequential demo milestones, cancellation, preferred installation slots and calendar exports.
- Consolidated demo invoices, category spending, immutable line-price snapshots, multi-page PDF exports, CSV statement and payment simulation.
- Active-service quantity management, support FAQs and locally saved support requests.
- Profile and preferences, reduced motion, workspace export/reset, global search and unread updates.
- Voice advisor Coming Soon with the questionnaire fallback. There is no active microphone, speech provider or telephone integration in this build. `VITE_VOICE_ENABLED` remains false; setting it true alone does not implement or enable a voice session.

No verification, payment, installation or support submission in the demo creates an external transaction. The document picker stores names, sizes and MIME metadata; it never uploads the contents. Use the supplied fictional documents for demonstrations.

## Web build and checks

```sh
npm run build
npm test
npm run test:e2e
npm run preview
```

`build` checks types and writes website assets to `apps/customer/dist/`. End-to-end tests use the locally installed Google Chrome and run desktop and phone viewports. For headless CI without Chrome, install the appropriate browser or adjust Playwright's `channel`. Accessibility checks cover WCAG 2.1 A/AA rules on key pages; they supplement manual review rather than certify compliance.

Client routes use hashes so CloudFront/S3 and the packaged Android WebView can open all customer routes without server rewrites. Publish the contents of `dist/` to the existing private website bucket; keep the current CloudFront origin access control. The app does not provision AWS resources or deploy itself.

## Android package

The checked-in `android/` project uses `com.airtelsync.customer`, SDK 36, minimum SDK 24 and Java 21. Install Android Studio 2025.2.1 or newer and its SDK platform/build tools. Android Studio supplies the JDK. Setup reference: https://capacitorjs.com/docs/getting-started/environment-setup.

From the repository root:

```sh
npm run android:sync
npm run android:open
# After SDK setup, generate an installable development APK:
npm run android:debug
```

The debug APK is written to `apps/customer/android/app/build/outputs/apk/debug/app-debug.apk`. This is a development build, not a signed store release. Never commit build output, `local.properties`, signing keys or credentials. There is no APK until this build actually succeeds.

Native file exports use the system share sheet from app-cache files. Android Back closes a dialog, navigates through the app, or minimizes it from the overview. These native paths still require emulator/device verification. The initial build machine had no Java runtime or Android SDK, so only project generation and Capacitor sync have been verified.

## Live account and backend boundary

Copy the root `.env.example` to ignored `.env.local` and replace public configuration placeholders only when connecting your deployment. Vite reads the root env files. All `VITE_*` values are exposed in the browser build; API/provider secrets must remain server-side.

The web account screen includes Cognito authorization code + PKCE, callback cleanup and Cognito-domain logout. The web callback/logout URLs must exactly match the deployed website or explicitly allowed local origin. Tokens are held in memory; reloading requires sign-in again. Signed-in success and logout against the live pool remain integration checks.

Native live sign-in is intentionally unavailable until a separate public mobile client, system-browser flow, app return URI and secure token handling are implemented. The native demo works without live sign-in.

`src/lib/api.ts` describes future `/v1` customer endpoints and sends bearer access tokens. It never silently replaces a failed network request with demo data. Current cloud infrastructure only implements `/health` and `/auth-check`; the app does not pretend those diagnostics constitute a customer backend. See [the backend handoff](../../docs/customer-api-handoff.md).

## Code ownership

`packages/domain` contains shared UI/demo business rules, reusable by the future backend after server-side enforcement is added. Prices are integer paise and the tax is an illustrative demo assumption. The full mock registries and lead data are not imported into the browser bundle. Partner/reviewer/admin UI is a separate later application.
