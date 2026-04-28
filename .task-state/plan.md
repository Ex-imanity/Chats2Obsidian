# MRS Plan

## Goal
Maintain recoverable state for the ChatGPT to Obsidian browser extension project without relying on conversational memory.

## Phase 1: Design Extension Architecture

Status: complete

Evidence: `docs/plans/2026-04-26-chatgpt-to-obsidian-design.md`.

## Phase 2: Implement Extension and Converter

Status: complete

Evidence: `manifest.json`, `content.js`, `popup.js`, `src/markdown.js`.

## Phase 3: Verify Converter and Static Validity

Status: complete

Evidence: `node --test`, `ConvertFrom-Json`, `node --check`.

## Phase 4: Publish Initial Version

Status: complete

Evidence: git commit `33457dd` pushed to `origin/main`.

## Phase 5: Maintain Future Recovery State

Status: complete

Evidence: `.task-state/task_state.md`, `.task-state/snapshot.md`, `.task-state/plan.md`.

## Phase 6: Stability Hardening

Status: complete

Evidence: `popup.js`, `src/markdown.js`, `test/markdown.test.js`, `README.md`.

## Phase 7: Obsidian URI Encoding Fix

Status: complete

Evidence: `src/markdown.js`, `popup.js`, `test/markdown.test.js`, raw imported note inspection.

## Phase 8: Unordered List Normalization

Status: complete

Evidence: `src/markdown.js`, `test/markdown.test.js`, raw imported note inspection.

## Phase 9: Tight List Spacing Normalization

Status: complete

Evidence: `src/markdown.js`, `test/markdown.test.js`, raw imported note inspection.

## Phase 10: DOM Extraction Fidelity Hardening

Status: complete

Evidence: `content.js`, `test/content.test.js`, `tmp/一、目标接口地址不可达（最常见）.md`.

## Phase 11: Local Image Attachment Export

Status: complete

Evidence: `src/markdown.js`, `popup.js`, `test/markdown.test.js`, `README.md`.

## Phase 12: Save-Then-Open Image Export Flow

Status: complete

Evidence: `src/markdown.js`, `popup.js`, `test/markdown.test.js`, `README.md`.

## Phase 13: Persistent Folder Picker Export

Status: complete

Evidence: `popup.html`, `popup.css`, `popup.js`, `src/markdown.js`, `test/markdown.test.js`, `README.md`.

## Phase 14: Single Obsidian Folder Export Model

Status: complete

Evidence: `popup.html`, `popup.js`, `README.md`, `node --test`, `node --check`.

## Phase Summary

| Phase | Status | Evidence |
|------|--------|----------|
| 1. Design extension architecture | completed | docs/plans/2026-04-26-chatgpt-to-obsidian-design.md |
| 2. Implement extension and converter | completed | manifest.json, content.js, popup.js, src/markdown.js |
| 3. Verify converter and static validity | completed | node --test, ConvertFrom-Json, node --check |
| 4. Publish initial version | completed | git commit 33457dd pushed to origin/main |
| 5. Maintain future recovery state | completed | .task-state/task_state.md, .task-state/snapshot.md |
| 6. Stability hardening | completed | popup.js, src/markdown.js, test/markdown.test.js, README.md |
| 7. Obsidian URI encoding fix | completed | src/markdown.js, popup.js, test/markdown.test.js |
| 8. Unordered list normalization | completed | src/markdown.js, test/markdown.test.js |
| 9. Tight list spacing normalization | completed | src/markdown.js, test/markdown.test.js |
| 10. DOM extraction fidelity hardening | completed | content.js, test/content.test.js |
| 11. Local image attachment export | completed | src/markdown.js, popup.js, test/markdown.test.js |
| 12. Save-then-open image export flow | completed | src/markdown.js, popup.js, test/markdown.test.js |
| 13. Persistent folder picker export | completed | popup.html, popup.css, popup.js, src/markdown.js, test/markdown.test.js |
| 14. Single Obsidian Folder export model | completed | popup.html, popup.js, README.md |

## Plan Registry (docs/plans)

| File | Source Skill | Date | Status |
|------|-------------|------|--------|
| docs/plans/2026-04-26-chatgpt-to-obsidian-design.md | brainstorming, obsidian-markdown | 2026-04-26 | completed |
| docs/plans/2026-04-26-chatgpt-to-obsidian.md | writing-plans | 2026-04-26 | completed |

## Verification Commands

```powershell
node --test
Get-Content -Raw -LiteralPath manifest.json | ConvertFrom-Json | Out-Null
node --check src\markdown.js
node --check content.js
node --check popup.js
node --check background.js
python /Users/gaotu/.cc-switch/skills/context-resilient-task/scripts/verify_mrs.py .task-state
```

## Future Work Candidates

- Add live browser smoke testing for ChatGPT extraction.
- Add large-conversation fallback that copies Markdown or downloads when Obsidian URI length is too large.
- Consider an Obsidian companion plugin for direct vault writes.
