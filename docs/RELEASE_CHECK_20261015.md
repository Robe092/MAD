# Targeted release check —15 October2026

The clean-install baseline was commit `a91ae1c`. This release restores the PayPal credential import, restores two conservative SQL payment-state guards and corrects judge instructions. Application UI and configured Gemini3.8 model were not changed by these corrections.

## Verified

- **INTEGRATION_TEST PASS:** fresh clone, dependency installation, repeatable setup, workflow import/publish, production build and seven real frontend/gateway/n8n/PostgreSQL checks. The fresh environment contained five catalogue products and no seeded orders or captures.
- **UNIT_LOGIC PASS:**86 local checks (47 engine,31 frontend,8 packaging), including two regression checks against the real workflow credential IDs. Local checks are not live payment proof.
- **INTEGRATION_TEST PASS:** corrected importer created PostgreSQL/header, PayPal Sandbox basic-auth and Gemini primary/fallback credentials in the isolated instance. Values remained private. This proves binding, not PayPal credential validity or capture.
- **INTEGRATION_TEST PASS:**14 targeted SQL checks plus stock assertions verified the conservative guards. Existing payment attempts keep alternate-channel issuance and local closure blocked pending verification; unattempted quotes remain claimable/cancellable. Synthetic rows were rolled back.
- **INTEGRATION_TEST PASS:** a real native Gemini3.8 primary response generated three cases of Chateau2018 at5% discount. Database result:3×USD427.50=USD1282.50, PENDING_APPROVAL and three reserved units. Explicit operator approval succeeded.
- **INTEGRATION_TEST PASS:** a second native Gemini3.8 primary response explained the one recorded APPROVED order and its USD1282.50 amount in English, explicitly stating that internal records do not verify actual PayPal captures. Both native responses report `modelVersion=gemini-3.8-flash`, finish reason STOP. Exactly two user-level AI calls were made.
- **Cleanup PASS:** owned quote CANCELLED, amount unchanged, zero reserved stock, zero invoices/payment operations/paid orders, physical stock unchanged. Temporary copied provider credentials, owned containers/volumes and disposable clone were removed; test ports closed.
- **STATIC_ANALYSIS PASS within stated patterns:** no Google/GitHub token or private-key pattern found in tracked source or reachable Git blobs, and no tracked private configuration/build directory. This pattern scan is not an exhaustive secret-detection guarantee.

Two initial SQL test-harness failures (syntax and fixture ID) were preserved before correction; they are not product-failure evidence. No actual external financial incident was demonstrated. Restoring the older conservative guards avoids relying on a failure classification as proof that no remote payment resource exists.

## Separate evidence and remaining delivery

Earlier USD304 completed PayPal Sandbox capture is historical evidence. No fresh buyer checkout/capture or new merchant validation is claimed here. The demo V9 remains the existing recording and labels its separate executions.

The owner confirmed a solo submission, MIT, rights to the submitted code/assets and disclosure of the pre-existing n8n/PostgreSQL foundation with hackathon improvements. Third-party dependency terms still apply.

The repository has local setup instructions. A hosted URL, private provider access arranged for the judges and access throughout judging have not been established by this test. Evaluator-owned keys are a configuration option, not proof of free unrestricted owner-provided access. Public GitHub visibility, public YouTube upload and Devpost submission must be verified separately before declaring the entry submitted.
