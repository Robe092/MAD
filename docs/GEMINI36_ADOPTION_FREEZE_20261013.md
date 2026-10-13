# Gemini 3.6 adoption and local candidate freeze — October 13, 2026

**Adoption: PASS.** Candidate and saved/published reference workflow now use the exact qualified Gemini 3.6 configuration. This change performs no new content generation or PayPal operation.

## Adopted configuration

Both HTTP nodes target gemini-3.6-flash, retaining their existing native credential references. The request uses low thinking and JSON output with a 2048-token cap; deprecated temperature is removed. The Stage1 model-proof label matches 3.6. Node IDs, connections, workflow settings, credentials, timeouts and business logic remain unchanged. Candidate workflow SHA256 is d841b6583b8d85a51051cbd1835056fa22e500492edc64ee72736f6e6e64ad8b, exactly the proposed file tested in the targeted campaign.

The candidate parameters, reference saved/published parameters and local reference export match. Private rollback backups were kept only in the ignored private directory.

## Stock language correction

The reference payflow_persist_quote function matched the known baseline source hash before updating its two stock-message literals. The guarded transaction preserved the digest of products, orders, order items, invoices and payment operations. Function privileges, security mode and search path were identical. The local reference SQL export was updated to match candidate SQL. Only messages changed; no stock, quote, approval or financial rule changed. This follows the real isolated PostgreSQL recheck already recorded in GEMINI36_FINAL_FOUR_20261013.json.

## Verification and evidence limits

Static analysis reports zero blocking violations. All 50 impacted backend/English/harness unit checks passed. The nine targeted scenario successes are consolidated from several real runs, with the unchanged pre-Gemini missing-email proof retained and the stock English fix separately checked in PostgreSQL. Genuine primary-error→secondary fallback and Studio grounding were actually executed. These are scoped integration proofs, not nine new tests after deployment or a new PayPal payment. See GEMINI36_STUDIO_FINAL_20261013.json for provenance.

Provider 503 and timeouts occurred during the campaign and remain documented. Qualification does not guarantee future Google availability. Earlier PayPal buyer capture, stock settlement/replay and 31-trap successes retain their historical scopes. Fresh provider execution on a new evaluator-owned n8n installation and licence/access prerequisites retain their separate limitations.

The local freeze includes candidate code, sanitised reports and this adoption record. Credentials, private files, screenshots, dependencies and other projects are excluded. A neutral contributor identity is used. No GitHub remote/publication or billing action is part of the freeze. This is a reproducible code snapshot for video preparation, not a certificate of uninterrupted service or completion of the contest submission.
