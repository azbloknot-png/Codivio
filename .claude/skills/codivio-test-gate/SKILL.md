---
name: codivio-test-gate
description: Picks the minimum sufficient test(s) for a Codivio change by type, and runs a comprehensive milestone audit at each ~20% roadmap checkpoint. Use right after implementing a Codivio change, to decide what to run. Do not use for planning/audit-only tasks that changed no code, and do not re-run a test that already passed for an unrelated change.
---

# Codivio Test Gate

This is operational routing on top of CLAUDE.md §17 (Testing Gate) and §20 (Required Final Report), which already define the fixed commit-time sequence and the PASS/FAIL/SKIPPED/UNKNOWN vocabulary. This skill does not restate those — it answers a narrower question: **for this specific change, which of the available checks are actually worth running, once?**

## Core rule

One appropriate test per topic. Add a second test for the same topic only when the first one failed or gave an ambiguous result. Never re-run a check that already passed for a part of the code this change didn't touch.

## Change type → minimum test

| Change touches | Run | Skip |
|---|---|---|
| CSS only (`src/styles.css`) | `npm run build` (catches invalid CSS/syntax; Vite's CSS pipeline errors loudly) | typecheck (no `.ts`/`.tsx` changed), full grep audit if a prior one already confirmed class coverage |
| Registry/data arrays (e.g. `tools[]`, flags like `featured`/`popular`/`qr`/`pdf`) | targeted grep/count check (e.g. `grep -c "flag: true,"` against the expected count) + `npm run typecheck` | full rebuild unless the shape of `Tool` changed |
| React component logic/JSX | `npm run typecheck` + `npm run build` + one targeted structural grep (refs/handlers/classNames wired correctly) | repeating the same grep for unrelated components |
| Worker / D1 code (`worker/`, `wrangler.jsonc`) | `npm run build` + a `wrangler dev` boot attempt | expecting a live boot to succeed on this machine — `workerd` is known to crash here (access violation, native runtime, not a config bug); if it crashes again, don't re-diagnose from scratch, just confirm bindings resolved before the crash and report boot as environment-limited, not FAIL |
| A migration file under `migrations/` | confirm the migration is syntactically valid SQL and mirrors intent (structural review); do not run `wrangler d1 migrations apply` unless the task explicitly asks for it | applying against a real D1 instance when only the file structure was requested |
| Security-sensitive change (auth, secrets, input handling, headers) | invoke the built-in `security-review` skill on the diff | writing a bespoke Codivio-only security checklist — CLAUDE.md §9 plus that skill already cover this; don't duplicate it here |
| Pure documentation (CLAUDE.md, skills, memory files) | none of the above — verify the file(s) parse/render and, if claimed, that referenced code/paths still exist | any application test |

## ~20% roadmap milestone audit

CLAUDE.md §4 lists 15 phases; each completed phase is roughly 1/15 ≈ 6.7% of the roadmap, so a "20% milestone" lands around the completion of every ~3 phases. **Do not hardcode a current percentage here** — read it from `PROJECT_STATE.md` once the Memory System exists; until then, ask or infer from what's actually been completed.

At each such milestone, run one comprehensive audit covering all of:

- application (does the built app actually work end to end)
- database (schema/migration consistency — pair with `codivio-database`)
- security (invoke `security-review`)
- UI/responsive, where applicable (pair with `codivio-ui`)
- tests (existing suite still passes)
- build (production build succeeds)
- regression (prior phases/checkpoints still work — compare build output hashes where possible, as done for Phase 1 after the Worker checkpoint)
- Git diff (scope matches what was actually asked)
- secrets (none introduced)
- dependencies (none added without justification, or none at all)
- production readiness, where applicable to that milestone

**Do not advance to the next major milestone without a PASS on this audit.** A DEGRADED result must be reported with the specific gaps, not silently upgraded to PASS.
