# Current Sprint Context — Sprint 2: Real Job Feed

## Branch policy
Feature branches off sprint-2/real-job-feed.
Branch naming: feat/{lane-lowercase}/{task-id}-{short-description}
PRs back to sprint-2/real-job-feed, not main.
main only updated when full sprint is reviewed and tagged.

## Graph state (post semantic pass — 2026-06-09)
- 132 nodes · 184 edges · 14 communities
- God nodes: setupClient(3), triggerSwipe(3), update(3), main(3), makeJobsQuery(2),
  makeSeenQuery(2), submitApplication(2), recordSkip(2), handleResumeUpload(2), handleSave(2)
- Community 8 (seed pipeline): main + seedJobs + validatedCount, cohesion 0.38
- Community 2 (swipe core): recordSkip + submitApplication + triggerSwipe
- Community 5 (feed query): makeJobsQuery + makeSeenQuery + setupClient

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
- seenIds lookup errors silently swallowed in GET /api/jobs — covered by A2 test 3 ✓

## Merge state

### Lane B — Data & Schema
| Task | Branch | Status | Merged into |
|------|--------|--------|-------------|
| B1 — JobSeedRowSchema (Zod) | feat/b/B1-seed-schema | merged | sprint-2/real-job-feed |
| B2 — Seed validation + upsert script | feat/b/B2-seed-script | merged | sprint-2/real-job-feed |
| B3 — Curated jobs CSV | feat/b/B3-curated-jobs-csv | merged · 3687f600 | sprint-2/real-job-feed |

### Lane A — Feed Query
| Task | Branch | Status |
|------|--------|--------|
| A1 — GET /api/jobs: explicit columns + DB-level exclusion | feat/a/A1-jobs-feed-query | merged · d2777059 |
| A2 — Jobs feed integration test | feat/a/A2-jobs-feed-integration-test | merged · 55700fbf |

### Lane C — Job Card UI
| Task | Branch | Status |
|------|--------|--------|
| C1 — JobCard real fields | sprint-2/real-job-feed | merged · edec151e |
| C2 — SwipeStack empty + loading states | feat/c/C2-swipestack-states | merged · 4774783d |

## Sprint 2 status: COMPLETE — merged to main, tagged sprint-2/real-job-feed
<!-- 2026-06-09: All 7 tasks shipped. Smoke test passed. Sprint 3 context TBD. -->
