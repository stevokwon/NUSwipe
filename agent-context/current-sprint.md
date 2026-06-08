# Current Sprint Context — Sprint 2: Real Job Feed

## Branch policy
Feature branches off sprint-2/real-job-feed.
Branch naming: feat/{lane-lowercase}/{task-id}-{short-description}
PRs back to sprint-2/real-job-feed, not main.
main only updated when full sprint is reviewed and tagged.

## Graph state (semantic pass, post Sprint 1)
- 201 nodes · 248 edges · 31 communities
- God nodes: Sprint1Archive(12), ProductSpec(8), AGENTS.md(8),
  APACSchema(7), CLAUDE.md(7), apac-mapper(5)
- CLAUDE.md betweenness centrality: 0.029 (cross-community bridge)
- Community 0 (APAC Profile & Legal Gate): 37 nodes, cohesion 0.08 — RISK
- Community 3 (Card & Progress UI): 20 nodes, cohesion 0.11
- Community 2 (Supabase & UI Primitives): 23 nodes, cohesion 0.13

## Sprint 2 goal
Pilot-ready real job feed.
- Manual job curation via CSV/JSON seed format
- Real job cards with role, company, salary, visa flag, ATS type
- Feed query: active + not-yet-swiped + ordered by date
- Swipe right submits via existing Sprint 1 pipeline

## Sprint 3 (planned after Sprint 2)
Resume tailoring: PDF parse → role match + skill match →
relevance score → personalised swipe feed order

## Known pre-existing issues (carried from Sprint 1)
- app/api/apply/route.ts:30,48 — SELECT * on profiles and jobs
- eslint-disable in route.ts:94,100 and applications/route.ts:63,100
- Community 0 cohesion 0.08 — grew by accretion, needs splitting

## Merge state

### Lane B — Data & Schema
| Task | Branch | Status | Merged into |
|------|--------|--------|-------------|
| B1 — JobSeedRowSchema (Zod) | feat/b/B1-seed-schema | merged | sprint-2/real-job-feed |
| B2 — Seed validation + upsert script | feat/b/B2-seed-script | open PR | sprint-2/real-job-feed |
| B3 — Curated jobs CSV | feat/b/B3-jobs-csv | not started | sprint-2/real-job-feed |

### Lane A — Feed Query
| Task | Branch | Status |
|------|--------|--------|
| A1 — GET /api/jobs: explicit columns + DB-level exclusion | — | not started |
| A2 — Jobs feed integration test | — | not started |

### Lane C — Job Card UI
| Task | Branch | Status |
|------|--------|--------|
| C1 — JobCard real fields | — | not started |
| C2 — SwipeStack empty + loading states | — | not started |

## Active task for this session
<!-- FILL THIS IN before starting each session -->
