# Project Agent Instructions

## Project Purpose

Chats2Obsidian is a local Chrome/Edge extension for exporting the currently open `chatgpt.com` conversation as Obsidian-friendly Markdown. The intended workflow is:

- Read the active ChatGPT conversation from the browser tab.
- Convert the conversation into clean Markdown with Obsidian-compatible YAML properties, tags, source URL, and role sections.
- Add the generated note only to the user's configured Obsidian vault/folder path, either through Markdown download or `obsidian://new` import.
- Keep all conversation processing local; do not send ChatGPT content to external services.

## Required Skills

Agents working in this project must use these skills:

- `using-superpowers`: `/Users/gaotu/.cc-switch/skills/using-superpowers/SKILL.md`
  - Use at the start of every project task before exploration, clarification, edits, or verification.
  - Follow it to decide whether any additional skills apply.
- `context-resilient-task`: `/Users/gaotu/.cc-switch/skills/context-resilient-task/SKILL.md`
  - Use for project recovery, multi-step work, feature work, bug fixes, releases, or any task that should survive context loss.
  - Reconstruct state from `.task-state/` artifacts instead of relying on conversation memory.

## Current Project Shape

- `manifest.json`: Manifest V3 extension definition for Chrome/Edge.
- `content.js`: Extracts title, URL, timestamp, and message turns from `chatgpt.com`.
- `src/markdown.js`: Pure Markdown conversion module shared by the popup and tests.
- `popup.html`, `popup.css`, `popup.js`: Popup UI for vault/folder/tag settings, preview, download, and Obsidian import.
- `background.js`: Extension service worker for install-time defaults.
- `test/markdown.test.js`: Node built-in tests for Markdown conversion, tags, and filename handling.
- `docs/plans/*.md`: Design and implementation plans.
- `.task-state/`: Minimum Recovery Set for cross-session task state.

## Development Rules

- Preserve the local-first privacy model. Do not add network upload or third-party processing of conversation content unless the user explicitly requests it.
- Keep Markdown conversion deterministic and testable in `src/markdown.js`.
- Keep browser-specific APIs in extension files such as `content.js`, `popup.js`, and `background.js`.
- Treat the Obsidian destination as user-controlled configuration. Avoid writing or importing notes outside the configured vault/folder path.
- Prefer small, focused changes that match the current plain JavaScript, no-dependency style.
- Run relevant verification before claiming completion. For converter changes, run `node --test`.

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

```bash
python /Users/gaotu/.cc-switch/skills/context-resilient-task/scripts/verify_mrs.py .task-state
```

### Recovery Output

At recovery checkpoints, report:

- Goal
- What has been done
- Current artifacts
- Unknown or missing information
- Next required action
- Artifact to be produced or updated
