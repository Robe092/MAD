# Gemini model selection — October 12, 2026

Candidate baseline `450b2a3`. Provider/model qualification remains **BLOCKED**. No permanent model or credential-binding change was made.

The owner authorized the existing two API credentials and Gemini 3.5, 3.6, 3.7 and 3.8 alternatives. Read-only n8n metadata showed that the original PayFlow primary and fallback actually used the same credential reference. A second existing credential was located through name/type/id metadata. No key values were read, exported, copied or replaced. Two credential references do not establish distinct Google projects or independent quota pools. Google documents that rate limits apply per project, not per API key: https://ai.google.dev/gemini-api/docs/rate-limits.

## Bounded native results

The provider inventory listed the four Flash generateContent models for both existing credentials. Inventory alone is not proof of generation availability.

- First existing credential: 3.7 Flash returned provider HTTP503 UNAVAILABLE. 3.6 Flash produced a valid English synthetic quote JSON.
- Second existing credential: 3.8 Flash produced no usable response, with no precise provider status established by the sanitized result; 3.5 Flash and a final 3.6 Flash check returned provider503 UNAVAILABLE.
- Targeted 3.6 qualification on the first credential: the English quote again succeeded through native Gemini and the actual candidate Stage1 logic (228USD,47.37%margin, internally approved). The following Studio case returned provider503. The adversarial case was not executed because the probe stopped after missing usable JSON.

Seven bounded generation requests and three model-inventory reads were performed, with no automatic provider retries. All input data was synthetic qualification context. These are DYNAMIC_TEST proofs of native model calls and isolated Stage1 behavior. No PostgreSQL persistence, PayPal transaction, hosting or full candidate END_TO_END qualification is established by these probes.

The model/proof label was changed only in the temporary 3.6 test copy. No existing workflow, credential, billing setting or candidate application file was modified. On failures without response text, Stage1's model label defaults to its fallback label; this must not be read as proof of an actual fallback call (`llm_invoked=false`). Failure evidence here comes from the requested endpoint and native provider response, not that label.

## Cleanup and decision

All temporary model-probe workflows and header credentials were deleted. A final metadata inventory confirmed zero leftovers; the reference workflow definition was unchanged.

Changing keys or model IDs did not resolve the observed availability failures. The single-model quote successes are retained, but do not justify declaring a reliable primary/fallback combination. Resume the remaining Studio/adversarial cases and a real candidate/database check when the provider returns usable responses. Prior successful PayPal unpaid creation and integration evidence remains valid within its original scope; capture, hosting and final qualification remain open.
