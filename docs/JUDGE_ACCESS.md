# PayFlow AI — judge access and evaluation

PayFlow AI runs locally on a desktop with Node.js20+, npm, Docker Composev2 and internet access. A public hosted deployment is not included in this repository. The video and repository links belong in the Devpost submission once public.

## Install and run

From a fresh clone of the repository root:

```sh
npm ci --prefix frontend-payflow
npm run setup
```

Setup creates private random credentials, a dedicated PostgreSQL database, five catalogue products and the local n8n service. No orders or completed payments are seeded. Keep `.env` and `.payflow-private/` private. If default ports3005/5679 are occupied, copy `.env.example` to `.env` before setup and choose matching `N8N_BIND_PORT`, `N8N_URL` and `PAYFLOW_PUBLIC_ORIGIN` values. This bootstrap supports local HTTP only.

Open `http://127.0.0.1:5679` and create the local n8n owner account. This is separate from the PayFlow cockpit operator. The generated cockpit credentials are in `.payflow-private/initial-login.txt`; they are not n8n owner credentials and setup does not print their values.

For the AI quote form and Studio assistant, configure `GEMINI_API_KEY` in the private `.env` with permission/quota for the model configured in the workflow (currently `gemini-3.8-flash`). Optional `GEMINI_API_KEY_FALLBACK` uses a separate secondary key; if omitted the secondary node reuses the primary key. This does not guarantee provider availability.

For checkout/capture, configure a PayPal Sandbox application `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` in `.env`. A separate Sandbox buyer account is required to approve checkout. Use Sandbox credentials only. Keys are required for their respective provider features; without them, the authenticated catalogue and deterministic quote engine can still be inspected.

```sh
npm run import:n8n
```

In n8n, inspect the imported workflow and credential bindings, then publish the workflow. The importer creates database/header credentials and the provider credentials supplied above. After changing provider values, rerun the importer and publish again. No provider request or payment is made by importing.

```sh
npm test
npm run build
npm start
```

Open exactly `http://127.0.0.1:3005` and sign in with the cockpit operator from `initial-login.txt`. Do not alternate `localhost` and `127.0.0.1`. `npm run dev` is an alternative for development.

## Evaluation steps

1. Ask: `Client: Acme (alice@example.invalid). Order one case of Pomerol Reserve Speciale 2020 with a five percent discount.` The seeded catalogue gives USD304. An AI request needs the configured Gemini access.
2. Ask: `Client: Acme (alice@example.invalid). Order three cases of Chateau Margaux Grand Cru 2018 with a five percent discount.` The expected total is USD1282.50 and PENDING_APPROVAL. Review checks and explicitly approve internally. This does not approve or complete a payment.
3. For an approved quote choose PayPal Ordersv2 and generate a Sandbox checkout. Open the checkout and approve with a separate Sandbox buyer. Return to PayFlow and explicitly capture/reconcile. Verify completed capture, amount and stock deduction. A browser return or an internal PAID label alone is not settlement evidence.
4. Explore AG Studio orders/inventory/operations and cross-filtering. Ask the assistant to explain recorded order statuses and distinguish internal records from actual completed PayPal capture evidence. Provider errors must remain errors, not fabricated answers.
5. Cancel eligible unpaid quotes to release reservations. If any payment issuance was attempted, local cancellation/channel switching remains conservatively blocked until remote state is verified. A failed response alone is insufficient evidence of no remote resource.

## Proof boundaries and access arrangements

The demo V9 is about2min25s and distinguishes separate executions. Earlier completed Sandbox capture and Gemini3.6 results are historical evidence. They are not a new successful Gemini3.8 run or a newly configured merchant payment. Current release-check results are recorded separately; do not infer full qualification from a successful build or unit tests.

Provider credentials are never supplied in the public repository. For organizer/judge evaluation, the owner must provide the required dedicated testing access through private submission instructions, or document a verified special-access process. This repository's ability to accept evaluator-owned keys does not by itself establish owner-provided unrestricted judge access. No hosted URL or shared judge account has been confirmed here.

AG Studio is a third-party dependency. Confirm a trial/sponsor permission covering evaluation dates; an MIT licence on PayFlow source does not grant rights to AG Studio. See the official sponsor resources for trial and access questions.
