# Project Agent Instructions

## MRS Operating Rules (.task-state/)

This project uses `.task-state/` as the Minimum Recovery Set (MRS) for cross-session task recovery. Agents must reconstruct state from these artifacts instead of relying on conversational memory.

### File Authority

- `.task-state/task_state.md` is the source of truth for current task state. Update existing fields in place; do not append dated sections.
- `.task-state/plan.md` contains the task plan and Plan Registry. Register only files under `docs/plans/*.md`.
- `.task-state/snapshot.md` is the latest checkpoint. Overwrite the entire file on each checkpoint; do not append sections.
- `.task-state/progress.md` is append-only chronological execution history.
- `.task-state/decisions.md` is append-only stable decisions.
- `.task-state/findings.md` is append-only research and discoveries.
- `.task-state/architecture.md` captures system architecture for recovery.

### Todo Rules

- `task_state.md` near the top contains the only authoritative `Active Todos` list.
- Completing a todo means removing it from `Active Todos` and adding a one-line entry to `Completed Items`.
- Do not infer todo status from `progress.md`.
- Keep each todo to one line; put detailed context in supporting artifacts.

### Update Rules

- After modifying MRS files, append a timestamped entry to `.task-state/progress.md`.
- Before claiming recovery readiness, run:

```powershell
python C:\Users\Lenovo\.codex\skills\context-resilient-task\scripts\verify_mrs.py .task-state
```

### Recovery Output

At recovery checkpoints, report:

- Goal
- What has been done
- Current artifacts
- Unknown or missing information
- Next required action
- Artifact to be produced or updated
