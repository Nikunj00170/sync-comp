# Business logic and Java parity map

Audit date: 6 November 2026. Scope: repository evidence only; no AWS account inspection, deployment, application changes, or provider calls. Line references refer to the audited source snapshot.

Evidence labels: **VERIFIED IN CODE** = directly inspected implementation/data; **DOCUMENTED ONLY** = assertion/design in project documentation; **PARTIALLY IMPLEMENTED** = only some required behavior exists; **MOCKED** = local/synthetic behavior; **NOT IMPLEMENTED** = no implementation found; **UNVERIFIED** = cannot establish from available evidence. Recommendations and proposed schemas below are future design, not deployed facts.


## Canonical rules (VERIFIED IN CODE)

Source packages/domain/src/index.ts; exact exported types are in 02. The prepared catalogue is cast to Product[] with no runtime catalogue schema. Raw CSV monetary fields are INR; prepared JSON monetary fields are paise. CATALOGUE_VERSION is case-2026-07-v1 and DEMO_TAX_BPS=1800. Profile.budget is INR (Discover.tsx:171 compares monthly to budget*100). Never multiply JSON prices a second time.

profileSchema:25 trims name/business/city, lengths 2–70/2–100/2–70; email validates syntax; industry exactly professional|retail|manufacturing|hospitality; tier coerced integer 1–2; employees coerced integer 1–1000; sites 1–100; budget 500–1000000 integer; hasGstin boolean; priorities nonempty string array with no enum or uniqueness check; address string max250 and phone string max20 (both may be empty, no phone syntax). No GSTIN/UDYAM identifier is stored on Profile. Server must validate equivalent fields, while deciding explicitly whether to accept numeric strings like Zod coercion.

Eligibility is only tiers.includes(tier), employees>=minEmployees, sites>=minSites, and boolean hasGstin when required. segments is descriptive, not a filter. Dataset guide demands valid active GSTIN, but implementation merely tests self-declaration. Live server must derive registration evidence from verified KYC as an explicit security strengthening, with separate parity tests.

Default quantities: per site→sites; per user/per device/per line→employees; all other exact unit strings→1. No min/max seat licensing special cases. Cart add clones existing lines, errors for unknown/ineligible product, adds only if absent (does not increment an existing line). dependencies are OR: reuse any dependency already present; otherwise choose eligible dependency with lowest UNIT price and recursively add. It does not optimize quantity-adjusted total, setup or contract cost. Existing invalid dependency quantity can satisfy the presence test but quote validation still reports its quantity error. No recursion cycle protection; current data must be validated before extension. Cart remove drops requested ID then repeatedly drops unknown products or add-ons without ANY remaining compatible dependency, until stable.

Quote iterates lines in order. Unknown products, duplicates and noninteger/outside1–1000 quantities yield errors and skip arithmetic for that line. Duplicate detection uses seen set before quantity validation, so a bad first occurrence still makes a later occurrence duplicate. Eligibility errors and missing-dependency errors are appended but those lines still contribute money. Input lines are cloned into response including invalid ones; quote does not silently repair cart. Empty cart yields zero totals/errors[]; makeOrder separately rejects it. Monthly=Σ(price*quantity), setup=Σ(setup*quantity), tax=Math.round(monthly*1800/10000), total=monthly+tax. Setup is not in total or tax. Java long arithmetic with checked overflow and nonnegative integer half-up rounding must match Math.round. priceMax is unused. Contract months/installDays are UI metadata; no commitment, pro-rata, penalty, annual total, activation ETA or contractual calculation exists.

Recommendations: base P06 only if manufacturing AND employees>=25 AND budget>=30000 INR AND hasGstin; else P02 if employees>5, else P01. essential=[base]. recommended=[base, P16 if productivity, P20 if security, P09 if reliability, P19 if retail]. growth=[base,P16,P17,P20,P10 if sites>=3 else P22]. Deduplicate IDs preserving order, omit ineligible IDs, use addToCart for dependency insertion, then quote. Returned ids retain the original group list (even if filtered), lines are actual selected cart. No ranking model/LLM, no hard budget cap; Discover labels within/above budget. growth priority has no direct selection branch. Preserve exact group copy/IDs in Java response or expose a stable presentation mapping.

