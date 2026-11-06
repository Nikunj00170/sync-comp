# Smart KYC and external integrations

Audit date: 6 November 2026. Scope: repository evidence only; no AWS account inspection, deployment, application changes, or provider calls. Line references refer to the audited source snapshot.

Evidence labels: **VERIFIED IN CODE** = directly inspected implementation/data; **DOCUMENTED ONLY** = assertion/design in project documentation; **PARTIALLY IMPLEMENTED** = only some required behavior exists; **MOCKED** = local/synthetic behavior; **NOT IMPLEMENTED** = no implementation found; **UNVERIFIED** = cannot establish from available evidence. Recommendations and proposed schemas below are future design, not deployed facts.


## Existing source and data

MOCKED Verification.tsx:24 accepts browser metadata MIME application/pdf,image/png,image/jpeg, size<=10*1024*1024, appends metadata and slices first8 documents. Zero-size and duplicate files are not rejected. It never reads/uploads bytes. Sample button creates two fictional PDF metadata entries, not files. verify:52 requires provider+consent+>=2 metadata records and writes demo_verified/time/notification; no identifier, OCR, document-class, expiry, provider or registry check. Kyc type only pending|demo_verified; consent is one mutable boolean, provider digio|digilocker|null. No consent version/audit/revocation history. Existing UI states cannot represent pending OCR/manual review/live verified.

VERIFIED IN CODE datasets: 3534 GSTIN JSON/CSV rows; fields gstin, legal_name, trade_name, constitution, principal_place_of_business, state, registration_date, status. 2723 Udyam rows; fields udyam_number, enterprise_name, enterprise_type, major_activity, nic_description, state, city, date_of_registration. Audit validation: all3534 GSTINs match the proposed structural regex and checksum algorithm below. Registry status values are exactly Active(3266), Suspended(101), Cancelled(167); mock lookup must preserve this evidence and map only Active to active. All2723 Udyam identifiers match the proposed structural pattern. These checks prove synthetic-data consistency, not live-government validity. No backend lookup code. Historical JSON contains segments/totalLeads/activated/dropReasons, not predictive advisor model. 5000 leads contain language, business/registration/funnel/outcome data; not imported into browser and not live customer accounts.

47 PNG specimens physically in case_source/kyc_documents, K01–K12; each applicant has GST certificate/signatory ID/address proof, Udyam present except K05. No fixtures directory or manifest of expected applicant outcomes. Local tesseract OCR was run read-only on all47 as audit aid; successful process exit does not mean valid text. OCR-observed findings below are provisional and require visual/registry confirmation; these are not automated product behavior or authoritative fixture labels.

| Applicant | Available files | Audit observation / evidence boundary |
| --- | --- | --- |
| K01 | GST,Udyam,signatory,address | Four specimen types; OCR did not recover Udyam number in default pass; outcome UNVERIFIED |
| K02 | GST,Udyam,signatory,address | GST default OCR recovered mostly field labels; suspect degraded/rotated image, not proof of failure |
| K03 | GST,Udyam,signatory,address | OCR extracted fields; verify exact GST characters/checksum against registry, outcome UNVERIFIED |
| K04 | GST,Udyam,signatory,address | GST default OCR empty; require robust extraction/manual review, not automatic approval |
| K05 | GST,signatory,address | Udyam image absent; whether Udyam mandatory depends on product/workflow, not blanket rejection |
| K06 | GST,Udyam,signatory,address | GST OCR starts O8 rather than numeric08, illustrating OCR ambiguity; compare actual image/registry |
| K07 | GST,Udyam,signatory,address | OCR legal-name parenthetical refers to Shri while trade name refers to Neelgiri; legal/trade names can differ, compare registry before mismatch classification |
| K08 | GST,Udyam,signatory,address | OCR GST has ambiguous0/O; outcome UNVERIFIED |
| K09 | GST,Udyam,signatory,address | Four types, outcome UNVERIFIED |
| K10 | GST,Udyam,signatory,address | Four types, outcome UNVERIFIED |
| K11 | GST,Udyam,signatory,address | Address bill date OCR2025-10-31, older than90days at fixture clock2026-07-15; candidate stale-proof test after confirmation |
| K12 | GST,Udyam,signatory,address | Four types, outcome UNVERIFIED |

The guide case_source/README.md defines fixture date2026-07-15, fictional PAN fourth-character X and Udyam district00. Those are DOCUMENTED ONLY input conventions verified as guide text, not authorization to change real clock or validate live identities. Use injectable Clock and explicit mock validator. Raw GST fields may be misread by OCR; never silently change O to0 or modify checksum to force a match. No ground-truth labels exist for automatic pass/fail assignment.

## Proposed verification models (NOT IMPLEMENTED)

KycSession={id,provider:digio|digilocker,mode:mock|live,status:pending_consent|awaiting_documents|processing|needs_correction|manual_review|verified|rejected,consentId?:string,documentIds:string[],checks:CheckResult[],version:number,createdAt,updatedAt,verifiedAt?:string}. Keep demo_verified only inside demo repository, never map automatically to live verified.

