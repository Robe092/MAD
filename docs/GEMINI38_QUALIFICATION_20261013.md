# Gemini 3.8 targeted qualification — October 13, 2026

**Overall: BLOCKED.** Candidate baseline e784b00 plus the authorized 3.8 model change; no application change during this campaign.

The published reference workflow already uses Gemini 3.8 on both nodes with two distinct existing native credential references. Qualification used the real candidate frontend gateway/operator assertions, a temporary full workflow copy, and the dedicated synthetic PostgreSQL database. Native business/auth/SQL source was preserved. All PayPal actions were refused by the test routing shim; no payment, capture or provider OAuth occurred.

## Observed results

- The nominal quote failed closed at 25.29 seconds with no usable provider response and no persisted order.
- A controlled primary failure in the temporary copy routed to the actual secondary credential. That secondary connection aborted at 25.23 seconds, producing no usable quote. Routing is proven; successful fallback generation is not.
- One diagnostic changed only the temporary primary timeout to 40 seconds. It also aborted at 40.20 seconds; the product/reference 25 second settings were left unchanged.
- Missing customer email was rejected HTTP 422 CUSTOMER_INFORMATION_REQUIRED before any Gemini node executed and without an order.
- The n8n container reached Google's unauthenticated metadata endpoint quickly (HTTP 403, 167 ms). Both credential-authenticated metadata GETs returned the 3.8 model and generateContent support. These establish API/model metadata access, not generation quota, uptime or performance.

No Google HTTP 503 or 429 was established in these generation results. The returned 503 is the application's GEMINI_UNAVAILABLE response. The connection-abort message does not establish the precise external cause. Do not infer exhausted quota, revoked credentials, excessive thinking or global Google outage from this evidence.

Three generation requests were attempted: two primary and one secondary; no automatic retries. A temporary-webhook registration race produced one 404 before any provider execution, was recorded, corrected and its evidence retained separately. No candidate business defect was inferred from this harness issue.

## Coverage and preservation

Of the nine planned cases: missing-email rejection PASS, nominal and successful-fallback generation BLOCKED, and the other six NOT_VERIFIED. High-value, financial/stock injection, unknown products, ambiguous requests and Studio must resume once generation is usable. Earlier 31-trap and PayPal Sandbox buyer-payment proofs remain historical successes within their original scopes.

On all four useful test runs, prior orders, line reservations, invoices, payment operations and physical/reserved stock matched their initial snapshots. The existing paid 304 USD order and unpaid 427.50 USD resource were preserved. The reference workflow configuration digest remained unchanged. Own workflow/header/DB references, execution traces, operator sessions and added database network connections were cleaned up; temporary frontend/shim stopped.

Private provider credential values were neither exported nor modified. No GitHub publication, billing change or new payment occurred. This report is not a certificate of fresh 3.8 availability or a completed adversarial campaign.
