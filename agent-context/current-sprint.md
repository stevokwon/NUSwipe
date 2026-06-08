# Current Sprint Context — Sprint 2

## Branch policy
All work on feature branches from sprint-1-swipe-submit tag.
Branch naming: {lane}/{task-id}-{short-description}
No direct pushes to main. PRs required.

## Graph state (post Sprint 1)
- 201 nodes · 248 edges · 31 communities (full semantic pass, 2026-06-09)
- Full semantic pass needed before Sprint 2 planning
- God nodes: triggerSwipe, submitApplication, recordSkip (UI-dominant)
- Community 0 cohesion: 0.12 → raised after formatPhone extraction
- Community 11 (APAC Legal): still singleton in AST pass — needs semantic rebuild

## Pre-existing issues to fix in Sprint 2
- app/api/apply/route.ts:30,48 — SELECT * on profiles and jobs queries
- eslint-disable (as any) on Supabase inserts — route.ts:94,100 and applications/route.ts:63,100

## Sprint 1 fixes already shipped (do not re-do)
- lib/ats/format-phone.ts extracted — formatPhone duplication eliminated (commit 52200d82)

## Sprint 2 candidate tasks (not yet planned — run /writing-plans after semantic rebuild)
- Resume PDF parse-on-upload pipeline (original brainstorm gap — still not built)
- Narrow SELECT * to explicit column lists in /api/apply
- Resolve as-any Supabase insert casts with typed schema
- Full semantic graph rebuild before brainstorming

## Merge state
<!-- Tasks will be added after /writing-plans -->

## Active task for this session
<!-- FILL THIS IN before starting each session -->
