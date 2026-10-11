# Minimal candidate-only Gemini language check

This check does not launch or edit n8n, PostgreSQL, the frontend or PayPal. It constructs the request from the candidate workflow's existing prompt node and sends it directly to the workflow's primary Gemini URL. Catalogue and portfolio context are small, explicitly synthetic fixtures. Neither a successful HTTP call nor an English excerpt proves a new n8n end-to-end flow.

## Offline preparation

From the candidate repository root, with Node.js 20 or later:

```sh
node scripts/check-gemini-language.cjs
node --test tests/gemini-language-runner.test.cjs
```

The default command does not read a key or contact any provider. It displays the unchanged primary model, four scenario names and a maximum of four calls. No fallback or automatic retry is used. A 404 means the configured model/access needs separate diagnosis; a 429 means quota must be resolved. The runner does not change models to conceal such failures.

## Private configuration and deliberate live execution

Use a dedicated Gemini testing key, created/configured by the owner with quota for the primary model. Do not extract credentials from the reference n8n instance or copy its `.env`. The runner reads only `.payflow-private/gemini-language-test.key` in the candidate. It never accepts the key as a command argument or prints it. No Docker/provider import is necessary for this small check.

1. Create the candidate's `.payflow-private` directory with mode 0700 if absent. Using your local editor, create `gemini-language-test.key` there containing only the dedicated key, and restrict the file to mode 0600. The directory is already excluded by `.gitignore`. Do not paste the key in this conversation.
2. Run deliberately:

   ```sh
   node scripts/check-gemini-language.cjs --live
   ```

   Four sequential calls at most, with a 25-second timeout per call. Stops on the first provider/contract failure; does not retry or call the fallback. Expected quote: one `LANG-SKU` case, requested discount 18%, synthetic customer `Language QA`, email `language@example.invalid`. The test verifies that the request is not reduced to the allowed discount of 10%. It does not create an order or calculate/capture a payment. Expected Studio command: `studio` / `PENDING_APPROVAL`.
3. Read the generated private `gemini-language-proof-*.json` report in your editor. It contains timestamps, model, workflow/request hashes, HTTP/contract results and short explanatory excerpts from synthetic context. No key, request headers, raw provider errors or real customer data are exported. Do not commit the report or use its synthetic data as real payment/demo evidence.
4. Review all four explanatory outputs: English prose; French input correctly understood; correct requested product/discount; Studio grounds analysis in three orders and does not claim $600 is captured money. A paid-order count does not establish payment receipts. Record the reviewer/date and PASS or the exact discrepancy in a separate sanitized review. Automated JSON validation leaves the language verdict NOT_VERIFIED until this review.
5. Remove the temporary key file after the check when no longer needed. Keep only necessary private evidence. No credential rotation is required.

The real call remains NOT_VERIFIED in this preparation pass: no candidate-only test key has been supplied and no live invocation is performed. The later jury installation still needs a small actual n8n quote/Studio check after private provider configuration. No PayPal payment is required for either AI check.

Implementation follows [Google's generateContent API](https://ai.google.dev/api/generate-content). Authentication is sent in the `x-goog-api-key` header to a fixed HTTPS Google endpoint; redirects are refused. Source review/unit fixtures do not substitute for provider results.
