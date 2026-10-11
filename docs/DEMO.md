# English testing and demonstration guide

## What the product does

PayFlow AI turns a commercial request into a controlled B2B quote and a PayPal Sandbox checkout. Gemini proposes catalogue lines; deterministic rules compute amounts and identify stock, margin and discount issues. A human operator reviews exceptions. AG Studio makes the resulting catalogue, orders, lines and payment operations explorable.

## French interface labels

| UI label | English meaning |
| --- | --- |
| Se connecter / Déconnexion | Operator sign in / Sign out |
| Vue d'ensemble | Overview |
| Commandes | Orders and quotes |
| Catalogue | Product catalogue |
| Préparer un devis / Créer un devis | Prepare / Create a quote |
| Validation interne requise | Internal operator review required |
| Validée en interne | Internally approved; customer acceptance is separate |
| Paiement attendu | Awaiting payment |
| PayPal capturé | Confirmed PayPal capture |
| Paiement simulé | Simulated test settlement, not a real capture |
| Devis expiré / Annulée | Expired / Cancelled quote |
| Stock disponible | On-hand stock minus reserved stock |
| Remise / Marge | Discount / Margin |
| Vérifier / Rapprocher | Check / Reconcile payment; read action does not automatically capture |
| Capturer | Explicitly capture an approved Sandbox payment |

## Functional walkthrough

1. Complete the README setup, publish the n8n engine and sign into PayFlow using the generated operator account. A new installation shows the five catalogue products and an empty order list.
2. Read the catalogue prices/available stock. In the quote form choose **Orders v2**, enter an explicit Sandbox customer's name and email, and ask Gemini for one unit of `SPIRIT-RHUM-XO` with no discount. Replace the name/email in your prompt with the actual Sandbox buyer details; do not reuse personal customer data.
3. Inspect the computed amount, stock reservation and financial checks. For the seeded product, an undiscounted unit is USD 240 before any configured tax. A discount exceeding the product's limit should visibly require internal review; insufficient stock should block the quote without reserving unavailable units. Do not assume every quote requires approval: ordinary quotes can pass automatically.
4. Where review is required, perform the explicit internal decision. That decision is not a signed commercial acceptance by the customer.
5. To test payment deliberately, create the PayPal Sandbox checkout, inspect its reference/amount, and approve it using the separate Sandbox buyer account. Return to the app, then explicitly reconcile/capture as the operator. Check confirmed capture, order status and catalogue stock. Opening/refreshing the order does not automatically capture a payment.
6. In AG Studio, explore the same persisted data. Use cross-filtering, inspect orders and product relationships, and ask the Studio agent to focus on awaiting payments or margins. The response must come from the configured Gemini integration and actual current data. An empty freshly installed order list must not be presented as populated analytics.
7. For an unpaid quote with no live PayPal resource, use Cancel and confirm that the reservation is released. Expired eligible quotes are checked every 15 minutes. An uncertain or still-payable PayPal resource keeps its reservation pending verified terminal status.

## Three-minute video outline (English narration)

| Time | Show | Explain |
| --- | --- | --- |
| 0:00–0:20 | Overview and business problem | B2B quoting needs both speed and safe financial controls. |
| 0:20–0:55 | Real Gemini quote request | AI proposes catalogue items; it does not set authoritative prices or inventory. |
| 0:55–1:25 | Quote checks and required internal decision | Deterministic checks protect stock, discounts and margins. |
| 1:25–2:10 | Actual Sandbox checkout and confirmed capture | Buyer approval, capture and persistence are separate verified steps. |
| 2:10–2:45 | AG Studio cross-filter and native agent | Analysis uses the same actual persisted business data. |
| 2:45–2:55 | Closing overview | State what was verified and that payment is PayPal Sandbox. |

This is a recording plan, not a generated video or payment authorization. Use footage of real executions, English narration/subtitles, and keep the final edit below three minutes. Do not claim that formal customer quote acceptance or PayPal Invoicing was demonstrated.
