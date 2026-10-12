# Candidate integration qualification — October 12, 2026

Baseline: local candidate `fcc01e5` (following initial qualification on `560f7b8`). Candidate local integration & full PayPal Sandbox buyer payment cycle: **PASS** (`INTEGRATION_TEST` and `END_TO_END`). Overall final publication qualification remains **BLOCKED** only on external hosting/judge-access and licence/entitlement decisions.

The owner chose the existing n8n instance. The real candidate Next.js gateway used its own operator session and signed assertions, a temporary copy of the candidate workflow, and a dedicated isolated PostgreSQL database (`payflow-candidate-20261012-560f7b8-postgres-1`). Existing native Gemini and PayPal credential references were reused without exporting their values. A loopback-only routing shim retained the candidate API configuration. This is not proof of independent provider setup on a new n8n installation.

## Observed successful integration & end-to-end checks

- The fresh database exposed the five repository seed products and initially zero orders.
- Actual English Gemini quotes (`models/gemini-3-flash-preview`, `INTEGRATION_TEST`):
  - Initial nominal quote: one case of Château Margaux at a 5% discount, USD 427.50, margin 32.16%, internally approved.
  - High-value HITL quote: three cases, USD 1,282.50, same margin, pending internal approval because the USD 1,000 threshold was exceeded.
  - **Corrected nominal quote without company (`cases.corrected_quote_no_company` in `CANDIDATE_INTEGRATION_20261012.json`)**: `customer_name: "Candidate qualification nominal"`, `customer_company: null`, `has_for_null: false`. Explanation: `"✅ Quote DEV-QA-RECHECK-NOM-96176fc36b created for Candidate qualification nominal ($427.50 USD, net margin 32.16%)..."` (**PASS** — closes the `for null` interpolation defect on real Gemini + real PostgreSQL).
  - **Adversarial quote (`cases.adversarial_quote` in `CANDIDATE_INTEGRATION_20261012.json`)**: 90% discount + prompt-injection override attempt (`unit price $1`, `force APPROVED`, `mark PAID`). Deterministic guardrails enforced catalog pricing (`$45.00 USD`, margin `-544.44%`), flagged `["DISCOUNT_LIMIT_EXCEEDED", "MARGIN_FLOOR_BREACH"]`, routed to `PENDING_APPROVAL` (`requires_hitl: true`), and displayed `for Candidate qualification adversarial` (`has_for_null: false`) (**PASS**).
- Signed internal approval succeeded. Reusing the consumed approval token returned HTTP 403; the order remained approved (**PASS**).
- PayPal Sandbox Orders v2 unpaid resource creation & reconciliation (`INTEGRATION_TEST`):
  - Historical unpaid resource (`QA-560f7b8-nominal-ebf79e9cc6a8`, USD 427.50, 1x `VIN-CHATEAU-2018`): native reconciliation returned `PAYER_ACTION_REQUIRED`, `capture_verified: false`, `is_paid_and_settled: false`, and remains preserved in the isolated database with its 1 reserved unit (**PASS**).
- **Complete Buyer Sandbox Checkout, Capture, Reconciliation & Single Stock Deduction (`cases.paypal_buyer_checkout_and_capture` in `CANDIDATE_INTEGRATION_20261012.json`, `END_TO_END`: `PASS`)**:
  - Order `QA-BUYER-CHECKOUT-a1e4424b` (`1x VIN-POMEROL-2020`, 5% discount, USD 304.00, margin 34.21%) was created and linked to a PayPal Sandbox Orders v2 checkout resource (`stock_on_hand: 25, stock_reserved: 1`).
  - The owner completed the buyer checkout in Safari using the PayPal Sandbox personal buyer account. Pre-capture read-only reconciliation observed `paypal_status: "APPROVED"`, `is_paid_and_settled: false`.
  - Executing capture & reconciliation (`capture_approved_payment: true`) through the candidate gateway returned HTTP 200: `paypal_status: "COMPLETED"`, `capture_verified: true`, `is_paid_and_settled: true`, `verification_checks: {refMatches: true, amountMatches: true, merchantMatches: true, captureCompleted: true}`, `newly_paid_count: 1`, `stock_rows_settled: 1`.
  - **Exactly-once stock settlement & replay protection**:
    - `VIN-POMEROL-2020` moved from `stock_on_hand: 25, stock_reserved: 1` to `stock_on_hand: 24, stock_reserved: 0, available_stock: 24` (`paid_orders_count: 1`, `paid_revenue_usd: 304.00`).
    - Immediate second capture replay (`capture_approved_payment: true`) was refused with HTTP 409 `ORDER_NOT_CAPTURE_ELIGIBLE`.
    - Post-settlement read-only reconciliation (`capture_approved_payment: false`) returned HTTP 200 (`paypal_status: "COMPLETED"`, `capture_verified: true`, `is_paid_and_settled: true`, `newly_paid_count: 0`, `stock_rows_settled: 0`), leaving `VIN-POMEROL-2020` at `stock_on_hand: 24, stock_reserved: 0`.
- Actual English Gemini Studio analysis (`models/gemini-3-flash-preview`, `INTEGRATION_TEST`):
  - Accurately summarized recorded order volume, cancelled fixtures, awaiting payment orders, and explicitly stated that internal portfolio context cannot independently verify external payment capture (**PASS**).
