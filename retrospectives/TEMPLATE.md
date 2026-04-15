# Retrospective — v<X.Y.Z>

<!--
Framework for SmartHealthConnect release retrospectives.

Copy this file to `retrospectives/v<X.Y.Z>.md` after every version bump in
`package.json` and before the next release branch cuts. The goal is not
post-mortem theatre — it's to capture the non-obvious lessons that would
otherwise decay into tribal knowledge, and to feed the distilled ones
into persistent memory so future Claude sessions (and humans) can avoid
the same traps.

Scope rule of thumb:
- **SemVer patch** (0.0.Z): skip the retro unless a production incident
  was involved.
- **SemVer minor** (0.Y.0): complete every section, but keep terse.
- **SemVer major** (X.0.0) or breaking contract change: complete every
  section in depth, including an explicit "what would we do differently"
  and a followups checklist that survives into the next release.

Delete this HTML comment before committing.
-->

**Release**: v<X.Y.Z>
**Date**: <YYYY-MM-DD>
**Scope**: <one sentence — e.g. "Engine/surface contract split with HealthClaw">
**Previous retrospective**: [v<prev>](v<prev>.md)

---

## 1. What shipped

Bullet the user-visible changes. Group as **features / fixes / breaking**.
Link commits where it helps. Do NOT paste the full git log — this is a
human-readable summary, the log is the source of truth.

- **Features**:
- **Fixes**:
- **Breaking**:

## 2. Engine/surface contract check

Required section — this repo is the surface; HealthClaw is the engine.

- Any new resource-level FHIR reads added in this release? If yes,
  confirm they route through `get_compiled_truth`, not the legacy
  direct-FHIR MCP tools.
- Any new writes? Confirm they go through the engine's two-phase
  propose/commit with step-up auth.
- Any PHI fields added to new schemas? Confirm redaction paths in
  `mcp-server/src/guardrails.ts` and `server/mcp-guardrails.ts` cover
  them.
- Any skills added/changed? Confirm each `skills/<name>/SKILL.md`
  states the `get_compiled_truth` requirement.

## 3. CI/CD health

- Commits from green → green? Count any red runs and their root causes.
- Average CI duration (`gh run list` p50/p95).
- Lockfile regenerated this release? If yes, confirm it was done with
  `npx -y npm@10 install` to stay CI-compatible.
- Coverage movement: aggregate % delta vs. last release. Any new tests?
  Any regressions in covered files?
- Flaky tests observed (run locally twice if unsure).

## 4. What went well

Concrete, not vague. "The stash→pull→pop flow in the 2026-04-15 WIP
triage landed cleanly with no conflicts" beats "collaboration was good".

## 5. What went poorly

Equally concrete. Name the surprise, not the symptom. The failure mode
we care about is *things we didn't see coming* — those are the lessons.

## 6. Root causes (if any incidents or prod regressions)

For each incident, answer:
- What happened (user-facing)?
- Why did our tests/CI/review not catch it?
- What invariant was violated?
- What would have caught it earlier?

Prefer 3-Whys over a single "because X" line.

## 7. Process observations

- Commit hygiene: were commits split per logical concern (the repo
  convention — see `feedback_split_commits` memory)?
- PR review latency, if PRs were used.
- Stuck work (stashes, unpushed branches, unmerged feature flags).
- Documentation drift: did CLAUDE.md / SKILL.md / README files stay in
  sync with code changes? If not, fix before closing the retro.

## 8. Lessons → memory

List the non-obvious lessons worth persisting as Claude memory. For
each one, specify:
- **Type**: `user` / `feedback` / `project` / `reference`
- **Filename**: proposed memory file name
- **Why it's not already in CLAUDE.md**: (if it is, skip — don't duplicate)

After the retro is approved, create these memory files and update
`memory/MEMORY.md`.

## 9. Action items

Concrete, owned, dated. Each one should be either:
- Completed before merging this retro (preferred), or
- Tracked as a GitHub issue with a milestone.

| # | Action | Owner | Target | Status |
|---|--------|-------|--------|--------|
| 1 |        |       |        |        |

## 10. Followups from previous retrospective

Close out items from `v<prev>.md` § 9. If still open, decide: do them
now, re-file with a new target date, or drop with a reason.
