# AI business advisor specification

Audit date: 6 November 2026. Scope: repository evidence only; no AWS account inspection, deployment, application changes, or provider calls. Line references refer to the audited source snapshot.

Evidence labels: **VERIFIED IN CODE** = directly inspected implementation/data; **DOCUMENTED ONLY** = assertion/design in project documentation; **PARTIALLY IMPLEMENTED** = only some required behavior exists; **MOCKED** = local/synthetic behavior; **NOT IMPLEMENTED** = no implementation found; **UNVERIFIED** = cannot establish from available evidence. Recommendations and proposed schemas below are future design, not deployed facts.


## Existing implementation

VERIFIED IN CODE: Discover.tsx:19–96 priorities and three-step questionnaire validate Profile, save draft/profile and call recommendations locally. Results compare recurring monthly paise to INR budget*100 and replace cart. App.tsx:416 onward renders a voice Coming Soon modal linking back to /discover. Dashboard opens it. No chat messages, sessions, AI client, model calls, tool execution, transcript, language field or speech capture. reference scaffold's openai dependency is not active integration. API adapter has no advisor routes. Requirement collection/recommendation is implemented deterministically; AI conversation is NOT IMPLEMENTED.

## Proposed minimal architecture (NOT IMPLEMENTED)

AdvisorController → AdvisorService → LlmGateway, ProfileExtractionValidator, RecommendationService and QuoteService. ConversationRepository persists bounded session/message records in customers table with owner, expiry and optimistic revision. LLM provider configured server-side, never browser secrets. Keep synchronous bounded typed turns first; asynchronous jobs for turns exceeding request deadline. No long-lived audio connection on initial Lambda path.

Use natural language English/Hindi first; preserve original user wording, selected language and normalized canonical enum values separately. Ask for one or two highest-priority missing facts each turn. Required recommendation input is industry/city/tier/employees/sites/budget/hasGstin/priorities; contact name/business/email may be requested later but complete Profile schema currently requires them for profile save. Do not fabricate defaults to satisfy schema. Draft DTO is partial and tri-state hasGstin may be unknown. Backend maps city to an approved tier reference or asks user to confirm; no city-tier database is provided. Extract numbers with explicit units (budget INR/month); reject/conflict-confirm ambiguous site/team size. User confirmation is required before saving materially changed profile or accepting a quote.

## New API and DTO contract

All endpoints require valid access token and session owner, normal errors/statuses in 02. Proposed limits: message<=4000 Unicode characters, max100 stored turns, bounded recent context plus versioned summary, max3 tool steps per turn, request deadline under15s with typed fallback. These are configurable starting limits, not repository rules.

| Method/path | Request | Response / persistence |
| --- | --- | --- |
| POST /v1/advisor/sessions | {language:en|hi,profileDraft?:Partial<Profile>} | 201 AdvisorSession; persist ownership, revision0 and initial missingFields |
| GET /v1/advisor/sessions/{id} | none | 200 AdvisorSession plus bounded latest messages; owner read |
| POST /v1/advisor/sessions/{id}/messages | {clientMessageId:string,revision:number,text:string,language?:string} + Idempotency-Key | 200 AdvisorTurn; dedup client message, conditional revision, persist response/tool trace |
| PUT /v1/advisor/sessions/{id}/profile | {revision:number,patch:Partial<Profile>,confirmedFields:string[]} | 200 AdvisorSession; validate allowed field patch, do not accept owner/prices/status |
| DELETE /v1/advisor/sessions/{id} | none | 200 {deleted:true}; apply transcript retention policy |

AdvisorSession={id,language,status:collecting|ready|closed,revision,profileDraft:Partial<Profile>,confirmedFields:string[],missingFields:string[],createdAt,updatedAt,expiresAt}. AdvisorMessage={id,sequence,role:user|assistant,text,language,createdAt}; system/tool messages are internal. AdvisorTurn={sessionId,revision,assistantMessage:AdvisorMessage,profilePatch:Partial<Profile>,missingFields:string[],questions:[{field,text,options?:string[]}],recommendations?:RecommendationBundle[],quote?:Quote,actions:[{type:confirm_profile|show_bundle|open_checkout|retry,referenceId?:string}],warnings:[{code,message}]}. RecommendationBundle preserves the exact domain group fields in 02. Quote remains existing shape, optional server quoteId/expiry only through additive contract agreement. New IDs are server-generated; no implementation exists.

