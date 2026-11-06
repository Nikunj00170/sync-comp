# Catalogue sales bot

Local, single-question text prototype using Google Gemini reasoning and `case_source/product_catalogue.csv`. Requires Node 24+. No SDK installation is needed. Set `GEMINI_API_KEY` in ignored root `.env.local`; never prefix the key with `VITE_`. Sarvam is used only for speech in the voice flow. `GEMINI_MODEL` defaults to `gemini-3.5-flash` and can be set to another accessible Gemini model.

Check the knowledge source without a provider call:

```sh
npm run sales:bot -- --check
```

Ask a question (sends the question and full product catalogue to Google Gemini and consumes API credits):

```sh
npm run sales:bot -- "Compare Biz Fibre 100 and Biz Fibre 300"
npm run sales:bot -- "I need broadband for a small shop under INR 1200 a month"
```

The model selects up to five product IDs. Application code validates those IDs and renders descriptions, INR price ranges, billing units, setup fees, contracts, installation estimates, eligibility, dependencies and source references directly from CSV fields. Each option cites `case_source/product_catalogue.csv — product_id=Pxx`. The CSV uses rupees, unlike the existing shared JSON catalogue which uses paise. Editing the CSV takes effect on the next invocation.

For 25 rows, the entire catalogue fits in the prompt; no embeddings or vector database are necessary. Unsupported questions should return an explicit unknown response. Missing requirements should prompt qualification. Model selection and abstention remain probabilistic: citation validity prevents invented product facts but does not prove a recommendation satisfies the question. Qualify customers before quoting or ordering. Dependencies are displayed, not automatically bundled or priced.

## In-app voice preview

Set both `GEMINI_API_KEY` and `SARVAM_API_KEY` in `.env.local`. Start the local backend and the app in separate terminals:

```sh
npm run dev:voice
npm run dev
```

Open `http://127.0.0.1:5173`, choose **Say hello to a smarter start**, accept audio processing, and choose **Speak to advisor**. Start with a short introduction such as “मेरी किराने की दुकान है, मुझे इंटरनेट चाहिए।” The advisor asks one or two focused follow-up questions at a time. It retains your business type, needs, budget, employees, site count, city tier and GSTIN status while you answer. Corrections update the requirements profile.

The microphone automatically sends after sustained speech followed by quiet. Choose Quick (1 second), Natural (1.4 seconds, default), or Relaxed (2.2 seconds) under **Pause before sending** while paused. Isolated clicks are ignored, echo cancellation/noise suppression are requested from the browser, and a silent 25-second listening period pauses without sending a provider request. **Send question** remains available, and recording stops at 25 seconds. The animated 3D-style orb reacts to microphone energy, changes during thinking and speaking, and respects reduced-motion settings. With **Continue listening after each reply** enabled (default), the next listening turn opens after playback finishes. **Stop** pauses recording/playback without clearing requirements. **End call & clear**, or closing the dialog, releases the microphone and requests deletion of the backend session. A microphone permission or audio-analysis restriction may require manually sending each turn. This remains turn-based audio rather than streaming or interruption detection.

The pipeline is Sarvam Saaras v4 speech recognition → Gemini combined requirement extraction/follow-up (or a strict local shortcut) → application validation of any proposed bundle → Gemini narration only when needed → Sarvam Bulbul v4 Flash speech synthesis. Speech recognition auto-detects language each turn, and the detected or explicitly requested language is used for both reply text and TTS. Supported reply languages: English, Hindi, Bengali, Gujarati, Kannada, Malayalam, Marathi, Odia, Punjabi, Tamil and Telugu. Switching language preserves requirements. Very short or code-mixed utterances can be misidentified; explicitly asking for a language can correct the next reply. Languages outside this speech set fall back to the previous supported language or English.

Before proposing a bundle, the assistant gathers the required profile fields. Non-per-site product quantities must be explicitly confirmed. Application code verifies product IDs, quantities, city tier, employee/site minimums, GSTIN eligibility, dependencies, site coverage and the upper monthly price against the budget. The UI shows exact quantities, price ranges, setup total and CSV references. It does not place an order. The narrative and requirement extraction are model-generated and still require customer review; generated speech is not a guarantee of eligibility or serviceability. Short questions and replies replace the previous long English fact-card narration.

