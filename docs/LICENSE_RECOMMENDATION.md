# Source licence recommendation — owner decision pending

No licence change is applied in this pass. The existing local MIT file is a proposal from initial preparation, not an owner-approved publication decision. No remote/public repository has been created.

| Option | Protection and limits |
| --- | --- |
| MIT | Broad permission to reuse, modify and sell with the required notice. No obligation to publish modifications. Simple, but not aligned with maximizing reciprocal source sharing. |
| MPL 2.0 | File-level copyleft: distributed modifications of covered files remain available under MPL. Other files can have different licences, including proprietary ones. Server-only SaaS use does not trigger source distribution in the same way as delivery of browser code. |
| AGPL v3 | Stronger copyleft, including an obligation to offer corresponding source to remote users interacting with a modified network version. Commercial use remains allowed. Combination/distribution with proprietary AG Studio code needs a specific compatibility/permission review before choosing it. |

Recommendation: if the priority is the strongest reciprocal protection, consider **AGPL v3 subject to confirming the rights and compatibility of the complete distribution**, especially AG Studio. If that cannot be confirmed, **MPL 2.0 is the more practical compromise** for protecting distributed changes to your files while accommodating separate proprietary components. MIT is the least protective of these options for downstream changes. No open-source licence prevents competing products or all commercial reuse; a non-commercial/no-reuse restriction would not meet the contest's open-source requirement.

Sources: [MIT](https://opensource.org/license/mit), [AGPL v3](https://opensource.org/license/agpl-3.0), [Mozilla MPL FAQ](https://www.mozilla.org/en-US/MPL/2.0/FAQ/). This recommendation does not certify third-party licence compatibility or ownership.

Third-party licences remain separate. AG Grid Community and AG Studio are distinct products: the installed Studio/Studio React and its enterprise components are not relicensed by adding MIT/MPL/AGPL to PayFlow. AG Studio allows local testing without a licence and directs production testing to a trial; the hackathon advertises a 45-day trial. Confirm actual permission and judging-period coverage with the rights holder before hosting. Sources: [AG Studio licence installation](https://www.ag-grid.com/studio/react/licence-install/), [hackathon sponsor instructions](https://paypalaihackathon.devpost.com/details/aggrid).

n8n uses the Sustainable Use License rather than an OSI open-source licence. The candidate references its Docker image and does not vendor n8n. Any public use/resale of n8n itself must stay within its terms; this pass does not grant an additional commercial licence. Source: [n8n licensing](https://docs.n8n.io/sustainable-use-license/).

Before publication, the owner must choose the source licence, confirm the copyright holder/contributors and rights to inherited code/assets, and validate the chosen distribution against third-party terms. No licence key, logo permission or provider credential is included or inferred from the source licence.

## October 11 pre-publication recommendation

For the current goal (protect modifications to PayFlow source while keeping separate commercial dependencies), **MPL-2.0 is the recommended practical starting choice**, subject to owner rights approval and AG Grid's confirmation for this distribution. MIT is simpler if broad proprietary reuse is acceptable; AGPL-3.0 offers stronger reciprocity but requires a specific compatibility assessment for a combined browser application using commercial AG Studio. All three permit commercial reuse and are open-source licences; the hackathon requires an open-source licence without naming a preferred one. None protects an idea from independent reimplementation or forbids every competing service. This paragraph changes no licence file.

AG Studio confirmation needs to cover **external jury use and the public demo, as well as expiry**. Its pricing page links the [commercial EULA v40](https://www.ag-grid.com/eula/commercial/): clause 13.2 restricts a generic trial to internal evaluation under a non-transferable/non-sublicensable grant. The sponsor's 45-day offer may have specific terms; no project-specific grant is on file. Request those terms and confirmation rather than assuming the general trial covers judge installations. See the prepared question and concrete access decisions in [PREPUBLICATION_PLAN.md](PREPUBLICATION_PLAN.md).