Order steps: received→verification→confirmed→scheduled→installing→active; cancelled is terminal outside steps. nextOrder forbids active/cancelled and appends simulated event using current time. It assumes valid input enum. cancelOrder forbids active/installing/cancelled; accepts received/verification/confirmed/scheduled, appends event. makeOrder requires demo_verified (not merely consent), nonempty valid quote; creates SYNC ID, one-product name or Your business bundle, ISO timestamp, received, cloned quote lines, address or city fallback, empty slot and demo event. It does not enforce nonempty address itself (Checkout button does) or consent/provider/document evidence. No per-service lifecycle in current Order type; documentation's service lifecycle is proposed.

makeInvoice rejects quote errors (but accepts empty lines), produces INV ID, supplied period, current issuedAt, dueAt exactly seven elapsed days later, unpaid, customer billing snapshot, line snapshots name/unitPrice/category/unit and monthly subtotal/tax/total. No setup lines, statutory tax breakdown, billing account aggregation, payment verification or invoice generation scheduler. Local Services mutates active order quote/lines only; existing invoices unchanged. Billing payDemo directly marks paid with DEMO-PAY reference. Demo IDs use prefix + '-' + first8 uppercase characters of crypto.randomUUID: no uniqueness guarantee beyond random space; server should use full UUID/ULID with conditional uniqueness.

## Every exported function and proposed Java equivalent

| TS export / line | Behavior | Java equivalent / placement |
| --- | --- | --- |
| money:145 | INR Intl formatting paise/100, zero minimum decimals and max2 or0 | Keep UI; optional MoneyFormatter only for server documents |
| productById:153 | First catalogue match or undefined | CatalogueService.findById → Optional<Product> |
| eligibility:154 | Ordered human-readable rejection list: tier, employees, sites, GST | EligibilityService.reasons |
| defaultQuantity:164 | Exact unit mapping above | QuantityPolicy.defaultQuantity |
| addToCart:170 | Immutable idempotent add + cheapest eligible OR dependency | CartService.add with cycle guard as explicit enhancement |
| removeFromCart:187 | Cascading fixed-point removal | CartService.remove |
| quote:202 | Errors and integer-paise totals, original cloned lines | QuoteService.calculate |
| recommendations:239 | Three deterministic groups, eligibility/dependency enrichment | RecommendationService.recommend |
| nextOrder:286 | Sequential mock advance + event | OrderTransitionService.advance for trusted workflow role; no public customer advance |
| cancelOrder:303 | State-constrained cancel + event | OrderService.cancel with owner/version checks |
| makeId:319 | Short random demo ID | IdGenerator full server UUID/ULID; retain display prefix |
| makeOrder:321 | Demo KYC gate, quote validation, snapshot creation | OrderService.create; live verified-state policy replaces demo gate explicitly |
| makeInvoice:345 | Invoice snapshot and seven-day due | InvoiceService.issue with injected Clock |
| initialWorkspace:369 | Fixed synthetic profile, active/scheduled orders, two invoices, notifications and default preferences with relative dates | DemoFixtureFactory/test profile only; never initialize live customers with fictional orders |
| localDateTime:485 | Local calendar datetime string, invalid input→empty | Keep browser input utility; Instant/ZoneId conversion for backend scheduling |

Other exports: Product/Profile/CartLine/Quote/OrderStatus/TimelineEvent/Order/InvoiceLine/Invoice/DocumentMeta/Kyc/Ticket/Notification/Workspace→Java model/DTO records; catalogue→versioned server resource; profileSchema→Jakarta validators/custom rules; orderSteps/statusLabels→OrderStatus and presentation labels; CATALOGUE_VERSION/DEMO_TAX_BPS→versioned catalogue/pricing policy. No other exported domain functions exist.

## Complete catalogue rule matrix (VERIFIED IN CODE)

All monetary columns below are paise. tiers, minima, GST boolean and dependency list are the exact prepared JSON. Units govern default quantities. Refer to shared/data/catalogue.json for description/category/segments and raw CSV for original INR ranges.

