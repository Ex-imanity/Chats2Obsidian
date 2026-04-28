# Architecture

## Components

- `manifest.json`: Chrome/Edge Manifest V3 definition with `activeTab`, `downloads`, `scripting`, and `storage` permissions plus `https://chatgpt.com/*` host permission.
- `content.js`: Runs on ChatGPT pages and extracts normalized conversation data: title, URL, timestamp, and messages. It converts message DOM to Markdown, preserves image tags and fenced code blocks, normalizes code fence language labels, and tightens extracted list spacing.
- `src/markdown.js`: Pure JavaScript converter that builds Obsidian-friendly Markdown, normalizes tags, sanitizes filenames, normalizes split list markers, tightens Markdown list spacing, plans image attachments, rewrites Markdown images as Obsidian embeds, and builds `obsidian://new` / `obsidian://open` URIs with percent encoding. This module is shared by tests and popup UI.
- `popup.html`, `popup.css`, `popup.js`: Extension popup for selected-folder display and chooser, tag preferences, preview, persistent folder-handle Markdown saving, local image attachment download, downloads fallback, and Obsidian open-after-save.
- `background.js`: Initializes default sync storage values on install.
- `test/markdown.test.js`: Node built-in test coverage for converter behavior.
- `test/content.test.js`: Node VM-based regression coverage for content-script DOM-to-Markdown extraction.

## Data Flow

1. User opens a ChatGPT conversation and clicks the extension.
2. `popup.js` asks the active tab's `content.js` for extracted conversation data.
3. `popup.js` passes normalized data and user options to `src/markdown.js`.
4. User chooses either `Save MD...` or `Open in Obsidian`.
5. The user selects the target Obsidian folder with `Choose...`; the folder handle is stored in IndexedDB and its display name is stored in browser sync storage.
6. `Save MD...` reuses the stored folder handle when permission is still granted. Markdown is written to the selected folder root, and image attachments are written under that folder's `assets/` child directory.
7. Image links are rewritten from `![alt](remote-url)` to Obsidian embeds such as `![[assets/note-image-01.png]]` before saving.
8. If directory access is unavailable, `chrome.downloads.download` saves the Markdown and attachments under the selected folder display name.
9. `Save MD...` saves Markdown to the selected folder. `Open in Obsidian` performs the same save, then opens the saved note with `obsidian://open` using the selected folder display name. URI values are encoded with `encodeURIComponent` so spaces become `%20`, not `+`.

## Constraints

- No external dependencies.
- No direct local filesystem writes from the browser extension.
- File writes require an explicit user save picker or browser download prompt.
- Markdown conversion must remain testable outside the browser.
