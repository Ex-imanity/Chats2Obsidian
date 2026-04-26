# ChatGPT to Obsidian Markdown

Local Chrome/Edge extension for exporting the current `chatgpt.com` conversation as Obsidian-friendly Markdown.

## Features

- Extracts the visible ChatGPT conversation from the active tab.
- Generates Obsidian Flavored Markdown with YAML properties.
- Preserves common code fences from ChatGPT responses.
- Downloads a `.md` file into an optional folder path.
- Opens an `obsidian://new` URI for direct import into an optional vault.
- Stores vault, folder, and tag preferences in browser sync storage.

## Install

1. Open Chrome or Edge.
2. Go to `chrome://extensions` or `edge://extensions`.
3. Enable developer mode.
4. Choose "Load unpacked".
5. Select this project folder: `D:\dev\Projects\ObsidianScripts`.

## Use

1. Open a conversation on `https://chatgpt.com/`.
2. Click the extension button.
3. Set optional vault, folder, and tags.
4. Use `Download MD` or `Open in Obsidian`.

The Obsidian URI method depends on Obsidian being installed and registered as the handler for `obsidian://` links. If it does not open, use the downloaded Markdown file instead.

## Markdown Format

Generated notes include:

- YAML properties: `title`, `source`, `created`, `chat_url`, `tags`.
- A source callout linking back to ChatGPT.
- One `## User` or `## Assistant` section per message.

## Privacy

The extension runs locally in the browser. It does not send conversation content to a server.

## Test

Run:

```powershell
node --test
```
