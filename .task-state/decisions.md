# Decisions

- 2026-04-26: Use a Manifest V3 browser extension instead of an Obsidian plugin because the browser already has authenticated ChatGPT page access.
- 2026-04-26: Use download plus `obsidian://new` import instead of direct vault writes to avoid native host setup and keep first release simple.
- 2026-04-26: Keep Markdown conversion in `src/markdown.js` as a pure module so it can be tested with Node's built-in test runner.
- 2026-04-26: Store MRS artifacts in `.task-state/` and treat `task_state.md` as the source of truth for future recovery.
- 2026-04-28: Use `window.showSaveFilePicker` as the preferred Markdown save path so users can explicitly choose the Obsidian folder and filename; fall back to `chrome.downloads.download` with `saveAs` for browsers without File System Access API support.
- 2026-04-28: Preserve fenced-code-block whitespace in `src/markdown.js`; only collapse excess blank lines outside code fences.
- 2026-04-28: For very large conversations, fall back from `obsidian://new` import to the Markdown save flow because protocol-handler URI length is not a stable transport for large content.
- 2026-04-28: Build `obsidian://new` URLs with `encodeURIComponent` instead of `URLSearchParams`, because Obsidian preserves `+` characters in protocol-handler content and breaks Markdown if spaces are encoded as `+`.
- 2026-04-28: Normalize split unordered list markers in `src/markdown.js`, converting extracted `-` line plus following text line into valid `- item` Markdown before Obsidian import.
- 2026-04-28: Remove blank lines between consecutive Markdown list items in `src/markdown.js` so Obsidian renders compact lists while preserving paragraph and fenced-code spacing.
- 2026-04-28: Preserve images and code at the DOM extraction layer in `content.js`, because once an export contains empty code fences or omits images, downstream Markdown cleanup cannot reconstruct the lost content.
- 2026-04-28: Save image-containing exports through a local Markdown package flow: write the note and an `assets/` folder, then rewrite image Markdown as Obsidian embeds. Direct `obsidian://new` remains for attachment-free notes only.
- 2026-04-28: For image-containing `Open in Obsidian`, save the package first and then call `obsidian://open` with the configured vault-relative file path. Users must keep the Folder field aligned with the chosen Obsidian directory.
- 2026-04-28: Replace the Folder text input with a directory picker. Store the folder handle in IndexedDB and write notes directly to that selected folder, with images in its `assets/` child directory. Use the selected folder name for Obsidian open paths.
- 2026-04-29: Hide/remove the Vault setting from the main popup. Treat Obsidian Folder as the single user-facing destination; `Save MD...` and `Open in Obsidian` both save there, with `Open in Obsidian` adding a post-save open step.
