# Task State

**Last Updated:** 2026-04-29T00:04:00+08:00
**Updated By:** Codex

## Goal
Simplify export UI to a single Obsidian Folder setting and make both save actions write Markdown to that folder.

## Status
completed

## Active Todos
_None._

## Current Phase
Phase 14: Single Obsidian Folder export model complete

## Next Action
Reload the browser extension, choose the target Obsidian folder once, then use `Save MD...` or `Open in Obsidian`; both save Markdown to the selected folder and the latter opens Obsidian.

## Completed Items
- [x] Designed extension approach: content script extraction, pure Markdown converter, popup export UI, download fallback, and Obsidian URI import (completed: 2026-04-26, source: docs/plans/2026-04-26-chatgpt-to-obsidian-design.md)
- [x] Implemented Manifest V3 extension files and conversion module (completed: 2026-04-26, source: src/markdown.js, manifest.json, content.js, popup.js)
- [x] Added Node tests for Markdown conversion, tag normalization, and filename sanitization (completed: 2026-04-26, source: test/markdown.test.js)
- [x] Verified tests, JSON validity, and JavaScript syntax checks (completed: 2026-04-26, source: progress.md)
- [x] Pushed commit 33457dd to origin/main at https://github.com/Ex-imanity/Chats2Obsidian.git (completed: 2026-04-26, source: git log)
- [x] Initialized MRS artifacts under .task-state/ (completed: 2026-04-26, source: user request)
- [x] Verified MRS health with context-resilient-task verifier (completed: 2026-04-26, source: progress.md)
- [x] Added Markdown fidelity regression coverage for fenced code block blank lines (completed: 2026-04-28, source: test/markdown.test.js)
- [x] Implemented user-chosen Markdown save location with File System Access API and downloads fallback (completed: 2026-04-28, source: popup.js)
- [x] Added large `obsidian://new` fallback to Markdown save flow (completed: 2026-04-28, source: popup.js)
- [x] Updated README install/use docs without absolute local paths (completed: 2026-04-28, source: README.md)
- [x] Diagnosed Obsidian `+` Markdown parsing issue as `URLSearchParams` encoding in `obsidian://new` import (completed: 2026-04-28, source: findings.md)
- [x] Added regression coverage for Obsidian URI percent encoding without `+` spaces (completed: 2026-04-28, source: test/markdown.test.js)
- [x] Replaced popup Obsidian URI construction with `buildObsidianNewUri` using `encodeURIComponent` (completed: 2026-04-28, source: src/markdown.js, popup.js)
- [x] Diagnosed unordered list parse issue as split list markers (`-` on one line, item text on the next) in exported Markdown (completed: 2026-04-28, source: findings.md)
- [x] Added regression coverage for split unordered list markers (completed: 2026-04-28, source: test/markdown.test.js)
- [x] Normalized split unordered list markers into valid `- item` Markdown during conversion (completed: 2026-04-28, source: src/markdown.js)
- [x] Diagnosed extra Obsidian list spacing as blank lines between consecutive unordered list items (completed: 2026-04-28, source: findings.md)
- [x] Added regression coverage for tight list spacing (completed: 2026-04-28, source: test/markdown.test.js)
- [x] Removed blank lines between consecutive Markdown list items while preserving paragraph and code-block spacing (completed: 2026-04-28, source: src/markdown.js)
- [x] Diagnosed `tmp/一、目标接口地址不可达（最常见）.md` image/code/list issues as DOM extraction fidelity problems (completed: 2026-04-28, source: findings.md)
- [x] Added content-script DOM extraction regression tests for images, code fences, language labels, and list spacing (completed: 2026-04-28, source: test/content.test.js)
- [x] Hardened `content.js` to emit Markdown image syntax, preserve code text, normalize code fence language, and tighten extracted list spacing (completed: 2026-04-28, source: content.js)
- [x] Added Markdown image attachment planning and Obsidian embed rewrite helpers (completed: 2026-04-28, source: src/markdown.js, test/markdown.test.js)
- [x] Updated popup save flow to download image attachments and write Markdown plus `assets/` together when possible (completed: 2026-04-28, source: popup.js)
- [x] Updated README with local image attachment export behavior (completed: 2026-04-28, source: README.md)
- [x] Diagnosed image-containing `Open in Obsidian` as saving attachments without a follow-up `obsidian://open` call (completed: 2026-04-28, source: findings.md)
- [x] Added `buildObsidianOpenUri` coverage for opening existing notes without `+` encoding (completed: 2026-04-28, source: test/markdown.test.js)
- [x] Updated image-containing open flow to save Markdown/assets, then open the configured Obsidian vault file (completed: 2026-04-28, source: popup.js)
- [x] Replaced Folder text input with a folder chooser UI (completed: 2026-04-28, source: popup.html, popup.css)
- [x] Persisted the selected folder handle in IndexedDB and reused it for later saves (completed: 2026-04-28, source: popup.js)
- [x] Updated save flow so Markdown writes to the selected folder and image attachments write to its `assets/` child directory (completed: 2026-04-28, source: popup.js)
- [x] Added `buildVaultFilePath` coverage for opening notes from the selected folder display name (completed: 2026-04-28, source: src/markdown.js, test/markdown.test.js)
- [x] Removed visible Vault setting from the popup (completed: 2026-04-29, source: popup.html, popup.js)
- [x] Unified `Save MD...` and `Open in Obsidian` so both save Markdown to the selected Obsidian Folder (completed: 2026-04-29, source: popup.js)
- [x] Updated README to explain the single-folder model and button behavior (completed: 2026-04-29, source: README.md)

## Open Questions
- Whether future releases should persist a chosen directory handle for one-click repeated vault saves.
- Whether extraction should be hardened with Playwright/manual browser checks against live ChatGPT DOM changes.

## Artifacts
- .task-state/task_state.md (updated 2026-04-29T00:04:00+08:00)
- .task-state/plan.md (updated 2026-04-29T00:04:00+08:00)
- .task-state/snapshot.md (updated 2026-04-29T00:04:00+08:00)
- .task-state/progress.md (updated 2026-04-29T00:04:00+08:00)
- .task-state/findings.md (updated 2026-04-29T00:04:00+08:00)
- .task-state/architecture.md (updated 2026-04-29T00:04:00+08:00)
- .task-state/decisions.md (updated 2026-04-29T00:04:00+08:00)
- .task-state/blockers.md (updated 2026-04-26T23:10:00+08:00)

## Project Context
Project root: /Users/gaotu/Projects/Chats2Obsidian. Remote: https://github.com/Ex-imanity/Chats2Obsidian.git. Root AGENTS.md contains MRS operating rules and required skill instructions for future agent compatibility.
