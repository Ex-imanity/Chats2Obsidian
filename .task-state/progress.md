# Progress Log

- 2026-04-26T22:42+08:00 Created design and implementation plan documents under `docs/plans/`.
- 2026-04-26T22:43+08:00 Added failing Node tests for the Markdown converter.
- 2026-04-26T22:45+08:00 Implemented converter, extension manifest, content script, popup UI, background defaults, and README.
- 2026-04-26T22:46+08:00 Added script injection fallback for already-open ChatGPT tabs and preserved existing sync storage defaults.
- 2026-04-26T22:47+08:00 Verified `node --test`: 4 tests passed, 0 failed.
- 2026-04-26T22:47+08:00 Verified `manifest.json` parses with PowerShell `ConvertFrom-Json`.
- 2026-04-26T22:47+08:00 Verified JavaScript syntax with `node --check` for `src/markdown.js`, `content.js`, `popup.js`, and `background.js`.
- 2026-04-26T23:01+08:00 Confirmed local branch `main` tracks `origin/main` after push.
- 2026-04-26T23:01+08:00 Confirmed latest commit `33457dd Add ChatGPT to Obsidian export extension` exists on `HEAD -> main, origin/main`.
- 2026-04-26T23:05:21+08:00 Initialized MRS files under `.task-state/` and added root `AGENTS.md` MRS instructions.
- 2026-04-26T23:08+08:00 Fixed MRS verifier formatting requirements for `plan.md` phase headers and `snapshot.md` timestamp header.
- 2026-04-26T23:10+08:00 Verified MRS with `python C:\Users\Lenovo\.codex\skills\context-resilient-task\scripts\verify_mrs.py .task-state`; Tier 0 and Tier 1 present, MRS valid.

- 2026-04-28T21:36:21+08:00 Reopened MRS task for stability hardening: Markdown fidelity, user-chosen save location, README path cleanup, and verification.

- 2026-04-28T21:37:01+08:00 Added Markdown fidelity regression test and confirmed red state: `node --test` failed because fenced code block triple blank lines were compressed.

- 2026-04-28T21:40:00+08:00 Implemented stability fixes: Markdown code-block blank line preservation, user-chosen Markdown save location with downloads fallback, large Obsidian URI fallback to save, README path cleanup, and current macOS MRS verifier command in plan.md.

- 2026-04-28T21:42:00+08:00 Updated MRS architecture, decisions, findings, plan, task_state, and snapshot for completed stability hardening.

- 2026-04-28T21:43:00+08:00 Verified stability hardening: `node --test` passed 5/5; JavaScript syntax checks passed; manifest and popup references exist; MRS verifier reported valid; old absolute README/MRS command paths absent from mutable docs.

- 2026-04-28T21:54:40+08:00 Investigated Obsidian Markdown parse issue. Located imported note in `/Users/gaotu/Documents/Obsidian/ChatGPT/AIChatGPT/`; raw file contains literal `+` characters in YAML, headings, callouts, and text. Reproduced that `URLSearchParams` emits `+` for spaces in `obsidian://new` query values.

- 2026-04-28T21:55:30+08:00 Added Obsidian URI encoding regression test and confirmed red state: `buildObsidianNewUri` is missing, so URL construction is not yet protected by tests.

- 2026-04-28T21:58:00+08:00 Fixed Obsidian URI encoding bug: added `buildObsidianNewUri` using `encodeURIComponent`, updated popup import path, and verified test URI contains `
- 2026-04-28T21:58:00+08:00 Fixed Obsidian URI encoding bug: added `buildObsidianNewUri` using `encodeURIComponent`, updated popup import path, and verified test URI contains percent-encoded spaces with no plus signs.
- 2026-04-28T21:59:00+08:00 Verified Obsidian URI encoding fix: `node --test` passed 6/6, JavaScript syntax checks passed, generated URI contains encoded spaces and no plus signs, and MRS verifier reported valid.

- 2026-04-28T22:10:31+08:00 Investigated unordered list parse issue from Obsidian file link. Raw note contains standalone `-` lines followed by item text, which is invalid list syntax for Obsidian Markdown.

- 2026-04-28T22:11:33+08:00 Added split unordered list regression test and confirmed red state: `node --test` failed because output preserved `-` on its own line before item text.

- 2026-04-28T22:13:30+08:00 Fixed unordered list normalization: split `-` marker lines are converted into valid `- item` Markdown; updated MRS artifacts for completed Phase 8.
- 2026-04-28T22:14:30+08:00 Verified unordered list normalization: `node --test` passed 7/7, JavaScript syntax checks passed, split-list probe passed, and MRS verifier reported valid.

- 2026-04-28T22:24:30+08:00 Tried Playwright headed browser validation. New Playwright Chrome reached ChatGPT login/auth error without user login state; attaching to existing Chrome failed because remote debugging is not enabled; direct `obsidian://new` navigation returned Chrome `ERR_ABORTED` and did not create a vault file because external protocol confirmation is browser UI outside Playwright page control.

