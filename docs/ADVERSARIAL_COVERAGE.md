# Targeted adversarial evidence consolidation

Date: October 11, 2026. Candidate baseline: `9b9d3d1`. This pass consolidates existing records rather than recertifying the entire application. No code/design/financial/provider model change, reference-instance mutation, public deployment or new payment is planned.

## Applicability recorded before new tests

| Risk family | Applicability | Planned scope |
| --- | --- | --- |
| Financial input manipulation, stock, discount/margin guards | APPLICABLE | Reuse existing engine unit and reference integration records; distinguish supplied synthetic model output from actual adversarial provider requests |
| Repeated approvals, concurrent reservations/abandon, settlement replay | APPLICABLE | Reuse existing dynamic/DB/provider evidence; do not repeat a capture |
| Authentication, expiration, CSRF, request-body binding, gateway login throttling | APPLICABLE | Reuse existing proof; execute only uncovered real runtime refusal scenarios in a fresh isolated installation, no provider credentials |
| Provider failures and uncertain settlement | APPLICABLE | Reuse bounded unit/DB-fixture evidence; real interrupted provider effects remain explicitly NOT_VERIFIED where no record exists |
| Real English Gemini and candidate provider chain | APPLICABLE to jury readiness | Candidate-only test key absent; actual calls NOT_VERIFIED until privately provisioned; no reference credentials copied |
| HTTPS/exposed routes/reverse proxy and hosted persistence | NON APPLICABLE to current execution | No hosted environment exists or deployment is authorized. Future deployment acceptance remains NOT_VERIFIED, not certified by local tests |
| Multi-tenant/customer resource isolation | NON APPLICABLE to current product | Single operator cockpit; no customer session/tenant role exists. Operator assertions/approval tokens still require binding; no new authorization model introduced |
| PDF/Slack/email/Drive/document prompt injection | NON APPLICABLE | Absent from submitted engine; natural-language prompt manipulation remains applicable |

Proof classes must stay explicit. PASS at UNIT_LOGIC is not PASS for real-provider/network-fault reproduction. An existing record whose evidence is null is a reported result only, unless another tangible artifact proves that scenario. Reference-instance history is not a fresh English candidate end-to-end execution.

## Initial gaps selected for execution

The existing unit suite covers forged/expired sessions and spoofed forwarded-address login throttling. Native historical tests demonstrate absent/forged assertions, but do not supply a specific validly signed expired/body-tampered assertion result. The selected additional local scenarios are therefore:

1. A genuinely signed expired operator assertion is refused by real isolated n8n.
2. A valid signature bound to a different request body is refused by real isolated n8n.
3. A changed assertion payload with the original signature is refused by real isolated n8n.
4. A forbidden role in an otherwise correctly signed assertion is refused by real isolated n8n.
5. A valid assertion/control request proves these refusals are not simply caused by an offline/broken test instance.
6. Actual candidate Next.js refuses expired sessions and enforces the login attempt limit despite forged forwarded addresses. Revoked-session denial already has historical 401 evidence and is not repeated.

Consolidation also identified no tangible dynamic result for using quote A's approval token against quote B (distinct from already-covered consumed/expired-token replay). Before executing this additional non-provider scenario, include a pair of fresh pending deterministic quotes, verify cross-order token refusal with both approvals unchanged, then cancel the fixtures. This verifies existing token binding and adds no authorization model or financial provider action.

Only fresh, temporary credentials/session files, n8n/PostgreSQL services and labelled synthetic data may be created. No PayPal credential or call; no reference Gemini credential export. The temporary services/private files must be removed after recording sanitized results. Existing suites/build are not rerun without a demonstrated change/failure.

## Provider/key and rotation evidence limits

No candidate `.env` or candidate-only Gemini test key is present at inspection. The prepared direct-provider runner remains unexecuted; this is a configuration dependency, not a product failure. Never ask for secrets in chat.

A sanitized historical `secret-rotation-proof.json` record was found in the private reference documentation. It records old-secret OAuth 401 `invalid_client`, new-secret OAuth 200 and deletion of the prior n8n credential. This supplements the owner's confirmation and Antigravity's report, but it is not an independently repeated revocation probe or a raw HTTP transcript. No rotation or credential modification is needed or performed.

Consolidated scenario evidence and actual additional results will be recorded below and in ADVERSARIAL_COVERAGE.json. Public artifacts contain only sanitized facts and source hashes, never customer identities, payment resource IDs, tokens, private keys or raw execution payloads.

## Bench setup diagnostic recorded before correction

