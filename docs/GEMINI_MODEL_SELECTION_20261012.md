# Gemini model selection & provider diagnostic — October 12, 2026

Candidate baseline `fcc01e5`. Primary model (`models/gemini-3-flash-preview`) is **PASS** across bounded `DYNAMIC_TEST` probes and full candidate `INTEGRATION_TEST` replays; fallback (`models/gemini-3.8-flash`) is verified in `DYNAMIC_TEST` on the second existing credential, while automatic primary-to-fallback failover remains subject to intermittent Google `503 UNAVAILABLE` high-demand spikes on `3.5–3.8` Flash endpoints. No permanent workflow model ID or billing setting was changed.

The owner authorized bounded diagnostics using the two existing native n8n `googlePalmApi` credentials (`Google Gemini(PaLM) Api account 2` and `Google Gemini(PaLM) Api account`). No API key values were read, exported, copied, or logged.

## Root-cause diagnosis (`GEMINI_MODEL_SELECTION_20261012.json`)

1. **Primary model (`models/gemini-3-flash-preview`) availability (`PASS`)**:
   - Succeeded on **5/5 consecutive calls** across both existing credentials (`18.09s` on Credential 1, `6.96s` on Credential 2, followed by 3/3 live candidate database integration calls: nominal quote without company, adversarial quote, and English Studio analysis).
2. **Explanation of prior `null` status on the second credential**:
   - Gemini `3.x` Flash models allocate internal thinking tokens (`thoughtsTokenCount: 304–877` observed in `usageMetadata`) out of `maxOutputTokens: 2048`. When total generation latency exceeds `25.0s` (observed at `26.87s` on `gemini-3.6-flash`), the n8n HTTP Request node aborts at its `25000ms` timeout with `"The connection was aborted, perhaps the server is offline"` and `error_code: null`.
3. **Explanation of HTTP `503 UNAVAILABLE` on `3.5 / 3.6 / 3.7 / 3.8` Flash**:
   - Native provider error responses explicitly report: `"This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later."`
4. **Exclusion of `gemini-2.5-flash`**:
   - Both credentials returned HTTP `404 NOT_FOUND`: `"This model models/gemini-2.5-flash is no longer available to new users. Please update your code to use models/gemini-3.8-flash"`.
5. **Independent quota counters proven between the two existing credentials (`DYNAMIC_TEST`)**:
   - On `gemini-3.8-flash`, Credential 1 (`Google Gemini(PaLM) Api account 2`) returned HTTP `429 RESOURCE_EXHAUSTED` (`generate_content_free_tier_requests, limit: 20, model: gemini-3.8-flash`), whereas Credential 2 (`Google Gemini(PaLM) Api account`) passed the quota gate and produced a valid `507`-character quote JSON (`finish_reason: "STOP"`) before encountering a subsequent `503` high-demand spike.
   - This proves the two n8n credentials do not share the same exhausted quota counter.
6. **Open point on automatic Primary-to-Fallback failover (`PARTIAL_DYNAMIC_ONLY`)**:
   - Although Primary (`models/gemini-3-flash-preview`) is validated end-to-end and Fallback (`models/gemini-3.8-flash`) is validated in isolated `DYNAMIC_TEST` on Credential 2, forced end-to-end failover in a single candidate run encountered Credential 1's daily `429` limit and intermittent Google `503` high-demand spikes on `gemini-3.8-flash`. Automatic failover under simultaneous primary failure and fallback `503` load is therefore documented as an open point (`PARTIAL_DYNAMIC_ONLY`) rather than an end-to-end `PASS`.

## Validated credential binding for runtime qualification

- **Primary node (`Gemini Copilot API`)**: `models/gemini-3-flash-preview` bound to existing Credential 1 (`Google Gemini(PaLM) Api account 2`) or Credential 2 (`Google Gemini(PaLM) Api account`).
- **Fallback node (`Gemini Fallback API`)**: `models/gemini-3.8-flash` bound to existing Credential 2 (`Google Gemini(PaLM) Api account`, avoiding the `429` daily limit on Credential 1).
- Because the model identifiers remain `models/gemini-3-flash-preview` (Primary) and `models/gemini-3.8-flash` (Fallback), the candidate workflow definition (`13_PayFlow_PayPal_Invoicing_Sandbox.json`) and Stage 1 `llm_proof.model` reporting require zero modification and remain strictly truthful.

## Cleanup verification

All temporary diagnostic workflows, temporary credentials, and temporary Docker network aliases were deleted after execution. The reference workflow (`RiQGs5cgxsvuxTEV`) digest was verified unchanged (`reference_configuration_unchanged: true`).
