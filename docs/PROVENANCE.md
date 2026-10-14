# Provenance and third-party tools

This candidate is extracted from an existing private integration workspace. It is not a claim that every integration pattern was invented during the hackathon. No source code for the separate HR, legal, DocuBridge or other workflow systems is included here.

The preserved PayFlow engine combines pre-existing n8n/PostgreSQL integration foundations with the quote, stock, operator-approval and PayPal Sandbox flow. The recent work documented in the development workspace includes functional stabilization, quote cancellation/expiry, explicit customer information, operator authentication, settlement safeguards, frontend explanations and AG Studio integration. This packaging pass adds standalone installation scripts, an English guide, a portable workflow export and clean-install verification.

Before publication/submission, the project owner must review the exact attribution, contributor list and dates, and state precisely which work preceded October 1, 2026 and which significant improvements occurred during the hackathon. This document does not certify dates or ownership of pre-existing material.

Dependencies are installed from their publishers through npm/Docker. Next.js, React, n8n, PostgreSQL, Google Gemini, PayPal and AG Grid/AG Studio retain their own licences and terms. The eventual approved source licence will apply to the project's source, not to third-party commercial software, SDK permissions, logos or provider credentials.

## Dated evidence available in the private development history

The following commit dates and PayFlow-specific changes were observed in the existing private repository. Its history is not included in this standalone candidate.

| Date | Private commit | Recorded PayFlow change |
| --- | --- | --- |
| 2026-10-10 | 1eff12fb | Operator authentication and Gemini/PostgreSQL/PayPal stabilization |
| 2026-10-10 | 303934cf | Quote lifecycle, stock release and payment tracking |
| 2026-10-11 | a6012d6c | Guided quote-to-payment experience and frontend UI |
| 2026-10-11 | e96f4cd8 | Readability finishing and documentation of owner-confirmed secret rotation |
| 2026-10-11 | 967ed1b0 | Business-control explanations based on recorded values |
| 2026-10-11 | fcfa4bd0, 0ad404d6, 6943f11a, 39ddee09 | Workflow canvas organization and explanatory annotations |

The standalone preparation and current English jury pass also occurred during the submission period. Commit dates are available evidence, not independent proof of original authorship or a guarantee that the judges consider the changes significant. The owner still needs to confirm the pre-hackathon foundation, attribution and final account of improvements. On 15 October 2026, the owner confirmed retaining the existing MIT source licence and a solo entry; the licence file remains unchanged.
