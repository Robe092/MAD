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
2. Read the catalogue prices/available stock. In the quote form choose **Orders v2**, enter an explicit Sandbox customer's name and email, and ask Gemini for one unit of `SPIRIT-RHUM-XO` with no discount. Replace the name/email in your prompt with the actual Sandbox buyer details; do not reuse personal customer data.
3. Inspect the computed amount, stock reservation and financial checks. For the seeded product, an undiscounted unit is USD 240 before any configured tax. A discount exceeding the product's limit should visibly require internal review; insufficient stock should block the quote without reserving unavailable units. Do not assume every quote requires approval: ordinary quotes can pass automatically.
4. Where review is required, perform the explicit internal decision. That decision is not a signed commercial acceptance by the customer.
5. To test payment deliberately, create the PayPal Sandbox checkout, inspect its reference/amount, and approve it using the separate Sandbox buyer account. Return to the app, then explicitly reconcile/capture as the operator. Check confirmed capture, order status and catalogue stock. Opening/refreshing the order does not automatically capture a payment.
6. In AG Studio, explore the same persisted data. Use cross-filtering, inspect orders and product relationships, and ask the Studio agent to focus on awaiting payments or margins. The response must come from the configured Gemini integration and actual current data. An empty freshly installed order list must not be presented as populated analytics.
7. For an unpaid quote with no payment issuance attempt, use Cancel and confirm that the reservation is released. A previous payment attempt conservatively blocks local cancellation or a different payment channel until its remote state is verified, even when no resource ID was saved. Expired eligible quotes are checked every 15 minutes. An uncertain or still-payable PayPal resource keeps its reservation pending verified terminal status.

## Completed demonstration video

The completed English V9 is `PayFlow-AI-English-Final-v9.mp4`: approximately2min25s, with narration and burned English subtitles. Its public YouTube URL must be added to the Devpost submission after upload. The source repository does not claim a published video link or hosted application.

The recording distinguishes a standard USD304 quote, a separate USD1282.50 quote requiring internal review, a historically completed USD304 PayPal Sandbox capture, and a real Gemini API response from a separate execution. These scenes must not be described as one uninterrupted fresh end-to-end transaction. The separate API evidence does not constitute a successful Studio interface recording.

The later release check independently verified the current Gemini3.8 high-value quote, human approval and Studio API response. See [the release check](RELEASE_CHECK_20261015.md). These later checks do not change what appears in V9 and made no new payment.

All demonstrated payments are Sandbox tests. Formal customer quote acceptance and PayPal Invoicing are not claimed as validated submission features.
