# Jury preparation — targeted verification scope

This pass translates presentation text in the standalone candidate and improves judge instructions. The owner authorized translating the engine's language instructions and visible messages only. The current reference installation, provider credentials, financial calculations and SQL remain outside the change scope.

| Category | Applicability | Planned evidence |
| --- | --- | --- |
| English labels, number/date presentation, controls and payment-return explanation | APPLICABLE | STATIC_ANALYSIS, frontend UNIT_LOGIC, visual inspection |
| Presentation of existing server errors | APPLICABLE | Frontend UNIT_LOGIC; API codes and raw payloads preserved |
| Frontend authentication/action regression | APPLICABLE | Existing frontend suite, targeted browser checks |
| Provider-generated prose language | APPLICABLE to demonstration readiness | Existing provider contract inspected; new actual provider response NOT_VERIFIED without a configured jury environment |
| Source selection, private files/history, dependencies and docs | APPLICABLE | Candidate/history secret scan and file checks |
| Judge access, licences, ownership and dated provenance | APPLICABLE | Documentation and available evidence; owner decisions explicitly separated |
| Language-only engine prompt/messages | APPLICABLE after owner's explicit exception | STATIC_ANALYSIS, AST contract comparison and targeted UNIT_LOGIC; provider language requires actual provider proof |
| SQL/financial rules, new n8n deployments, payments | NON APPLICABLE | No changes to SQL, financial rules, provider credentials or connections; no payment authorized |
| New hosted deployment or full clean-install rerun | NON APPLICABLE | No deployment/installation architecture changes; prior clean-clone proof retained |

No old PASS is relabelled as a new provider or hosted END_TO_END test. Final results are recorded below after targeted verification.

## Findings documented before targeted correction

- JURY-01 / STATIC_ANALYSIS: EXPECTED: generated analysis follows the English UI. ACTUAL: the existing engine prompt explicitly requires French reasoning and Studio replies. Owner authorized a language-only prompt exception; JSON keys, models, controls and connections must remain unchanged.
- JURY-02 / STATIC_ANALYSIS: EXPECTED: translated quote presets retain the existing engine's input compatibility. ACTUAL: the first translation used `Customer:` but the deterministic customer parser expects `Client:`. Restore `Client:` (also valid English), without changing the backend parser.
- JURY-03 / STATIC_ANALYSIS: EXPECTED: quote notices are English. ACTUAL: the engine prefixes its copilot explanation with hardcoded French sentences even when reasoning is English. Owner subsequently authorized adapting hardcoded visible engine messages. Translate only these message strings, retaining interpolated amounts/statuses and provider reasoning; no translated financial decision.
- JURY-04 / STATIC_ANALYSIS: EXPECTED: all Studio schema labels are English. ACTUAL: two visible mixed-language labels remained (`Code Status Brut`, `Catalogue & Stocks`). Correct their labels only, retaining field/source identifiers.
- JURY-05 / INTEGRATION_TEST (fixture UI): EXPECTED: Studio numbers use English display formatting. ACTUAL: the first screenshot showed `39,02` for the average margin because the built-in number format follows the environment locale. Set explicit `en-US` display formatters for numeric fields, preserving their data types, values and aggregations. The first screenshot was also taken while some charts were loading; wait for rendered chart/grid content before claiming visual readiness.
- Language unit fixture / UNIT_LOGIC: first new fixture expected `PENDING_APPROVAL` but returned no order status because its synthetic Gemini record used an incorrect node identity. Correct the fixture to bind the existing HTTP-node name; this is not a deployed provider or engine failure. Both request-contract checks already passed.

## Work completed and verified