| ID/name | Unit | price / max / setup | Contract months / install days | Tiers | Min employees/sites | GST | OR dependency IDs |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P01 Biz Fibre 100 | per site | 99900 / 119900 / 0 | 12 / 5 | 1,2 | 1 / 1 | false | — |
| P02 Biz Fibre 300 | per site | 149900 / 179900 / 0 | 12 / 5 | 1,2 | 1 / 1 | false | — |
| P03 Biz Fibre 1G | per site | 399900 / 449900 / 0 | 12 / 7 | 1 | 5 / 1 | true | — |
| P04 Biz 5G AirFiber 100 | per site | 89900 / 109900 / 0 | 6 / 2 | 1,2 | 1 / 1 | false | — |
| P05 Internet Leased Line 20 | per site | 800000 / 1200000 / 1000000 | 12 / 21 | 1,2 | 10 / 1 | true | — |
| P06 Internet Leased Line 100 | per site | 2500000 / 3500000 / 1500000 | 24 / 30 | 1,2 | 25 / 1 | true | — |
| P07 Business Postpaid 299 | per line | 29900 / 39900 / 0 | 1 / 1 | 1,2 | 1 / 1 | false | — |
| P08 Business Postpaid 599 | per line | 59900 / 79900 / 0 | 1 / 1 | 1,2 | 1 / 1 | false | — |
| P09 Backup 4G/5G Failover | per site | 49900 / 59900 / 150000 | 12 / 3 | 1,2 | 1 / 1 | false | P01,P02,P03,P05,P06 |
| P10 Managed SD-WAN | per site | 250000 / 350000 / 500000 | 24 / 14 | 1,2 | 10 / 3 | true | P01,P02,P03,P05,P06 |
| P11 Static IP | per IP | 20000 / 30000 / 0 | 12 / 1 | 1,2 | 1 / 1 | false | P01,P02,P03 |
| P12 Cloud Telephony / SIP | per channel | 100000 / 150000 / 200000 | 12 / 5 | 1,2 | 3 / 1 | true | P01,P02,P03,P04,P05,P06 |
| P13 Toll-free Number | per number | 150000 / 200000 / 100000 | 12 / 3 | 1,2 | 1 / 1 | true | — |
| P14 Business SMS 10k | per pack | 150000 / 200000 / 0 | 1 / 4 | 1,2 | 1 / 1 | true | — |
| P15 WhatsApp Business API Starter | per account | 99900 / 149900 / 0 | 3 / 3 | 1,2 | 1 / 1 | true | — |
| P16 Cloud Email & Office Suite | per user | 12500 / 15000 / 0 | 12 / 1 | 1,2 | 1 / 1 | false | — |
| P17 Cloud Backup 1 TB | per account | 49900 / 69900 / 0 | 12 / 1 | 1,2 | 1 / 1 | false | — |
| P18 Website + Domain Starter | per account | 29900 / 49900 / 0 | 12 / 2 | 1,2 | 1 / 1 | false | — |
| P19 Cloud POS & Billing | per counter | 59900 / 89900 / 250000 | 12 / 3 | 1,2 | 1 / 1 | false | — |
| P20 Endpoint Security | per device | 9900 / 14900 / 0 | 12 / 1 | 1,2 | 1 / 1 | false | — |
| P21 Managed Firewall | per site | 199900 / 299900 / 400000 | 24 / 10 | 1,2 | 10 / 1 | true | P01,P02,P03,P05,P06 |
| P22 Secure Wi-Fi with Guest Network | per site | 39900 / 59900 / 100000 | 12 / 3 | 1,2 | 1 / 1 | false | P01,P02,P03,P04 |
| P23 Cloud CCTV | per camera | 19900 / 29900 / 180000 | 12 / 4 | 1,2 | 1 / 1 | false | P01,P02,P03,P04,P05,P06 |
| P24 Machine Monitoring IoT | per device | 14900 / 24900 / 300000 | 24 / 10 | 1,2 | 10 / 1 | true | — |
| P25 Fleet Tracker | per vehicle | 19900 / 29900 / 150000 | 12 / 3 | 1,2 | 1 / 1 | false | — |

## Ownership of logic after migration

Server authoritative: profile validation, catalogue version, eligibility evidence, dependency checks, quote arithmetic/snapshots, order creation/transitions, invoice issuance, payment/KYC state and ID generation. UI can retain formatting, drafts, filters/comparison, preview eligibility/quantity/cart and deterministic demo rules; require authoritative recalculation before a live purchase. Keep TS golden vectors and Java parity tests synchronized; do not drop packages/domain. Explicitly label changes to GST evidence, accepted quantity coercion, ID format or live lifecycle semantics.
