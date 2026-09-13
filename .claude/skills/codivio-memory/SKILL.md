---
name: codivio-memory
description: Tells Claude when to read and update Codivio's file-based project memory (PROJECT_STATE.md, DECISIONS.md, CHANGELOG.md) instead of reconstructing project history from conversation context. Use at the start of a new session/task and after completing meaningful work. Do not use it as a substitute for checking actual code/tests/Git when verifying something is really true.
---

# Codivio Memory

Project memory lives in files, not in conversation history, so a new session can pick up where the last one left off. This skill is the *operational protocol* for reading/writing those files — it intentionally does not restate `CLAUDE.md`'s content (roles, phases, security rules, etc.), only says when to touch which memory file.

## Read order

1. `PROJECT_STATE.md` — current state (phase/checkpoint, what's implemented, known limitations, next step). Read this first, every time.
2. `DECISIONS.md` — only when a task needs architecture/product-decision context (e.g. "should this be a separate service", "how should this feature relate to monetization").
3. `CHANGELOG.md` — only when historical context is actually needed (e.g. "how did we get here", "was this tried before"). Not needed for most tasks.
4. Actual code/config/tests/Git — whenever verifying that something claimed in memory is still true. **This always wins over stale memory.**

## The override rule

If `PROJECT_STATE.md`/`DECISIONS.md`/`CHANGELOG.md` conflicts with what the code, tests, or Git state actually show:

- Do not silently trust the memory file.
- Do not silently trust the code either without checking — verify.
- Report the conflict to the user.
- Treat actual project state as the source of truth for the current task.
- Update the memory file once the discrepancy is resolved, so it doesn't recur.

## When to update which file

- **`PROJECT_STATE.md`**: after any change that moves a checkpoint forward, changes what's implemented, or changes a known limitation/blocker. This is the file most tasks should touch when they finish.
- **`CHANGELOG.md`**: append one concise entry per completed checkpoint (what was done, result, key change, test status) — mirror the style of existing entries. Never invent a commit hash or date for uncommitted work; say "uncommitted" plainly.
- **`DECISIONS.md`**: only when a *new* durable architectural/product decision was actually made in this task. If nothing new was decided, leave it untouched — do not pad it.
- At a major checkpoint boundary (e.g. a Phase completing, a `codivio-test-gate` 20% milestone), update all three together so they stay consistent with each other.

## What this skill is not

- Not a copy of `CLAUDE.md` — for the actual rules (phases, security, testing gate, etc.), read `CLAUDE.md` directly; it is always loaded regardless.
- Not permission to infer progress that hasn't been verified. Never write a completion status, percentage, or "PASS" into `PROJECT_STATE.md` that wasn't actually checked in this session.
- Not a substitute for the other `codivio-*` skills' own domain knowledge (`codivio-database`, `codivio-admin`, `codivio-ui`, `codivio-test-gate`) — this skill only governs *when to read/write the three memory files*, not what's true about the database, Admin roadmap, or UI patterns.