- English navigation, welcome/login, quote presets, tables, status explanations, stock/margin/discount guidance, confirmations, payment-return page and AG Studio labels. Existing CSS/layout preserved. Number/date formats are English; Studio numeric display stays English even in a French browser.
- Engine language-only changes: Gemini understands French/English requests and is instructed to produce English explanatory JSON text. Existing fixed quote explanations and visible engine errors are English. Technical node names/IDs, codes, JSON fields, interpolated amounts, SQL, models, credentials and connections are preserved.
- Existing API routes and operator security implementation remain byte-identical. Frontend presentation translates known historical/server messages; unknown diagnostic content and business names are preserved rather than fabricated. This is fixed English presentation, not a language selector or a new translation service.
- UNIT_LOGIC: 31/31 frontend tests, 44/44 engine regression tests and 3/3 targeted language tests passed. Engine regression was justified by the changed visible-message code; the 16 earlier installation checks were not rerun. The language tests use synthetic Gemini JSON, not a live provider.
- STATIC_ANALYSIS: workflow analyzer reports zero blocking violations and zero warnings. Independent contradictory review confirms no non-textual changes in the four modified Code nodes, unchanged JSON outside `jsCode`, 14 prompt keys and 7 status codes preserved. See JURY_REVIEW.json.
- INTEGRATION_TEST (frontend/fixture upstream): 17 checks passed, with actual Next.js/operator authentication and labelled VISUAL QA data. Four main pages, order controls, mobile overview, payment return and native AG Studio rendering inspected. Initial screenshot caught asynchronous loading; final Studio screenshot shows rendered charts/grid, $590.40 and 39.02. No provider or financial mutation is possible on this test upstream. See JURY_VISUAL_CHECKS.json. Screenshots remain in the private workspace backup and are not submission/demo footage.
- STATIC_ANALYSIS (reference configuration): a read-only API request confirmed engine 13 is active and its nodes/connections match the existing local reference export; its error workflow setting is empty. Earlier read failures were due to sandbox network permissions, not evidence of an offline n8n instance. The English candidate remains inactive/undeployed, deliberately differing in authorized text only. No reference workflow or credential is changed.
- Documentation: judge prerequisites/access procedure, English walkthrough, targeted evidence, licence recommendation and dated provenance references are prepared. The source manifest distinguishes initial source hashes from translated candidate hashes.
- Build verification: the final English candidate builds successfully with Next.js 14.2.35. This build is compilation evidence, not a live Gemini/PayPal end-to-end test.
- Source/privacy verification: Gitleaks 8.30.1 found zero findings in the staged English changes and all three existing candidate commits. Tracked-file inventory includes only the standalone submission source, empty credential templates and sanitized reports; no original repository history, private environment, sessions, screenshots or other project workflows. See JURY_SECRET_SCAN.json. These checks do not prove the absence of every possible sensitive datum.
- Cleanup: the isolated visual-test launcher was stopped and its private session directory/path marker removed. The candidate has no Git remote; nothing was published.

## Remaining verification and owner decisions

**Live Gemini English responses are NOT_VERIFIED.** No Gemini API key is configured in this clean candidate, and no existing credential is exported/copied from n8n. The existing reference is not redeployed solely to obtain a test. To verify actual language/JSON output, configure the intended jury environment privately and run a small FR/EN quote/Studio recipe. A new installation's PayPal/Gemini provider end-to-end flow also remains NOT_VERIFIED; previous reference-instance capture evidence remains historical evidence only.

**Judge access is not arranged.** Select local instructions with a workable private testing-access procedure, or authorize a separate hosted demo. Hosted origin, persistence, dedicated accounts and provider quotas need confirmation. No public deployment or GitHub publication occurs in this pass.

**Licence/rights decisions remain with the owner.** The local MIT file is unchanged and pending owner approval. Consider AGPL v3 for stronger reciprocity only after confirming commercial-component compatibility; MPL 2.0 is the practical file-level compromise. Confirm attribution, inherited ownership/provenance and AG Studio permission covering December 1–15. See LICENSE_RECOMMENDATION.md and PROVENANCE.md.

Orders v2 remains the recommended demo. Invoicing v2 scope limitations are documented, without claiming a validated branch. No new payment, checkout, capture, refund, credential change or rotation was performed.

## Publication verdict

**BLOCKED for publication approval**, despite passing targeted source/frontend checks: final source licence/rights approval, AG Studio permission and a concrete functional judge-access/provider verification procedure are still pending. This verdict does not reopen the earlier financial stabilization or require new features. The next work is to resolve those specific prerequisites, verify the configured jury flow, then obtain publication approval and prepare the real English video/Devpost entry.
