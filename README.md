# ChatGPT to Obsidian Markdown

Local Chrome/Edge extension for exporting the current `chatgpt.com` conversation as Obsidian-friendly Markdown.

## Features

- Extracts the visible ChatGPT conversation from the active tab.
- Generates Obsidian Flavored Markdown with YAML properties.
- Preserves common code fences from ChatGPT responses.
- Saves a `.md` file to the selected Obsidian folder and remembers that folder for later exports.
- Downloads exported images into a local `assets/` folder and rewrites them as Obsidian embeds.
- Opens the saved Markdown note in Obsidian after writing it to the selected folder.
- Stores the selected folder name and tag preferences; the selected folder handle is kept locally in the browser.

## Install

1. Open Chrome or Edge.
2. Go to `chrome://extensions` or `edge://extensions`.
3. Enable developer mode.
4. Choose "Load unpacked".
5. Select this repository's project folder.

## Use

1. Open a conversation on `https://chatgpt.com/`.
2. Click the extension button.
3. Set optional tags.
4. Choose the target Obsidian folder once with `Choose...`.
5. Use `Save MD...` or `Open in Obsidian`.

`Save MD...` writes directly to the selected Obsidian folder when the browser supports File System Access. The folder is remembered, so later exports reuse it without showing the picker unless you click `Choose...` again. Images are saved under that folder's `assets/` directory, and image links are rewritten as `![[assets/...]]`. If the browser does not support folder handles, it falls back to the standard browser download flow.

`Open in Obsidian` does the same save first, then opens the saved Markdown note through Obsidian. It depends on Obsidian being installed and registered as the handler for `obsidian://` links.

## Markdown Format

Generated notes include:

- YAML properties: `title`, `source`, `created`, `chat_url`, `tags`.
- A source callout linking back to ChatGPT.
- One `## User` or `## Assistant` section per message.

## Privacy

The extension runs locally in the browser. It does not send conversation content to a server.

## Test

Run:

```bash
node --test
```
