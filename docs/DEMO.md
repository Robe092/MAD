# English testing and demonstration guide

## What the product does

PayFlow AI turns a commercial request into a controlled B2B quote and a PayPal Sandbox checkout. Gemini proposes catalogue lines; deterministic rules compute amounts and identify stock, margin and discount issues. A human operator reviews exceptions. AG Studio makes the resulting catalogue, orders, lines and payment operations explorable.

## Main interface labels

| Label | Meaning |
| --- | --- |
| Overview | Sales workspace overview |
| Orders | Quotes, internal approvals and payment tracking |
| Catalogue | Product prices and available inventory |
| AI analytics | AG Studio exploration and Gemini explanations |
| Internally approved | Operator authorization; customer acceptance and payment are separate |
| Awaiting payment | No completed capture is established by this label |
| Confirmed PayPal capture | Settlement must be supported by verified external capture evidence |
| Cancelled / Expired | Eligible reservations released; physical stock preserved |

## Functional walkthrough

1. Complete the README setup, publish the n8n engine and sign into PayFlow using the generated operator account. A new installation shows the five catalogue products and an empty order list.
2. Read the catalogue prices and available stock. In **Overview**, select **Use fictional demo customer**, enter `3 cases of Chateau 2018 with a 5% discount.` and select **Prepare quote**.
3. Inspect the USD 1,282.50 total, the three reserved cases and the internal approval requirement. An ordinary quote below the threshold can pass automatically. Insufficient stock blocks a quote without reserving unavailable units.
4. Where review is required, perform the explicit internal decision. That decision is not a signed commercial acceptance by the customer.
5. To test payment deliberately, create the PayPal Sandbox checkout, inspect its reference/amount, and approve it using the separate Sandbox buyer account. Return to the app, then explicitly reconcile/capture as the operator. Check confirmed capture, order status and catalogue stock. Opening/refreshing the order does not automatically capture a payment.
6. In AG Studio, explore the same persisted data. Use cross-filtering, inspect orders and product relationships, and ask the Studio agent to focus on awaiting payments or margins. The response must come from the configured Gemini integration and actual current data. An empty freshly installed order list must not be presented as populated analytics.
7. For an unpaid quote with no payment issuance attempt, use Cancel and confirm that the reservation is released. A previous payment attempt conservatively blocks local cancellation or a different payment channel until its remote state is verified, even when no resource ID was saved. Expired eligible quotes are checked every 15 minutes. An uncertain or still-payable PayPal resource keeps its reservation pending verified terminal status.

## Completed demonstration video

The English competition edit follows one USD 1,282.50 quote through the browser, from the buyer request to the operator’s internal approval and checkout link. It shows the buyer approving the test transaction in PayPal Sandbox, then the operator explicitly capturing the payment. PayFlow displays PayPal's completed capture and updates physical inventory from 40 to 37 cases. The last scenes show the order and AG Studio's confirmed-payment filter.

The video edits real browser recordings from October 23, 2026. Gemini 3 Flash Preview handled the quote and the pre-payment Studio analysis in those recordings. The analysis appears before checkout, when the same order was still outstanding. The workflow in this repository is configured for Gemini 3.8 Flash.

The October 15 release check independently verified a high-value quote, human approval and Studio with Gemini 3.8 Flash. See [the release check](RELEASE_CHECK_20261015.md).

All demonstrated payments are Sandbox tests. Formal customer quote acceptance and PayPal Invoicing are not claimed as validated submission features.