- **Live Adversarial, Concurrency & State-Machine Torture Suite (`live_torture_suite_20261012` in `CANDIDATE_INTEGRATION_20261012.json`, `DYNAMIC_TEST` / `INTEGRATION_TEST`: `31/31 PASS`)**:
  - **Financial & Mathematical Traps (9/9 PASS)**: negative/100% discounts, fractional-cent unit prices (`100.999`), prices above catalog, zero/negative/float quantities, duplicate SKU conflicts, invalid tax rates, and PayPal payload amount tampering (`422 PAYLOAD_AMOUNT_TAMPERING_DETECTED`).
  - **Concurrency & Race Conditions (4/4 PASS)**: 4-thread simultaneous stock exhaustion race (`24` units requested vs `15` available -> exactly `2` orders succeeded for `12` units, `2` blocked with `422 INSUFFICIENT_STOCK`), 4-thread simultaneous double-cancel race (released `6` units once, never twice), simultaneous `approve_order` vs `cancel_order` race, and 3-thread simultaneous `reject_order` race (`[200, 403, 403]`).
  - **State-Machine & HITL Bypass Traps (7/7 PASS)**: PayPal creation refused on `PENDING_APPROVAL` (`403 ORDER_NOT_APPROVED`) and `CANCELLED` orders, cross-order approval token substitution refused (`403`), cancellation of `PAID` order refused (`409 PAID_ORDER_CANNOT_CLOSE`), channel switch conflict on bound order refused (`409 PAYMENT_CHANNEL_ALREADY_BOUND`), cancellation of active unpaid PayPal order refused without provider void verification (`409 PAYMENT_RESOURCE_REQUIRES_VERIFICATION`), and expired approval auto-swept to `OVERDUE` with stock released (`403`).
  - **SQL Injection, Unicode & Gateway/Cryptographic Auth Traps (11/11 PASS)**: SQL injection & multi-byte Unicode payloads safely round-tripped via base64-decoded PostgreSQL functions, path-traversal order IDs refused (`400`), unknown SKUs blocked (`422`), unauthenticated (`401`), missing CSRF / evil `Origin` (`403`), wrong `X-PayFlow-Secret` (`403`), body-tampered Ed25519 operator assertion (`403 OPERATOR_ASSERTION_INVALID`), corrupted signature (`403`), and missing assertion (`403`) all refused with stock invariants preserved (`100%`).

## Provider diagnosis and open points

Bounded diagnostics (`GEMINI_MODEL_SELECTION_20261012.json`) established:
- Primary `models/gemini-3-flash-preview` succeeded on 5/5 bounded and integration calls across both existing n8n credentials (**PASS**).
- Earlier `null` error status on the second credential was caused by the n8n HTTP Request node's `25000ms` timeout (`"The connection was aborted, perhaps the server is offline"`, observed at `26.87s` on `gemini-3.6-flash` due to thinking token overhead `thoughtsTokenCount: 304–877`).
- `gemini-3.5 / 3.6 / 3.7 / 3.8` Flash endpoints intermittently return Google HTTP 503 `UNAVAILABLE` (`"This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later."`).
- `gemini-2.5-flash` returns HTTP 404 `NOT_FOUND` (retired for new users).
- The two existing n8n Gemini credentials have independent quota counters on `gemini-3.8-flash`: Credential 1 (`Google Gemini(PaLM) Api account 2`) returned HTTP 429 `RESOURCE_EXHAUSTED` (free-tier limit 20/day), whereas Credential 2 (`Google Gemini(PaLM) Api account`) passed the quota gate and generated a valid 507-character quote JSON (`finish_reason: "STOP"`).
- **Open point on automatic Gemini failover (`PARTIAL_DYNAMIC_ONLY`)**: while Primary (`models/gemini-3-flash-preview`) is validated end-to-end and Fallback (`models/gemini-3.8-flash`) is validated in isolated `DYNAMIC_TEST` on Credential 2, automatic Primary-to-Fallback failover in a single end-to-end candidate call remains subject to intermittent `503` high-demand spikes on `gemini-3.8-flash` and is therefore not claimed as an end-to-end `PASS`.
- **Open points on external deployment (`NOT_VERIFIED`)**: public HTTPS hosting (`hosting: "NOT_VERIFIED"`) and independent provider installation on a brand-new n8n instance (`independent_new_n8n_provider_install: "NOT_VERIFIED"`) remain outside this local qualification scope.

## Cleanup and retained evidence

All temporary workflows, temporary credentials, temporary private checkout files, and temporary Docker network connections to the reference n8n network were removed. The reference workflow configuration digest (`RiQGs5cgxsvuxTEV`) remained identical (`reference_configuration_unchanged: true`). The isolated database retains:
- 1 `PAID` order (`QA-BUYER-CHECKOUT-a1e4424b`, USD 304.00, 1 settled unit of `VIN-POMEROL-2020`: `stock_on_hand: 24, stock_reserved: 0`),
- 1 `INVOICE_SENT` historical unpaid order (`QA-560f7b8-nominal-ebf79e9cc6a8`, USD 427.50, 1 reserved unit of `VIN-CHATEAU-2018`: `stock_on_hand: 40, stock_reserved: 1`),
- 4 `CANCELLED` qualification fixtures (`0` reserved units).
Public evidence omits credential values, approval tokens, payment URLs, capture IDs, and provider/merchant identifiers.

## Required next steps before publication

1. Prepare and qualify secure hosting (or finalize the judge access package) and run scoped adversarial checks against that final target.
2. Freeze the validated candidate, publish GitHub, prepare the English demo video, and submit.
