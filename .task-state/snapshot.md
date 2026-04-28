# Snapshot: 2026-04-29 00:04

## Context
The project contains a local Chrome/Edge Manifest V3 extension that exports the current ChatGPT conversation to Obsidian-friendly Markdown. The latest UX goal is to expose only one destination setting: Obsidian Folder.

## Recent Progress
- Removed the visible Vault field from the popup.
- Kept one destination control: `Obsidian Folder` with a remembered directory picker.
- Unified `Save MD...` and `Open in Obsidian`: both save Markdown to the selected folder, and `Open in Obsidian` opens the saved note after saving.
- Updated README to explain the two buttons and the selected folder behavior.

## Current Focus
Single Obsidian Folder export model is implemented. Manual validation should reload the unpacked extension, choose the target Obsidian folder once, then verify both buttons save into that folder and `Open in Obsidian` opens the saved note.

## Blockers
- File System Access exposes the selected directory handle and name, not a full vault-relative path. `obsidian://open` uses the selected folder name, so if Obsidian does not open the expected note, the user should first open the intended vault in Obsidian.

## Files Modified
- `popup.html`
- `popup.js`
- `README.md`
- `.task-state/task_state.md`
- `.task-state/plan.md`
- `.task-state/snapshot.md`
- `.task-state/progress.md`
- `.task-state/findings.md`
- `.task-state/architecture.md`
- `.task-state/decisions.md`

## Next Session Should Know
- `task_state.md` is the source of truth for current status and todos.
- User-facing destination is now only Obsidian Folder.
- `Save MD...` saves Markdown and assets to the selected folder.
- `Open in Obsidian` does the same save, then opens the saved note with `obsidian://open`.
- Reload the unpacked browser extension before testing.
