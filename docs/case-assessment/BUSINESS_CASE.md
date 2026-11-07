---
marp: true
title: Project Udyam Digital — Accel Telecom / Airtel SYNC
---
# 1. A shorter path to business connectivity

A phone-first prototype that discovers needs in the owner's language, explains catalogue bundles, checks synthetic KYC and tracks a demo order.

Pilot hypothesis: clearer pricing and fewer repeated document requests will improve completion. Targets below are proposals, not measured product results.

---
# 2. Where the current funnel loses customers

Supplied quarter: 5,000 leads → 3,406 contacted → 1,974 assessed → 861 quotes accepted → 588 KYC complete → 368 activated.

Baseline conversion: **7.36%**. Average activation: **17.62 days**, follow-up calls: **3.01**. Blended CAC: **₹15,053** per activation. Six-month churn among activated records: **15.22%**.

Source: supplied `smb_leads.csv`, reproduced in `data-audit.json`. Correlations are descriptive, not proof of causation.

---
# 3. Start with professional offices

| Segment | Leads | Activation | Median activated monthly bundle |
| --- | ---: | ---: | ---: |
| Professional offices | 1,247 | 11.07% | ₹6,575 |
| Micro retail & services | 2,709 | 4.06% | ₹2,470 |
| Small multi-site | 755 | 10.99% | ₹28,080 |
| Small manufacturers | 289 | 12.80% | ₹15,910 |

Pilot offices for a simpler single-site buying motion; expand micro retail with lighter bundles and partner help. Multi-site/manufacturing need installation and security consultation.

---
# 4. Three transparent starting bundles

| Example, subject to catalogue eligibility | Monthly range before tax | Minimum terms |
| --- | ---: | --- |
| Retail: P01 fibre + P19 POS, one site/counter | ₹1,598–2,098 | 12 months |
| Office: P02 fibre + P16 office × 10 users | ₹2,749–3,299 | 12 months |
| Two-site: P02 × 2 + P09 backup × 2 | ₹3,996–4,796 | 12 months |

Counts require confirmation; do not infer licenses from employees. Setup fees remain separate at checkout. Catalogued terms are preserved; no invented discounts. Manufacturer proposal uses a reviewed leased-line/security/IoT selection after GST and quantity checks.

---
# 5. Conversation in the owner's language

GenAI chat or optional voice asks business type, current tools, needs, team, sites, city tier, GST status and budget. English, Hindi and Marathi interface; speech/conversation supports the configured regional provider languages.

Catalogue IDs, dependencies and quantities are validated. Review uses the canonical server quote; model-proposed prices never determine checkout. Questionnaire remains available when AI credentials, quota or connectivity fail.

---
# 6. Smart KYC with clear consent

Private upload → consent → OCR → synthetic GST/Udyam registry checks → masked findings → approval or review.

Validate checksum, Active GST status, names/addresses, required signatory evidence and the 90-day address-proof rule at the fixture date. Unknown or ambiguous text needs review. DigiLocker retrieval/e-sign are future live-provider integrations, clearly labelled today.

---
# 7. Field sales and partners

Use self-service for straightforward discovery and progress visibility. Field teams handle connectivity feasibility, multiple sites, inconsistent documents and customers who want help.

Proposed pilot operating model: customer-owned support request captures the issue; sales follows up through existing CRM after consent. Credit the originating partner and measure assisted vs self-service conversion. A lead propensity backoffice is optional stretch work and is not included in this prototype.

---
# 8. Five pilot metrics

| Metric | Dataset baseline | Proposed pilot target |
| --- | ---: | ---: |
| Lead-to-activation | 7.36% | ≥10% |
| Mean lead-to-activation | 17.62 days | ≤7 days |
| Blended acquisition cost | ₹15,053 | ≤₹12,000 |
| Customer follow-up calls | 3.01 | ≤1.5 |
| Six-month activated churn | 15.22% | ≤12% |

Track weekly cohorts by segment/language/channel with an assisted-control comparison. Physical installation may exceed one sitting; assess discovery, quote and KYC time separately. Churn needs six months of observation.

---
# 9. Rollout and economics

Weeks 1–2: deploy secure APIs, validate IAM/storage/Cognito, onboard trained support, test real identity provider sandbox. Weeks 3–6: proposed 200-office pilot with clear demo/live separation and funnel instrumentation. Weeks 7–12: expand to micro retail only after review, capacity and support checks.

Illustrative 5,000-lead scenario: 10% conversion means 500 activations vs 368 baseline; ₹12,000 CAC implies ₹6m acquisition spend vs ₹5.54m baseline spend. Unit CAC falls while total spend rises. No margin/ROI claim without gross margins, installation cost and measured retention.

---
# 10. Risks and deployment decisions

OCR ambiguity → review, never guessed approval. AI hallucination → catalogue constraints and server prices. Consent/retention → separate consent, masking, deletion and approved lifecycle configuration. Supply feasibility → confirm installation before commitment.

Ready in code: integrated customer journeys, Smart KYC fixtures, multilingual UI, tests. Still required externally: deploy Spring backend and customer build, configure private AWS access/CORS, host an authenticated AI gateway, and contract live KYC/e-sign/provisioning providers before real purchases.
