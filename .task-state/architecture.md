# Architecture

## Components

- `manifest.json`: Chrome/Edge Manifest V3 definition with `activeTab`, `downloads`, `scripting`, and `storage` permissions plus `https://chatgpt.com/*` host permission.
- `content.js`: Runs on ChatGPT pages and extracts normalized conversation data: title, URL, timestamp, and messages.
- `src/markdown.js`: Pure JavaScript converter that builds Obsidian-friendly Markdown, normalizes tags, and sanitizes filenames. This module is shared by tests and popup UI.
- `popup.html`, `popup.css`, `popup.js`: Extension popup for vault/folder/tag preferences, preview, Markdown download, and Obsidian URI import.
- `background.js`: Initializes default sync storage values on install.
- `test/markdown.test.js`: Node built-in test coverage for converter behavior.

## Data Flow

1. User opens a ChatGPT conversation and clicks the extension.
2. `popup.js` asks the active tab's `content.js` for extracted conversation data.
3. `popup.js` passes normalized data and user options to `src/markdown.js`.
4. User chooses either `Download MD` or `Open in Obsidian`.
5. Download uses `chrome.downloads.download`; Obsidian import opens `obsidian://new` in a new tab.

## Constraints

- No external dependencies.
- No direct local filesystem writes from the browser extension.
- Markdown conversion must remain testable outside the browser.