- Harness-only compatibility issue: EXPECTED: extract the trusted candidate Git archive into a temporary directory. ACTUAL: host Python lacks `tarfile.extractall(filter=...)`, so setup stopped before generating secrets or starting services. Validate member paths/types explicitly and use the host-compatible extraction call. This is not an application failure or provider test.
- Harness-only response parsing issue: temporary owner registration returned a non-JSON response and the wrapper tried to decode it. The isolated services were already created; workflow import/publication was subsequently completed with the local CLI in that same temporary instance. No product correction or reference access.
- Execution-snapshot boundary: the first SQLite-main-file-only snapshot contained only four historical rows, including one stale `new` state. Reading the stopped temporary database with its WAL/SHM companions exposed all eleven successful executions. Only node names/statuses are retained publicly; the raw snapshot was deleted with the bench.

## Consolidated results

The scenario register in ADVERSARIAL_COVERAGE.json has **28 scoped PASS, 5 NOT_VERIFIED and 3 NON APPLICABLE entries**. These are evidence rows, not a count of newly executed tests. PASS retains its proof class, source and environment. Private reference artifacts are indexed by filename/hash without copying customer details, tokens or payment identifiers.

| Family | Evidence actually established | Limit |
| --- | --- | --- |
| Financial guards and stock | Historical real excessive-discount/margin checks, insufficient stock and concurrent reservations; current unit guard evidence | No live candidate prompt-injection/90% request executed |
| Human approval and stock lifecycle | Historical consumed/expired-token refusal, concurrent abandonment and approval/abandon race, real expiry schedule | Historical evidence remains historical; no automatic commercial client acceptance inferred |
| Authentication and request binding | Prior actual anonymous/CSRF/origin/logout checks; new real expired/body-tampered/signature-tampered/role assertions, expired browser session, login throttling and cross-order approval-token binding | Local single-operator environment; no public proxy/HTTPS certification |
| PayPal idempotence | Historical concurrent resource creation and one buyer capture followed by sequential replay with no second stock deduction | Concurrent real capture is NOT_VERIFIED |
| Failures and uncertain results | Existing unit timeout/fallback/persistence checks; actual DB refusal from an injected FAILED_RETRYABLE state; actual SQL settlement/replay with mocked provider | Provider acceptance followed by a lost response and recovery is NOT_VERIFIED |

**New isolated checks: 13/13 PASS.** These include controls proving the services work, refusal results and database non-mutation. Eleven actual n8n executions all recorded `success`; their visited nodes contain no Gemini or PayPal credential node. The two deterministic approval fixtures remained pending after a cross-order token attempt (403, zero tokens consumed and zero orders approved), then were cancelled with exactly one unit released each. No invoice/payment operation was created. See ADVERSARIAL_NEW_CHECKS.json for HTTP codes and database facts.

n8n execution `success` means the workflow completed, including expected HTTP403 refusals; it does not mean an unauthorized operation succeeded. Both temporary TCP ports were confirmed closed. Gitleaks 8.30.1 found zero findings in the staged report delta with redaction enabled; no full audit or provider call was implied by that scan.

The new tests used the unchanged English candidate export, a fresh database, new local-only credentials and a separate Next.js process. No real provider credential was copied, no original instance/workflow was touched, and no payment/capture/refund occurred. Temporary n8n/PostgreSQL containers and volumes, operator keys/sessions, SQLite payload snapshot and test directory were removed; the temporary frontend stopped. No application patch was necessary. Existing build/unit suites were not repeated.

Contradictory review: the evidence boundaries and counts were accepted within this narrow scope. A control-test caption originally called the five-product catalogue "empty"; corrected to a freshly seeded catalogue with empty orders, consistent with the recorded counts. The source index hash was refreshed after that report-only correction. See ADVERSARIAL_REVIEW.json. This review is not a hosted/provider certification.

## What remains before provider demonstration or hosting

1. **Real English Gemini and live adversarial prompt:** configure the dedicated candidate key privately, then run the already-prepared FR/EN recipe and a bounded malicious request against the configured isolated candidate. Current classification: NOT_VERIFIED due to absent configuration. Direct Gemini JSON evidence alone must not be relabelled as full n8n/database evidence.
2. **Candidate provider chain:** privately provision the intended jury environment and confirm the real AI/database/Sandbox integration. A new buyer payment/capture still requires separate explicit approval. The historical capture is not a new-install certificate.
3. **Real provider fault boundaries:** simultaneous capture and lost-response recovery remain NOT_VERIFIED. Existing deterministic/unit and historical replay evidence limits risk but does not dynamically reproduce those scenarios. They require a separately scoped safe provider-fault plan if included in a later release certification; do not improvise destructive financial failures here.
4. **Hosting:** public HTTPS, proxy trust, exposed routes, persistent sessions and deployment-specific limits remain untested because there is no hosted target. Local PASS must not become hosted PASS by inference. No hosted deployment is authorized by this report.

Publication/access readiness remains **BLOCKED**, with no new demonstrated product defect. Missing provider configuration and the previously documented access/licence decisions remain concrete prerequisites. This report does not revoke earlier scoped PASS results or reopen development.
