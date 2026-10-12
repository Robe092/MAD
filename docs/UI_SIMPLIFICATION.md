# Candidate interface simplification — October 12, 2026

**PASS for the modified frontend scope.** Baseline `338a01b`; user authorized the recommended simplifications. See [verification facts](UI_SIMPLIFICATION.json). These checks do not recertify Gemini, n8n, PostgreSQL or PayPal.

## Changes

- Overview keeps one priority-action list. The duplicate recent-orders table was removed; all orders remain available on the Orders page. The explanatory guide is collapsed by default.
- Customer name and email have dedicated required fields. Request examples contain products/quantities/discount only. An explicit fictional-demo-customer button fills Sandbox example details; it does not submit a quote or imply a simulated payment. The composed request retains the existing `Client: name (email). request` contract, stays below 6,000 characters, and binds the retry identifier to the entire composed request.
- Orders presents four primary filters and a More filters disclosure. Simulations, closed/blocked orders, links issued and internally approved orders retain separate filters.
- Native AG Grid height follows the displayed row count, including filters/search, with a 170px minimum and 560px maximum. One synthetic row used 170px; three catalogue products used 318px. Large datasets retain a bounded viewport and grid virtualization.
- Order details scroll inside a separate body while the action footer remains visible. Existing action conditions, approval tokens, confirmation dialogs, request payloads and capture semantics are unchanged. Payment evidence is collapsible; failed automatic tracking alerts remain outside that disclosure. The visible footer explicitly distinguishes internal approval, customer acceptance and payment confirmation.
- Native AG Studio uses two columns on desktop and one on smaller screens. The status widget grows with the number of distinct recorded settlement labels. Later widgets move together; state, filters, data relations and financial aggregations are preserved. A lower native minimum button width keeps mobile filter buttons within the widget.

## Verification

The existing frontend suite passed **31/31** checks, including authentication, CSRF, assertions, replay-related UI semantics, payment-state distinctions and Studio filter contracts. TypeScript and the final production build passed.

Actual browser checks used the candidate Next.js application and its authentication/gateway code, a new isolated temporary operator file, and a loopback synthetic upstream. The upstream supplied clearly labeled VISUAL QA orders/catalogue and refused all quote/provider/financial mutations. No reference key was copied or rebound, no n8n workflow was touched and no business database row was written.

Three deliberate blocked quote attempts proved actual customer-field composition, stable retry ID for unchanged input and a new ID after customer changes. A financial confirmation dialog was inspected then cancelled. Simulation and captured-payment filters remained separate. Grid heights, disclosure behavior, order action visibility and native Studio customization/reset were inspected.

The final mobile Studio fixture contained all **11** recorded status labels supported by the present frontend contract. At 390 × 844, every status button was inside the native widget and its content had equal client/scroll dimensions, with no horizontal page overflow. Native status filtering updated the volume and related grid rows; the filter remained applied after resizing to 1440 × 1000. The modal action footer was within both desktop and mobile viewports.

## Findings documented before correction

- **UI-01:** the first simplification placed an automatic-payment-tracking error inside a closed disclosure. Corrected by keeping the alert outside it; no provider failure was induced.
- **UI-02:** the first narrow status-widget layout clipped some buttons. A fixed enlargement did not cover all supported labels, so the final layout uses the actual label count and extends the canvas while preserving subsequent widget dimensions. The native 215px button minimum also extended beyond the mobile content box; reducing it to 180px resolved the measured overflow. Final 11-status measurements pass.

A narrow independent contradictory review accepted the final diff and measurements, with no remaining finding in this scope. The existing AG Studio trial/licence console notices are unchanged and are not classified as a new runtime defect. Trial/deployment rights still require the previously documented decision.

The read-only local preview is left available for the owner's visual review, with synthetic data and temporary local-only authentication. It is not the final hosted demonstration. Screenshots stay in the private workspace and must not be used as provider or settlement proof. GitHub publication remains pending final project validation.
