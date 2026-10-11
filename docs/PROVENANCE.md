# Provenance and third-party tools

This candidate is extracted from an existing private integration workspace. It is not a claim that every integration pattern was invented during the hackathon. No source code for the separate HR, legal, DocuBridge or other workflow systems is included here.

The preserved PayFlow engine combines pre-existing n8n/PostgreSQL integration foundations with the quote, stock, operator-approval and PayPal Sandbox flow. The recent work documented in the development workspace includes functional stabilization, quote cancellation/expiry, explicit customer information, operator authentication, settlement safeguards, frontend explanations and AG Studio integration. This packaging pass adds standalone installation scripts, an English guide, a portable workflow export and clean-install verification.

Before publication/submission, the project owner must review the exact attribution, contributor list and dates, and state precisely which work preceded October 1, 2026 and which significant improvements occurred during the hackathon. This document does not certify dates or ownership of pre-existing material.

Dependencies are installed from their publishers through npm/Docker. Next.js, React, n8n, PostgreSQL, Google Gemini, PayPal and AG Grid/AG Studio retain their own licences and terms. The MIT licence applies to this project's source, not to third-party commercial software, SDK permissions, logos or provider credentials.
