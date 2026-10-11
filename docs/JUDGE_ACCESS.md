# Judge access and prerequisites

The repository is a local candidate, not a published demo. No hosted URL or judge login exists yet. The frontend runs as a single persistent Node.js process; Docker Compose supplies n8n and PostgreSQL. Follow README steps 1–6 from the repository root. A complete installation remains several steps, including first-time n8n owner registration, provider configuration and publishing the imported engine in the local n8n editor.

## What the installer creates, and what must be supplied

| Component | Supplied by setup | Still required for full evaluation |
| --- | --- | --- |
| PostgreSQL | Isolated database, migrations, five catalogue products, restricted runtime role | Docker and its downloaded image; no external Supabase account required |
| PayFlow operator | New local login and signing keys in the private directory | Retrieve the login locally; for hosted access, provision a dedicated judge account and communicate it in testing instructions |
| n8n | Dedicated local container and neutral credential bindings | Complete the n8n owner registration, import the engine, then publish it locally; n8n owner access is not required to use the cockpit |
| Gemini | Primary/fallback HTTP nodes and English-output prompt | API key valid for the unchanged configured models, sufficient quota; configure locally or privately in n8n, never send the key in chat or commit it |
| PayPal | Sandbox Orders v2 flow and portable OAuth binding | Sandbox application's client ID/secret, merchant access, a separate Sandbox buyer account for deliberate checkout; no Live credentials |
| AG Studio | Declared packages and English dashboard | Local evaluation may show a watermark; owner must confirm the applicable trial/sponsor/deployment permission and dates |

The frontend wrapper pins the operator file to this installation and uses the configured public origin/port. Setup initializes the database origin explicitly; it must match the browser and PayPal return origin. Do not skip setup or alternate `localhost` and `127.0.0.1`.

There are two access options, allowed by the [official rules](https://paypalaihackathon.devpost.com/rules): complete installation instructions or hosted demo access. A hosted demo is recommended for convenience, but has not been authorized or deployed. For hosting, first select the host/origin, arrange HTTPS and persistent private storage, and confirm AG Studio permission. The current bootstrap only supports localhost HTTP; it is not a validated public deployment recipe.

For a local full-provider evaluation, either the evaluator configures their own Sandbox/Gemini accounts, or the owner arranges a clear private access procedure with dedicated testing access. The present repository alone does not guarantee judges can use providers without additional setup. Do not put provider secrets into the public README. If a hosted demo is chosen, provider credentials stay on the server/n8n; judges receive only dedicated operator and Sandbox buyer access through the submission's testing instructions.

## Readiness check before recording or judging

1. Sign in, load the actual catalogue and confirm the intended database origin. A new installation has no orders, no paid receipts and no payment operations.
2. Verify a real Gemini quote and Studio analysis on the selected jury environment. Use French and English requests; check valid JSON, catalogue grounding, English explanations and truthful provider proof. The language-only export has unit contract evidence, but no fresh live Gemini response evidence yet.
3. Verify the configured Sandbox merchant and OAuth access without rotating or modifying the reference credentials. Any new buyer checkout/capture requires a separate explicit authorization from the owner.
4. Keep Orders v2 as the demonstrated payment route. Invoicing v2 was unavailable on the reference app due to missing scope (403) and is not a validated jury feature.
5. Check licence permission, provider quotas and judge access remain valid throughout judging, December 1–15, 2026. The sponsor's advertised 45-day trial is not proof that a particular activation covers these dates; obtain confirmation for the intended use.

Reference-instance provider/capture evidence and earlier clean-install checks are historical evidence. Neither proves the English candidate has completed a new provider end-to-end run. Screenshots labelled VISUAL QA are rendering checks with fixtures, not product-demo footage or settlement proof.

Owner decisions still needed: approve the source licence and attribution; confirm provenance; choose local or hosted judge access and arrange dedicated testing accounts/provider configuration; confirm AG Studio permission. No new payment, public deployment or GitHub publication is authorized by this document.
