# Catalogue sales bot

Local, single-question text prototype using Sarvam chat and `case_source/product_catalogue.csv`. Requires Node 24+. No SDK installation is needed. Set `SARVAM_API_KEY` in ignored root `.env.local`; never prefix the key with `VITE_`. Gemini is not used.

Check the knowledge source without a provider call:

```sh
npm run sales:bot -- --check
```

Ask a question (sends the question and full product catalogue to Sarvam and consumes API credits):

```sh
npm run sales:bot -- "Compare Biz Fibre 100 and Biz Fibre 300"
npm run sales:bot -- "I need broadband for a small shop under INR 1200 a month"
```

The model selects up to five product IDs. Application code validates those IDs and renders descriptions, INR price ranges, billing units, setup fees, contracts, installation estimates, eligibility, dependencies and source references directly from CSV fields. Each option cites `case_source/product_catalogue.csv — product_id=Pxx`. The CSV uses rupees, unlike the existing shared JSON catalogue which uses paise. Editing the CSV takes effect on the next invocation.

For 25 rows, the entire catalogue fits in the prompt; no embeddings or vector database are necessary. Unsupported questions should return an explicit unknown response. Missing requirements should prompt qualification. Model selection and abstention remain probabilistic: citation validity prevents invented product facts but does not prove a recommendation satisfies the question. Qualify customers before quoting or ordering. Dependencies are displayed, not automatically bundled or priced.

## In-app voice preview

Start the local backend and the app in separate terminals:

```sh
npm run dev:voice
npm run dev
```

Open `http://127.0.0.1:5173`, choose **Say hello to a smarter start**, accept audio processing, and choose **Speak to advisor**. Allow microphone access, speak, then choose **Send question**. Recording automatically stops after 25 seconds. The reply plays aloud and the transcript and catalogue references appear below. Use **Stop** to stop recording/playback or discard a pending reply; **End call & clear** also removes the conversation from the UI. Closing the dialog releases the microphone and clears this component's in-memory conversation.

The pipeline is Sarvam Saaras v4 speech recognition → existing catalogue-grounded Sarvam chat → Bulbul v4 Flash speech synthesis. Replies are English fact cards even for multilingual questions. The last two turns are included as bounded context (maximum 2200 characters), so long conversations may lose earlier details. Recordings and conversations are not saved by this application; they are sent to Sarvam for processing. Provider retention policies apply. Stopping a pending request does not guarantee cancellation of processing already started at Sarvam.

This is turn-based voice, not full-duplex streaming, phone calling, or interruption detection. Playback may require **Replay reply** if the browser blocks autoplay. A speech synthesis failure keeps the text answer visible with a warning. Account access, actual speech quality, microphone hardware and live provider behavior require manual validation.

The backend binds only to `127.0.0.1:8787`, allows the exact origin `http://127.0.0.1:5173`, limits audio uploads to 2 MB and processes one request at a time. Use `VOICE_DEV_ORIGIN` to change the allowed development origin. Vite proxies `/api/voice` locally. This preview does not implement production authentication, quotas or an AWS endpoint; do not expose it publicly. Production needs an authenticated backend with quotas and HTTPS, plus a frontend route to that backend. Native Android microphone support has not been verified.

Validation: `npm run test:sales-bot` uses mocked provider responses; it does not verify live model quality or account access.

Official API: https://docs.sarvam.ai/api-reference/chat/chat-completions-v1
