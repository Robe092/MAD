# Repository preparation — not published

Scope: prepare a standalone source repository from the existing PayFlow frontend and engine 13. Keep the current n8n instance, credentials, data and unrelated projects untouched. No provider or buyer payment is triggered. This directory is a local candidate, not a hosted demo.

## Applicability established before verification

| Category | Applicability | Evidence planned |
| --- | --- | --- |
| Source selection, deployment metadata, secrets and personal data | APPLICABLE | Explicit allowlist, comparison to original executable graph, scan candidate tree and new history |
| Operator/config bootstrap and database installation | APPLICABLE | New isolated PostgreSQL container, existing migrations, restricted runtime role, repeat bootstrap |
| Dependency lock and clean frontend installation | APPLICABLE | Fresh `npm ci`, existing tests and production build |
| Next.js → isolated n8n → isolated PostgreSQL | APPLICABLE | Authenticated real dashboard, refusal tests, deterministic quote/abandon without providers |
| Packaging regression | APPLICABLE | Existing engine and frontend suites; contradictory review of changed packaging only |
| New Gemini/PayPal calls or financial settlement | NON APPLICABLE to packaging | Existing engine preserved; no provider credential is copied or new payment authorized |
| Existing instance, original workflows, other projects | NON APPLICABLE | No deployment or mutation on that instance |
| SMTP, Slack, PDF, Drive, DocuBridge handler | NON APPLICABLE | Excluded from the standalone engine |
| Public hosting and publication | NON APPLICABLE | Not authorized; no remote or push |

Classes: static comparisons `STATIC_ANALYSIS`; existing logic suites `UNIT_LOGIC`; clean DB/bootstrap `INTEGRATION_TEST`; real isolated webhook `DYNAMIC_TEST`. Provider-dependent end-to-end remains `NOT_VERIFIED` for this new installation; previous instance evidence is not a substitute.

Any demonstrated failure is documented before correction. This report does not claim a fresh provider payment, licence approval or production certification.

## Findings recorded before correction

- `PACK-01` / `STATIC_ANALYSIS`: EXPECTED: the validated dedicated Compose project/configuration controls every Docker command. ACTUAL: the first helper omitted explicit `-p` and inherited shell variables, which could override the `.env` project and ports/passwords. No unintended stack was touched during the test; correction must pass the validated project explicitly and use the validated config in the subprocess environment.
- Offline dependency installation: EXPECTED: all locked packages in cache. ACTUAL: `npm ci --offline` stopped with `ENOTCACHED` for `util-deprecate`. This is a cache limitation, not a product failure; retry the documented online installation.
- `PACK-02` / `STATIC_ANALYSIS`: EXPECTED: the candidate frontend uses only its freshly generated operator. ACTUAL: the initial wrapper inherited `PAYFLOW_AUTH_CONFIG` from the shell, which could select another operator/session directory. No other operator was accessed; correction must set the candidate's private configuration path explicitly.
- `PACK-03` / `UNIT_LOGIC`: EXPECTED: existing frontend tests run with their original frontend working directory. ACTUAL: the initial root test command ran all suites from the repository root (44 engine PASS, 3 frontend test files failed with ENOENT on `src/lib/*`). Correction: a small test runner preserves each suite's working directory; no frontend/test logic change.

## Verified results

| Check | Class | Result |
| --- | --- | --- |
| Online `npm ci --prefix frontend-payflow` from an empty dependency tree | INTEGRATION_TEST | PASS; 129 locked packages installed |
| `npm run build` | STATIC_ANALYSIS | PASS; Next.js 14.2.35 compilation/types, all six routes generated |
| Existing engine tests | UNIT_LOGIC | 44/44 PASS |
| Existing frontend tests | UNIT_LOGIC | 28/28 PASS |
| Packaging isolation tests | UNIT_LOGIC | 3/3 PASS; conflicting shell project/config/operator values cannot change the target |
| Workflow static analyzer | STATIC_ANALYSIS | PASS; 0 blocking violations, 0 warnings |
| Fresh isolated DB/bootstrap and repeats | INTEGRATION_TEST | PASS; migrations 10 → 12 → 11, 5 products; repeat skips migrations and preserves the cancelled test order |
| Runtime database permissions | INTEGRATION_TEST | PASS; not superuser, can execute quote functions, cannot update auth configuration; `DATABASE_SETUP.json` |
| Fresh app/operator/n8n/PostgreSQL checks | INTEGRATION_TEST / DYNAMIC_TEST | 16/16 PASS; `INSTALLATION_CHECKS.json` |
| Real isolated n8n execution inspection | DYNAMIC_TEST | 8 successful executions, no provider node visited; `ISOLATED_EXECUTIONS.json` |
| Contradictory packaging review | STATIC_ANALYSIS | PASS; resolved PACK-01/02, no open finding; `REVIEW.json` |

The dynamic flow starts with a genuine empty dashboard, creates one deterministic USD 240 quote, reserves one unit, cancels it, then replays cancellation without a second release. On-hand stock remains 15; reserved stock returns to zero. No invoice/payment operation/capture is created. The fixture exists only in the disposable installation, not in distributed source data. All observed execution statuses and database effects were checked; success is not inferred from the build.

The frontend source and SQL are preserved byte-for-byte. The workflow keeps all 20 executable nodes, 23 connections, positions, annotations and configured parameters/settings. Only deployment identity/active metadata and credential reference ids/names change in the portable export. The dependency manifest now declares its directly imported `ag-studio` 3.0.0 explicitly; the resolved dependency versions stay unchanged. The README documents the inherited port 3006 fallback and the explicit initialized origin, rather than changing engine code during packaging.

## Remaining publication checks

This candidate has no remote and is not published. A new installation with real Gemini/PayPal credentials, provider quotas/scopes, buyer approval/capture and hosted judge access remain NOT_VERIFIED by this packaging pass. Prior successful reference-instance executions are not re-labelled as fresh-install provider evidence. No existing credential was inspected or changed.

Before publication, the owner must review source ownership/MIT attribution, hackathon-period provenance, English submission materials and the intended AG Studio licence/sponsor permission (including the judging period). Invoicing remains an externally permission-dependent branch, not the recommended Orders v2 demo. Local disk sessions are supported for this single-instance demo, not certified for distributed hosting.

Clean-clone and Gitleaks results will be added after the final candidate scan. The original monorepo history is not copied; no private environment, backup, execution payload, real customer record or screenshot is included.
