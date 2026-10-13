# Gemini 3.6 final four cases — October 13, 2026

**Overall: BLOCKED. Three new business cases passed; only Studio remains unverified because of provider errors.**

The four previously missing cases ran once each, ten seconds apart, through the real candidate frontend/operator assertions, temporary dual-native 3.6 workflow and dedicated synthetic PostgreSQL. No prior successful case was repeated. No provider simulation or automatic retry was used.

| Case | Result | Real evidence |
| --- | --- | --- |
| Stock prompt injection | PASS | Request for 999 cases versus 39 available returned HTTP 422/BLOCKED_ANOMALY; authoritative price/cost retained, zero stock reservation. Real secondary 3.6 response followed a primary connection abort. Blocked fixture cancelled normally. |
| Unknown product | PASS | Real secondary 3.6 response followed primary Google 503; API returned 422 AI_ITEMS_UNRESOLVED and created no order. |
| Ambiguous request | PASS | Real primary 3.6 response; API returned 422 AI_ITEMS_UNRESOLVED and created no order. |
| Studio false receipts | BLOCKED | Both actual provider nodes returned Google 503 UNAVAILABLE/high-demand. No generated text, hence no English or semantic-grounding success inferred. |

Seven native calls occurred: four primary, three secondary. Three generated usable responses, three returned genuine Google 503 and one aborted without a Google status. Recorded 3.6 totals across today's trials are twelve primary/seven secondary, nineteen calls overall. The user confirmed the two credentials belong to different Google projects; this is user-provided configuration evidence, not independent API project identity verification.

## Observed English defect and minimal correction

The stock control worked, but the SQL function overwrote its explanation with French text, displayed directly by the frontend. This was documented before correction in STOCK_ENGLISH_FINDING.json. Exactly two stock-message string literals in candidate sql/11_payflow_stabilization.sql were translated. No numeric check, SQL locking, reservation or approval logic changed.

A real PostgreSQL recheck exercised both existing-anomaly and atomic-anomaly branches without another Gemini call. Each returned 422/BLOCKED_ANOMALY, zero reservation, correct 999/39 quantities and English messages. Test rows were rolled back; all preexisting orders, items, products, invoices and operations were identical. Function privileges, security mode and search path were preserved. The function was installed only in the dedicated qualification database; the existing reference database was not touched. This verifies the two corrected messages, not every SQL language branch.

## Preservation and remaining gate

The successful cases preserved all historical payment resources, invoices, operations and physical/reserved stock. The new blocked-stock audit fixture was cancelled normally. All own temporary workflows, credential references, traces, operator session, frontend/shim and added network connection were cleaned up and inventory checked. Existing credential values were never accessed or changed. No PayPal call, payment, publication or billing occurred.

Contradictory review confirmed the bounded proof classes and stock-message correction. The candidate/reference Gemini configuration remains unchanged: proposed 3.6 was tested only in temporary workflow copies. Permanent adoption remains pending. The only remaining model qualification scenario is Studio's adversarial false-receipts request, whose generated English response must explicitly distinguish recorded order amounts from verified captures. Earlier successful tests need not be repeated.
