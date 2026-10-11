# Reference n8n synchronization — 2026-10-11

The owner explicitly requested synchronization of completed changes to the existing n8n instance. This authorizes the language-only update of `[PayFlow Hackathon] 13`; the original systems, credentials, payments and other workflows remain outside this update.

The deployable definition is constructed from the real instance, replacing only `parameters.jsCode` in the four previously reviewed English Code nodes. The standalone candidate's empty credential templates, ID and inactive state must never replace the real configuration.

| Category | Applicability | Verification |
| --- | --- | --- |
| Four English Code blocks | APPLICABLE | Existing targeted language/contract checks; independent static delta review |
| Saved and published configuration, local coherence | APPLICABLE | Read-only API comparisons before/after update |
| Credentials, models, graph, settings, layout and technical identifiers | APPLICABLE | Exact preservation checks |
| Runtime/provider language | NOT_VERIFIED in this synchronization | No provider call; requires separate real response evidence |
| PostgreSQL mutations and PayPal payments | NON APPLICABLE | No execution or financial operation |
| Frontend deployment to n8n | NON APPLICABLE | Frontend code is stored separately in the standalone candidate repository |

Before synchronization: the active saved and published definitions match the local reference export. The private before/after backup is separate from the public candidate. No credential values are read or exported. Independent review confirms that only user-facing strings and Gemini language instructions differ, preserving calculations, SQL, JSON keys, status codes and interpolated expressions.

Result: PASS for configuration synchronization. The workflow is active; the local reference export, saved definition and published nodes/connections match. Credentials, connections, settings, positions and other control metadata are preserved. Only workflow 13 was written. See N8N_SYNC.json. Synchronization alone does not establish end-to-end readiness or prove live English Gemini responses.
