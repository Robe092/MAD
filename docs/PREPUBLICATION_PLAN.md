# Pre-publication decisions and isolated provider test

Update on 2026-10-11: the owner subsequently authorized synchronization of completed changes. The four English Code blocks are now saved and published in the existing active Hackathon engine 13, with live credential bindings and business configuration preserved. See [N8N_SYNC.md](N8N_SYNC.md). This is configuration evidence, with no new Gemini response or payment. The temporary Gemini test has not been deployed or executed. Earlier statements that the English engine is undeployed describe the previous preparation scope.

Base: `32dc901`. Date: October 11, 2026. Application development is frozen. This pass adds instructions and a provider-language test harness only; it does not change the frontend, engine, SQL, credentials or reference installation.

## Verification scope recorded before execution

| Category | Applicability | Evidence in this pass |
| --- | --- | --- |
| Local access procedure, contest rules and licence comparison | APPLICABLE | STATIC_ANALYSIS: existing bootstrap/docs and current primary sources |
| New isolated test runner: request construction, JSON checks, fixed destination, redacted reports | APPLICABLE | UNIT_LOGIC and contradictory source review |
| Real Gemini FR/EN response language | APPLICABLE to jury readiness | NOT_VERIFIED until private candidate test key is supplied and the live runner is deliberately started; human review required |
| n8n/PostgreSQL deployment, financial actions, PayPal calls, existing functional suites | NON APPLICABLE | No application change or financial provider call in this pass |
| Hosted deployment and licence-key validation | NON APPLICABLE | No deployment or key supplied; owner/rights-holder confirmation remains pending |

## Harness finding documented before correction

- PREPUB-01 / STATIC_ANALYSIS: EXPECTED: synthetic Studio context uses the deployed SQL output shape. ACTUAL: the first harness used an aggregate portfolio object, whereas `Postgres: Load Context & State` returns an array of order records (`id`, `customer_company`, `status`, `total_amount`, `computed_margin_pct`). Correct the harness fixtures to that shape; no application or SQL change. Offline unit checks previously passed but did not establish schema fidelity.
- PREPUB-02 / STATIC_ANALYSIS (contradictory review): EXPECTED: direct provider evidence cannot imply a real n8n execution. ACTUAL: the proposed private report used `DYNAMIC_TEST`, reserved by the local protocol for target n8n execution. Relabel the direct Gemini runner/provider check `INTEGRATION_TEST` with its explicit isolated provider scope. No live report exists yet.

## Recommended access solution