DocumentStatus={id,name,type,size,uploadedAt,status:pending_upload|uploaded|quarantined|processing|processed|rejected,documentType?:gst_certificate|udyam_certificate|signatory_id|address_proof,checks:CheckResult[],version:number}. CheckResult={code,outcome:pass|fail|unknown,field?:string,message,confidence?:number,evidenceRef?:string}; evidenceRef is authorized server-side reference, not public S3 path. RegistryResult={mode,found:boolean,status:active|inactive|unknown,matchedFields:object,checks:CheckResult[],checkedAt:string}; normalized status mapping must reflect actual fixture values/provider contract, never assume a Udyam GST-style active flag when none exists.

## Required end-to-end flow

1. Authenticated owner creates session/provider choice. Record versioned purpose-specific notice/consent before retrieval/upload/processing; mock and live choices clearly separated server-side.
2. Capture GSTIN/Udyam inputs (new UI fields). Normalize uppercase/trim without discarding meaningful internal characters; validate syntax/checksum/mode before lookup. Only return permitted customer-facing registry fields, mask logs and rate-limit enumeration.
3. Generate owned object-specific upload URL, accept direct private S3 file, completion validates actual size/MIME/magic and malware/quarantine; store declared versus measured metadata and digest. Existing metadata picker cannot substitute for this.
4. Write durable job record and enqueue SQS; worker checks owner/session/document version, consent still valid and dedup key. Repeated events must not launch duplicate OCR/provider submissions. Retry transient failures with bounded receive count/DLQ; persist failure state and re-drive deliberately.
5. OCR via Textract abstraction yields text fields, locations/confidence and job reference; raw result private S3, small structured checks DynamoDB. For asynchronous Textract, coordinate Start/Get completion through suitable polling/notification workflow; do not assume SQS alone reports Textract completion. Separate multi-page PDF handling from simple image detection; choose API by actual input and service limits.
6. Compare identifiers to submitted/registry value, legal/trade business names with defined normalization, state/city/address and signatory affiliation, registry status/registration dates, ID expiry, address proof freshness. Name differences and OCR ambiguity produce explainable unknown/manual_review, never hallucinated approval. Thresholds and address match policy require approved fixtures.
7. Persist per-check evidence/outcome/version. Strong matches can approve only under defined policy; missing/expired/mismatched documents trigger correction/review/rejection. Reviewer identity/role/decision/reasons recorded; review UI is absent and separate from customer status API.
8. Signed provider callbacks correlate session/mode and dedup event ID. Provider success does not automatically establish all product-specific KYC conditions. Customer polls session state; only server verified live evidence can unlock live checkout.
9. Retention/deletion/revocation cover source, derived OCR, provider evidence, logs and object versions. No duration is established; choose before live document collection. No identity documents in advisor prompts.

## Validation policy specification

GSTIN syntax/checksum validation NOT IMPLEMENTED. Proposed validator: 15 uppercase characters, first2 state code, next10 PAN-shape, entity registration character, reserved position and base36 checksum. Candidate structural pattern for tests: [0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]. Apply state/PAN-entity semantic rules separately by mode; guide's X marker must be allowed only in mock fixtures. Proposed common checksum algorithm: map 0–9/A–Z to0–35, traverse first14 right-to-left with factors2,1 alternating, sum quotient+remainder of each product divided by36, expected check=(36-sum%36)%36. This is an implementation candidate, not a repo rule or certified GST specification; The audit confirmed this candidate against all3534 supplied registry rows (all passed); add approved authoritative/nonfixture and intentionally invalid vectors before live acceptance. Do not repair bad identifiers. Valid checksum is not registration verification.

Udyam syntax proposed UDYAM-[A-Z]{2}-[0-9]{2}-[0-9]{7}; fixture district00 allowed only mock. No checksum implementation or district/state reference exists in repository; do not invent one. Live provider verification/reference required. Mock lookup indexes supplied registry by exact normalized identifier; found/notfound/inactive/field mismatch are distinct outcomes. Registry guide's date90days rule is fixture policy; live proof freshness/ID expiry/timezone/threshold need owner approval. Use fixture Clock2026-07-15 in mock tests and current server clock live. Never reject all fixtures using audit date instead.

## AWS/provider boundaries

S3 diagnostic exists; upload integration absent. SQS/DLQ, event source, worker, Textract permissions/job model all NOT IMPLEMENTED. Java S3/SQS/Textract SDK v2 clients behind integration interfaces; worker runtime role allowed only selected input/output prefixes, queues, KMS if applicable and chosen Textract actions. Set visibility longer than processing window with controlled retries; async OCR state must survive worker restart.

Digio and direct DigiLocker are two MOCKED labels, not API integrations. Required adapter interface: beginSession, consent/retrieval redirect if provider requires, pollResult, verifyWebhook, normalizeEvidence. Credentials, scopes, sandbox/live endpoints, callback signing, document categories, allowed purposes, failure semantics and onboarding agreements are missing. No callback payloads or provider IDs can be specified as existing facts. Payments likewise only local simulation; choose provider before defining webhook DTO/signature. Speech/model integrations only planned. Keep mock adapters deterministic and explicitly labelled; no paid/external transaction in this audit.
