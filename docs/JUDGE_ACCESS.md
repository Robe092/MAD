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

1. In **Overview**, select **Use fictional demo customer**. Enter `3 cases of Chateau 2018 with a 5% discount.` and select **Prepare quote**. The expected total is USD 1,282.50, with three cases reserved and internal approval required.
2. Review the amount, discount and stock. Select **Approve internally** and confirm. The buyer still needs to approve the payment.
3. Select **Create PayPal link** and confirm, then open the checkout and approve with a separate Sandbox buyer. Return to PayFlow and select **Capture payment** once buyer approval appears. Verify the **COMPLETED** status and capture reference under **Payment status & evidence**. On a fresh catalogue the stock for this item goes from 40 to 37 cases. Refresh PayPal status to check that the same capture is shown and stock stays at 37.
4. Explore AG Studio orders/inventory/operations and cross-filtering. Ask the assistant to explain recorded order statuses and distinguish internal records from actual completed PayPal capture evidence. Provider errors must remain errors, not fabricated answers.
5. Cancel eligible unpaid quotes to release reservations. If any payment issuance was attempted, local cancellation/channel switching remains conservatively blocked until remote state is verified. A failed response alone is insufficient evidence of no remote resource.

## Proof boundaries and access arrangements

The competition video shows one complete Sandbox payment and stock update recorded on October 23 with Gemini 3 Flash Preview. The distributed workflow uses Gemini 3.8 Flash. The October 15 release check covers a separate Gemini 3.8 Flash run. Follow the evaluation steps above to check the actual provider credentials and runtime used for judging.

Provider credentials are never supplied in the public repository. For organizer/judge evaluation, the owner must provide the required dedicated testing access through private submission instructions, or document a verified special-access process. This repository's ability to accept evaluator-owned keys does not by itself establish owner-provided unrestricted judge access. No hosted URL or shared judge account has been confirmed here.

AG Studio is a third-party dependency. Its official version3.0 installation documentation permits local testing without a licence: https://www.ag-grid.com/studio/react/installation/. This local evaluation route retains its watermark and console warnings. A trial is relevant for production testing, support and removing evaluation markings; no production deployment right is claimed here. PayFlow’s MIT licence does not relicense AG Studio.
