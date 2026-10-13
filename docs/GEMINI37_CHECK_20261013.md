# Gemini 3.7 alternative check — October 13, 2026

**Verdict: BLOCKED. No permanent model switch.**

A native authenticated metadata GET for `gemini-3.7-flash` returned `models/gemini-3.7-flash`, version `3.7-flash-08-2026`, with `generateContent` support. This is a successful metadata-access DYNAMIC_TEST only.

One isolated native generation request used the existing primary credential, a synthetic English JSON prompt, `thinkingLevel: low`, `maxOutputTokens: 256`, JSON response MIME type and no temperature. The node had a 25-second timeout. The total probe duration including setup/teardown was 26.87 seconds. n8n reported a connection abort, with no Google HTTP/error code, generated text or `modelVersion`. The harness HTTP 200 carries diagnostic metadata and does not mean generation succeeded. No full quote, Studio or fallback was therefore tested on 3.7.

[Google's official 3.7 documentation](https://ai.google.dev/gemini-api/docs/generate-content/whats-new-gemini-3.7), updated October 12, 2026, states that 3.7 is deprecated and API requests are automatically routed to 3.8. The GET identity alone does not contradict this backend routing statement. The failed generation produced no modelVersion, so actual routing was not independently verified dynamically. Nor does this failure establish why the connection aborted.

The existing reference workflow digest remained identical. Credential values were not read, exported or modified. No business database action, PayPal call or GitHub publication occurred. Both metadata and generation probes were cleaned up; read-only inventory confirmed no temporary probe workflows or header credentials remain.

Switching the candidate to 3.7 is not justified by these results: no usable generation was obtained, and the documented API routing does not establish an independent alternative to 3.8. Earlier payment and financial validation remain within their historical scope.
