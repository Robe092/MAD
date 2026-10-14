# Qualification update — 15 October 2026

Scope: English candidate commit `e37beec`, with no application change during this completion pass. The retained isolated installation was built from snapshot `9dbfaf6`, which contains the same English engine/source delta. The earlier clean-install report remains evidence for that snapshot rather than a claimed new installation of e37beec.

| Evidence | Result | Scope |
| --- | --- | --- |
| Clean installation, locked dependencies/build, seventeen real gateway/database checks | PASS | Installation tested on 14 October; retained environment reused |
| Native Gemini quote: one Pomerol 2020 case,5% discount | PASS | Real gateway → native n8n → Gemini fallback → PostgreSQL; USD 304, APPROVED, margin 34.21%, one unit reserved |
| High-value quote through Gemini | BLOCKED | Primary and fallback both returned Google 503 UNAVAILABLE on 15 October |
| Studio request using the correct `prompt` field | BLOCKED | Gateway contract accepted; primary and fallback both returned Google 503 UNAVAILABLE |
| Deterministic high-value quote and operator approval | PASS | Real gateway/n8n/PostgreSQL; USD 1,282.50, PENDING_APPROVAL → APPROVED |
| Consumed approval-token replay | PASS | HTTP403 APPROVAL_DENIED_INVALID_EXPIRED_OR_CONSUMED_TOKEN; persisted order remained APPROVED at USD 1,282.50 |
| Cancellation/reservation cleanup | PASS | Only owned qualification fixtures cancelled; final reserved stock 0, no paid orders in this isolated installation |
| New buyer checkout/capture in this installation | NOT_VERIFIED | No PayPal resource or capture issued in this pass |

The native execution data confirms that the nominal call first received a primary Google 503 and then a real secondary `gemini-3.6-flash` JSON response with finish reason STOP. Its extracted SKU, quantity and 5% discount match the request. The authoritative catalogue has price USD 320 and cost USD 200:320 ×0.95 = 304, with margin 34.21%. The persisted order and line match those facts.

Two test-harness errors are preserved in the private audit history: the 14 October Studio request used `question` instead of the required `prompt`; the first approval replay assertion expected409 whereas the source contract defines403 for a consumed token. The corrected Studio call reached Gemini; the corrected approval assertion and persisted-state check passed. Neither mismatch required an application change.

Earlier successful Sandbox buyer checkout/capture and Studio integration retain their original dated evidence in [the candidate integration report](CANDIDATE_INTEGRATION_20261012.md) and [the Gemini3.6 Studio report](GEMINI36_STUDIO_FINAL_20261013.md). They are not promoted into a fresh complete payment run. Intermittent availability remains a practical dependency for full-provider evaluation.

Private reports contain synthetic business evidence and sanitized provider diagnostics, not provider credentials. The original stack was not modified by these isolated tests. The temporary cockpit and Compose containers were stopped; their retained private volumes preserve execution evidence. No public deployment or contest submission occurred.
