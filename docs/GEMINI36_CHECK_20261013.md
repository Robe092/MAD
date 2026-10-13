# Gemini 3.6 alternative and provider diagnosis — October 13, 2026

**Overall: BLOCKED. Gemini 3.6 is usable on some requests, but qualification remains incomplete. No permanent switch or application change was applied.**

The official [Gemini 3.6 guide](https://ai.google.dev/gemini-api/docs/generate-content/whats-new-gemini-3.6) lists 3.6 as available for production use. The [deprecation schedule](https://ai.google.dev/gemini-api/docs/deprecations/) documents 3.7 routing to 3.8 and 3.5 routing to 3.6, but no corresponding 3.6 routing to 3.8. Successful generation responses here explicitly returned `modelVersion: gemini-3.6-flash`; these requests were therefore observed as 3.6.

## Real evidence

- Authenticated native metadata access and a minimal English JSON generation succeeded. The minimal probe took 2.93 seconds including harness overhead, returned STOP and 23 tokens.
- Two isolated full primary quote attempts returned genuine Google `503 UNAVAILABLE`, explicitly citing high demand. Their secondary was deliberately replaced by a test stub to reserve quota, so these were not production dual-native availability tests.
- The controlled-primary-failure test reached the genuine secondary 3.6 credential and created a real 427.50 USD quote, margin 32.16%, with persistence verified.
- With both actual native nodes enabled, the primary created the nominal 427.50 USD quote in 6.28 seconds.
- The high-value case returned a real Google 503 from the primary, automatically reached the actual secondary, and created a 1282.50 USD quote in PENDING_APPROVAL with HITL and HIGH_VALUE_THRESHOLD. This is an INTEGRATION_TEST of genuine automatic fallback, without provider simulation.
- The financial-injection case then received genuine Google 503/high-demand responses from both nodes, with no generated response or persisted order. The campaign stopped immediately. This is BLOCKED, not proof of injection resistance.

Nine native generation requests were attempted: six primary and three secondary. Four produced usable responses, five returned genuine Google 503. Simulated errors and metadata requests are excluded from this count; no automatic retries were enabled.

## Coverage and causal limits

Nominal, high-value and controlled fallback cases passed. Financial injection remains BLOCKED. Stock injection, unknown product, ambiguous request and Studio remain NOT_VERIFIED. The previously proven missing-email guard is unchanged and runs before Gemini; its prior evidence is retained rather than repeated. Successful checks are not a completed qualification of 3.6.

For the five explicit 3.6 errors, provider unavailability is demonstrated: Google's response itself states high demand. This does not establish a global Google outage, exhausted quota, or the cause of the earlier 3.8 connection aborts. The successful primary/secondary generations show that native n8n generation and the candidate's auth/database flow can work. They do not prove the absence of every local defect.

## Preservation and decision

All four integration runs preserved prior orders, invoices, payment operations and physical/reserved stock within their before/after snapshots. Three new synthetic quotes were cancelled through the normal application API and their reservations released; their cancelled audit history remains in the dedicated qualification database. The existing paid and unpaid resources were preserved. No PayPal OAuth, payment or capture occurred.

The existing reference workflow remained unchanged. Existing credential values were neither read, exported nor modified. Temporary workflows, header/database credential references, execution traces, operator sessions, frontend/shim and added database network links were cleaned up. Final read-only inventory confirmed cleanup. The proposed four-node configuration passed static analysis with zero blocking violations, but has not been applied. Contradictory review found no unsupported causal attribution or success claim.

The remaining adversarial cases must succeed before permanent adoption. No billing or GitHub publication was performed. An extra invalid-POST probe was skipped because explicit Google responses had already provided the useful attribution evidence.