- 2026-04-28T22:33:25+08:00 Investigated extra Markdown spacing in Obsidian. Raw imported note has blank lines between consecutive unordered list items, causing Obsidian to render loose lists with large vertical spacing.

- 2026-04-28T22:34:56+08:00 Added tight-list spacing regression test and confirmed red state: `node --test` failed because blank lines remain between consecutive unordered list items.
- 2026-04-28T22:37:00+08:00 Fixed tight Markdown list spacing: blank lines between consecutive list items are removed outside fenced code blocks, with regression coverage for unordered and ordered lists.
- 2026-04-28T22:38:00+08:00 Updated MRS architecture and findings to record that tight spacing normalization applies to Markdown list items generally, not only unordered lists.
- 2026-04-28T22:46:00+08:00 Investigated `tmp/一、目标接口地址不可达（最常见）.md`; found empty code fences, missing image syntax, and list spacing still loose in the exported file.
- 2026-04-28T22:48:00+08:00 Added failing content-script DOM extraction tests for images, fenced code content, code language labels, and tight list spacing.
- 2026-04-28T22:51:00+08:00 Hardened `content.js` DOM extraction: images now emit Markdown image syntax, code blocks use textContent fallback and language inference, and extracted list spacing is tightened.
- 2026-04-28T22:52:00+08:00 Updated MRS artifacts for Phase 10 DOM extraction fidelity hardening.
- 2026-04-28T22:53:00+08:00 Verified Phase 10: `node --test` passed 11/11, JavaScript syntax checks passed, combined Markdown probe passed, and MRS verifier reported valid.
- 2026-04-28T23:06:00+08:00 Added failing tests for Markdown image attachment planning and Obsidian embed rewriting.
- 2026-04-28T23:08:00+08:00 Implemented `createAttachmentPlan` and `replaceMarkdownImagesWithEmbeds` in `src/markdown.js`; tests passed for stable `assets/` names and `![[...]]` embeds.
- 2026-04-28T23:11:00+08:00 Updated `popup.js` save flow to fetch image blobs with credentials, save Markdown plus attachments via directory picker when available, and fall back to browser downloads.
- 2026-04-28T23:13:00+08:00 Updated README and MRS artifacts for Phase 11 local image attachment export.
- 2026-04-28T23:14:00+08:00 Verified Phase 11: `node --test` passed 13/13, JavaScript syntax checks passed, attachment embed probe passed, and MRS verifier reported valid.
- 2026-04-28T23:19:00+08:00 Investigated image-containing `Open in Obsidian` behavior. Root cause: the flow correctly required a folder picker for attachments but returned after saving without opening the saved note.
- 2026-04-28T23:21:00+08:00 Added `buildObsidianOpenUri` regression coverage and implemented helper with percent encoding.
- 2026-04-28T23:22:00+08:00 Updated `popup.js` so image-containing `Open in Obsidian` saves Markdown/assets, then opens the configured vault file via `obsidian://open`.
- 2026-04-28T23:23:00+08:00 Updated README and MRS artifacts for Phase 12 save-then-open image export flow.
- 2026-04-28T23:24:00+08:00 Verified Phase 12: `node --test` passed 14/14, JavaScript syntax checks passed, `obsidian://open` probe passed, and MRS verifier reported valid.
- 2026-04-28T23:32:00+08:00 Added `buildVaultFilePath` regression coverage for deriving Obsidian open paths from the selected folder display name.
- 2026-04-28T23:35:00+08:00 Replaced the Folder text input with a folder chooser display and implemented IndexedDB persistence for the selected directory handle.
- 2026-04-28T23:37:00+08:00 Updated save flow to reuse the stored folder handle, write Markdown to the selected folder root, and write image attachments to the selected folder's `assets/` directory.
- 2026-04-28T23:38:00+08:00 Updated README and MRS artifacts for Phase 13 persistent folder picker export.
- 2026-04-28T23:39:00+08:00 Verified Phase 13: `node --test` passed 15/15, JavaScript syntax checks passed, old folder input references are absent, and MRS verifier reported valid.
- 2026-04-29T00:02:00+08:00 Removed visible Vault setting from popup UI and dropped Vault storage/use from popup flow.
- 2026-04-29T00:03:00+08:00 Unified `Open in Obsidian` to always save the Markdown package to the selected Obsidian Folder before opening the saved note.
- 2026-04-29T00:04:00+08:00 Updated README and MRS artifacts for Phase 14 single Obsidian Folder export model.
- 2026-04-29T00:05:00+08:00 Verified Phase 14: `node --test` passed 15/15, JavaScript syntax checks passed, popup/README visible Vault references are absent, and MRS verifier reported valid.