Use the existing reproducible local installation as the primary access method. No public hosting is required by the [official rules](https://paypalaihackathon.devpost.com/rules). Keep the separate candidate repository and its persistent Compose volumes. The evaluator needs Node.js 20+, Docker Compose, internet and available local ports 3005/5679. Follow README steps 1–6; owner registration, provider configuration and local workflow publication are real setup steps, not a one-click installer.

For the lowest setup friction within this option, prepare dedicated test access before submission and describe its retrieval in the README/testing instructions. Do not assume judges will create their own developer accounts or pay for quota. Choose a private delivery channel supported by the submission process; confirm its visibility/availability rather than presuming Devpost hides arbitrary fields. Do not put keys in public files, Git history, videos or chat. Because judges run locally, they can inspect credentials supplied to that installation: use dedicated testing credentials with appropriate provider restrictions/quota, not personal/reference credentials. This access package is not yet provisioned or delivered.

| Item | Owner preparation | Judge action |
| --- | --- | --- |
| Gemini | Dedicated test project/key with working quota for the unchanged model URL; confirm Google restrictions allow the evaluator's local use and private sharing method | Configure private candidate `.env` or local n8n credential |
| PayPal Sandbox | Dedicated Sandbox merchant app and separate buyer login; provider credentials stay private. Reference secrets are neither copied nor rotated | Configure dedicated app credentials locally; use buyer login only for a deliberate authorized checkout |
| Operator | Generated separately by local setup; no reference account needed | Read local private initial-login file and sign in |
| n8n/PostgreSQL | Already supplied by Compose/bootstrap | Register local n8n owner, import and publish engine; no public database or Supabase account needed |
| AG Studio | Confirm local evaluation/demo permission and dates with AG Grid; do not redistribute a key unless permitted | Existing packages can render locally with evaluation watermark; no paid seat is assumed to be included |

Sandbox merchant and buyer are distinct accounts; see [PayPal Sandbox account documentation](https://developer.paypal.com/sandbox-testing/accounts). This pass creates neither account and performs no PayPal request. The provider-language test below needs only Gemini, so it can happen before provisioning any financial provider.

The local route trades hosting work for judge setup effort. If a workable private access package cannot be arranged, local instructions alone do not establish readiness. Decide then whether to authorize a separate hosted candidate; do not expose the existing n8n instance, use an improvised tunnel, or deploy externally as part of this pass.

## Minimal real Gemini test

See [GEMINI_LANGUAGE_TEST.md](GEMINI_LANGUAGE_TEST.md). The runner directly calls the candidate's existing Gemini primary URL with its unchanged generated prompt. It uses synthetic data and no n8n, database or PayPal connection. Four sequential calls at most, no retry/fallback: English/French quote and English/French Studio analysis. Stop on a provider/contract failure. This is provider prompt/JSON evidence, not candidate n8n end-to-end evidence.

Default invocation is offline. A private key must be configured locally before a deliberate `--live` invocation. Never send it in chat. Actual provider output language remains NOT_VERIFIED until a human reads the four private excerpts; valid JSON alone does not prove English prose.

## AG Studio confirmation to request

The [sponsor page](https://paypalaihackathon.devpost.com/details/aggrid) advertises a 45-day trial. The [AG Studio documentation](https://www.ag-grid.com/studio/react/licence-install/) permits local testing without a licence and directs production testing to a trial. Neither statement confirms this project's current entitlement or extends a trial automatically.

There is also a terms question, not only an expiry question: the [commercial EULA v40](https://www.ag-grid.com/eula/commercial/), linked by Studio pricing, describes trial use in clause 13.2 as internal evaluation with a non-transferable/non-sublicensable grant and a different generic trial timing. The advertised sponsor/Studio 45-day offer may have specific terms, but none have been supplied for PayFlow. Obtain written confirmation that the hackathon grant permits external judge installations and the public demo; do not treat local rendering without a key as that confirmation.

Judging runs December 1–15, 2026 under the [rules](https://paypalaihackathon.devpost.com/rules). A trial activated October 11 would not cover the end of judging; a trial activated around the November 12 submission deadline could cover December 15 if its actual start/expiry and terms confirm that. Do not assume activation can be deferred or repeated.

Ask AG Grid, via the sponsor's listed PayPal Discord contact, for written confirmation covering: PayFlow AI and AG Studio 3.0.0; developer/evaluator entitlement; local evaluation on judges' computers; public repository importing commercial packages; the English demonstration video; judging through December 15; any later hosted environment/domain; whether licence-key delivery to evaluators is allowed; and compatibility of the intended MPL or AGPL distribution. Prepare the question locally; no message is sent by this pass.

Suggested owner message:

> We are submitting PayFlow AI to the PayPal AI Hackathon 2026 using AG Studio 3.0.0. Our candidate currently runs locally with npm dependencies and persistent n8n/PostgreSQL containers. We plan an open-source repository (MPL-2.0 preferred, not yet applied) and a public English demonstration video. Can you confirm the permission for local evaluator installations and the licence/trial coverage through December 15, 2026? Please clarify whether evaluators need individual trial activation, whether a key may be supplied privately, and any restrictions on this source distribution. We have not deployed a hosted demo. If the trial does not cover judging, is an extension available?

## Decisions requiring the owner

1. Approve local installation as the access route and name the private access-delivery method. Arrange dedicated Gemini/Sandbox testing credentials and quotas; do not send values in chat.
2. Configure the candidate-only Gemini test key locally and approve/run the documented four-call check. Review the private excerpts for English and catalogue/portfolio grounding. No payment is involved.
3. Choose the source licence/copyright attribution. MPL-2.0 is the recommended practical compromise; no licence is changed without approval. Confirm inherited source/asset rights.
4. Obtain AG Grid's confirmation of evaluation/distribution rights and dates. No AG Studio entitlement is inferred from selecting an open-source source licence.

Publication remains BLOCKED until these concrete access, provider and rights prerequisites are resolved. This does not reopen completed financial/UX development. GitHub publication, external deployment and new payment remain unauthorized.

## Preparation results

- UNIT_LOGIC: 3/3 new runner tests passed after the documented fixture correction; no provider call. Default offline invocation also completed and reported `NOT_VERIFIED` for language.
- STATIC_ANALYSIS: contradictory review closed PREPUB-01 and PREPUB-02 after inspecting the saved corrections. No open CRITICAL/HIGH finding in this narrow delta. The reviewer did not rerun the tests or contact services.
- STATIC_ANALYSIS: Gitleaks 8.30.1 found zero findings in the staged preparation delta with redaction enabled; `git diff --check` passed. This is pattern-based detection, not a guarantee against every possible sensitive datum.
- Existing frontend, workflow, SQL, dependencies, private credentials and reference installation were not modified. Existing functional suites/build were not rerun because no application code changed.
- Live Gemini output, actual judge-access delivery and AG Studio rights remain NOT_VERIFIED. Preparing the runner does not resolve those prerequisites.
