# Candidate integration qualification — October 12, 2026

Baseline: local candidate `560f7b8`. Overall final qualification: **BLOCKED**.

The owner chose the existing n8n instance. The real candidate Next.js gateway used its own operator session and signed assertions, a temporary copy of the candidate workflow, and a fresh dedicated PostgreSQL database. Existing native Gemini/PayPal credential references were reused without exporting their values. A loopback-only routing shim retained the candidate API configuration. This is not proof of independent provider setup on a new n8n installation.

## Observed successful integration checks

- The fresh database exposed the five repository seed products and initially zero orders.
- Actual English Gemini quotes: one case of Château Margaux at a 5% discount, USD 427.50, margin 32.16%, internally approved; three cases, USD 1,282.50, same margin, pending internal approval because the USD 1,000 threshold was exceeded.
- Signed internal approval succeeded. Reusing the consumed approval token returned HTTP 403; the order remained approved.
- PayPal Sandbox Orders v2 created an unpaid resource. Native reconciliation returned `PAYER_ACTION_REQUIRED`, `capture_verified: false`, `is_paid_and_settled: false`. No checkout or capture was performed.
- Actual English Gemini Studio analysis described USD 1,710.00 recorded order volume and explicitly stated that provider capture could not be verified from the portfolio context.

## Findings and limits

Initial quote requests returned `GEMINI_UNAVAILABLE`. Later primary requests succeeded. The last corrective replay provided direct evidence of primary Google Gemini HTTP 503 `UNAVAILABLE` and fallback HTTP 429 `RESOURCE_EXHAUSTED` (daily free-tier quota exhausted). The early failures were not individually diagnosed; their cause must not be inferred from this later response. The small short-response diagnostic ended with `MAX_TOKENS`; a full-prompt diagnostic subsequently returned valid JSON. No model, credential, billing setting or retry policy was changed.

Successful quote explanations displayed `for null` when the optional company was absent. The candidate-only correction changes two explanation interpolations to use `customer_company || customer_name`. The original reference workflow was not updated. Six targeted UNIT_LOGIC checks and 47 existing backend/language unit checks passed; static analysis reported no blocking violations. **The actual provider replay of this correction is BLOCKED by the 503/429 responses.** No broad financial or payment changes were made.

Two harness errors were corrected independently of product code: generated test order references exceeded the 48-character contract, and a company-label fixture expected an entity absent from its prompt. A synchronization helper failed before mutation because of a selector error and was corrected. An extra nominal qualification fixture created during that diagnosis was closed through the normal business action.

## Cleanup and retained evidence

The temporary workflow, its two new credentials, 16 stored diagnostic executions and the added connection of the dedicated test database to the reference n8n network were removed. The reference workflow configuration digest remained identical. Non-payment qualification quotes were closed through the normal action, releasing four reserved units. The isolated database retains the unpaid PayPal resource and one reserved unit, with its financial history, for a future authorized buyer test; physical stock remains unchanged. The temporary real frontend and routing shim were stopped. Existing projects and credential values were preserved.

A real-dashboard screenshot is retained privately in the local audit folder. Public evidence omits credential values, approval tokens, payment URLs and provider/merchant identifiers.

## Required next checks

1. Recheck the corrected quote with actual Gemini after provider availability and quota recover. Do not infer fallback resilience from mock or prior success.
2. Complete a separately authorized buyer Sandbox checkout and verify candidate capture, reconciliation and exactly-once stock settlement.
3. Prepare and qualify secure hosting, including scoped adversarial checks against that final environment.
4. Verify remaining installation reproducibility, freeze the validated candidate, then publish GitHub, prepare the English video and submit.

No GitHub publication or final-payment certification follows from this report.