Backend sessions keep the structured profile and the last 12 exchanges in memory, expire after 30 minutes of inactivity, and are lost on backend restart. The browser sends an opaque session ID rather than truncated conversation headers. Sessions are limited to 50 and are development-only, without durable storage. Recordings are not saved by this app. Audio goes to Sarvam; transcripts, requirements, conversation and catalogue data go to Google Gemini. Provider retention policies apply. Cancelling an in-flight request does not guarantee provider cancellation; an initial response discarded before its session ID reaches the browser may remain until session expiry.

Playback may require **Replay reply** if the browser blocks autoplay. Speech synthesis failure preserves the localized text and session, pauses the loop and shows a warning. Gemini transient HTTP failures get one bounded retry. Replies involve sequential network calls and are not instantaneous. Restart `npm run dev:voice` after code or environment changes.

The backend binds only to `127.0.0.1:8787`, allows the exact origin `http://127.0.0.1:5173`, limits audio uploads to 2 MB and processes one request at a time. Use `VOICE_DEV_ORIGIN` to change the allowed development origin. Vite proxies `/api/voice` locally. This preview does not implement production authentication, quotas or an AWS endpoint; do not expose it publicly. Production needs an authenticated backend with quotas and HTTPS, plus a frontend route to that backend. Native Android microphone support has not been verified.

Validation: `npm run test:sales-bot` covers multi-turn state, language changes, bundle validation and speech routing with mocked providers. Browser voice tests mock audio devices/providers to check session reuse, automatic next-turn listening, pause and clear. These do not replace microphone/hardware testing.

Implementation references reviewed: [Sarvam WhatsApp cookbook](https://docs.sarvam.ai/api/cookbook/guides/whats-app-bot) (detected STT language routed into TTS and graceful text fallback), [Pipecat integration](https://docs.sarvam.ai/api/integration/build-voice-agent-with-pipecat) (user/assistant context aggregation), and [official cookbook source](https://github.com/sarvamai/sarvam-ai-cookbook). The local TypeScript/Node implementation adapts these patterns and keeps Gemini for reasoning; it does not install Pipecat or introduce telephony/Daily services.

Official APIs: https://ai.google.dev/api and https://docs.sarvam.ai/api-reference/authentication

## Response time

Discovery replies combine extraction and the follow-up in one Gemini request. Short, unambiguous English/Hindi answers to the exact pending budget, employee, site, tier or GSTIN question can update the profile locally without a Gemini request. Corrections, added requirements, language switches, other languages and final bundle selection still use Gemini. The structured profile is retained; only the last two exchanges and a compact catalogue representation are sent to the model. Validated bundle narration remains a separate call.

Only fixed local follow-up audio is cached (bounded in-memory cache); personalized speech is not cached. Each voice response contains `reasoningRoute` and `timings` for speech recognition, reasoning, synthesis and total backend time. These exclude the user's pause and upload/playback time. Silence is already suppressed by the browser and empty transcripts do not call Gemini. A live timing probe encountered Gemini HTTP 429, so no real-world speedup percentage is claimed; provider throttling still affects latency. Restart the voice backend after applying these changes.

Gemini HTTP 429 handling distinguishes daily quotas from temporary rate limits using provider quota metadata. It does not immediately retry 429 responses; it caches a credential/model-scoped cooldown and returns a clear explanation and retry delay when supplied. Changing an API key in the same project does not change that project's quota. Review Gemini API usage/billing in Google AI Studio or wait for the provider's reset window. Billing changes are not performed by this application.

## Gemini key rotation

Set `GEMINI_API_KEY` and optionally `GEMINI_API_KEY_2` in ignored `.env.local` (or `.env`). The voice backend and CLI load `.env` first, then `.env.local`; already-exported shell variables take precedence. Each model request selects the next distinct configured key. Quota-cooled keys are skipped, and a 429 can try the other key once; if both are exhausted, the request stops with the quota explanation. Blank/duplicate keys are ignored. No keys are sent to the browser or logged. Restart the voice backend after changing keys. Keys in the same Google project still share project quotas; rotation does not create additional quota.