## Tool/function design

LLM may request only allowlisted schema-validated tools; Java checks session ownership/confirmed profile before execution:

- get_catalogue({version?,productIds?}) → selected canonical products; restrict token volume, no registry/KYC content.
- validate_profile({patch}) → normalized allowed fields/conflicts/missing requirements; no persistence side effect without confirmed fields.
- check_eligibility({productIds}) → reasons for server/session profile, not arbitrary model approval.
- recommend_products({}) → deterministic RecommendationService output for validated profile.
- calculate_quote({lines}) → QuoteService with server product IDs/prices/dependencies/version; model cannot submit price/tax/total.

Tools are read-only or draft-only; no payment/verification/activation/order placement tool. Server verifies tool names, argument size/types/product IDs/quantities and call budget. Model cannot execute arbitrary URLs, SQL, file paths, AWS operations or change identity. Treat user text/catalogue prose/OCR as untrusted content, not tool authorization. Never allow an LLM to invent eligibility, override a failed quote or promise pricing outside response data. Backend builds structured quote/cards directly from tool result, not regenerated model amounts.

## Prompt and provider management

Version system prompts as resources/prompts/advisor/system-v1.txt and extraction schema resources/contracts/advisor-turn.json. Record prompt/schema/catalogue/provider/model version in internal turn metadata; redact PII. Separate requirements extraction from rule execution and explanatory prose. Require structured output, validate JSON DTO and reject unknown fields; one bounded repair attempt then deterministic questionnaire fallback. Conflict between generated explanation and service result → service result wins, show neutral explanation.

LlmGateway abstraction: structured completion(messages,tools,schema,deadline) → normalized result/usage; HTTP implementation behind provider interface, credentials through secret provider, connect/read timeout, bounded exponential retry only where safe, provider request IDs and usage metrics. Compare Spring AI versus direct HTTP: Spring AI simplifies tool/advisor abstractions and multi-provider switching, but compatible BOM/Boot3 patch/model feature support must be verified. Direct HTTP offers smaller explicit dependency surface for one provider/strict schemas; initial recommendation is direct HTTP behind LlmGateway, reconsider after a compatibility spike. This is not a pinned Spring AI version recommendation.

Persist each validated turn and replay by clientMessageId after ambiguous timeout. Serialize revision updates to avoid two turns overwriting profile; return409 for stale state. Mark provider failure without erasing confirmed fields. 429 includes Retry-After, 503 unavailable with questionnaire fallback action. Enforce per-sub/session token and request budgets, global spend/concurrency caps, max context/tool iterations, and backend feature flag. Do not rely on browser flags. Limit logs to IDs/latency/token usage, not full raw conversations by default. Consent/deletion/TTL duration requires owner decision; TTL alone is not immediate deletion.

## Language and future voice

Hindi uses Unicode DTOs and translated questions/reasons with stable codes, not translated product IDs. Add reviewed regional-language packs when provider quality is validated; persist BCP47 language tags as contract evolves. No model/locale support has been tested. Voice uses the same session and text-turn contracts: short recorded input → Sarvam STT adapter → validated advisor turn → optional TTS. Microphone consent, audio retention, capability flag, server admission, codec/size limits and typed fallback are prerequisites. Telephone remains Coming Soon. Never send raw KYC documents to general advisor model.

## Acceptance

English/Hindi multi-turn extraction handles missing/ambiguous fields; session survives reload via authenticated repository; injected text cannot bypass tools; unknown product and invented price are rejected; same confirmed profile produces identical questionnaire and chat bundles/totals; retries don't duplicate turns; concurrent revisions conflict; rate/provider errors leave draft usable; mock/live identity and session ownership enforced. Use fake LlmGateway in deterministic tests; bounded credential-backed provider evaluation separately authorized.
