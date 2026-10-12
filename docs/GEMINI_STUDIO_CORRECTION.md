# Studio capture-grounding correction — October 12, 2026

**PASS for the reproduced Studio case.** GEMINI-STUDIO-01 (MEDIUM) is closed for that case. The original failure remains recorded in [the three-case report](GEMINI_THREE_CASES.md); before/after responses and synchronization evidence are in [the correction evidence](GEMINI_STUDIO_CORRECTION.json).

## Change and scope

The owner authorized necessary corrections. Only the Studio instructions in `Préparer la demande Gemini` were changed: the supplied portfolio contains order statuses and amounts, with no provider capture verification. A PAID status alone must not be described as confirmed captured, received, settled or verified payments. Studio must explicitly state when capture cannot be verified from the supplied context.

The candidate export and local reference export contain this correction. A guarded merge updated only that Code node on the existing n8n workflow, with a private before-change backup. Models, credentials, financial Code nodes, JSON schema, connections, settings and other node fields were preserved. Read-only comparisons confirmed the saved and published definitions match and the reference remains active.

## Targeted verification

The local language/contract suite passed 3/3 checks; offline request preparation also passed without a provider call. The independent reviewer confirmed the exact prompt-only scope before deployment.

One real native n8n Gemini call replayed the original English Studio request against the same synthetic three-order portfolio. HTTP 200, finishReason STOP, valid English JSON and the correct `studio` / `PENDING_APPROVAL` command were observed.

The reply correctly described USD 600 as recorded order volume, with one USD 200 order in each supplied status. It stated that PAID is the internal record state and does not confirm provider capture, settlement or verification, and explicitly said actual payment capture cannot be verified from this context. Unchanged Stage1 forwarded the corrected reply. This is DYNAMIC_TEST evidence; the independent semantic review accepted it.

## Preservation and limits

No PostgreSQL statement was executed and no PayPal call or payment occurred. No retries, fallback invocation or extra test case was added. The temporary protected workflow and header credential were deleted; the corrected reference workflow remained unchanged during the probe.

The nominal quote and adversarial quote were not rerun: the modified instruction is scoped to Studio, and their existing scoped passes remain intact. This closes the demonstrated Studio issue for the reproduced case; it does not guarantee every future LLM response. Synthetic context/operator fixtures do not certify the complete frontend, PostgreSQL or PayPal chain. Those remaining readiness checks are unchanged.
