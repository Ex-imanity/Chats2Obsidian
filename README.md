# ChatGPT to Obsidian Markdown

Local Chrome/Edge extension for exporting the current `chatgpt.com` conversation as Obsidian-friendly Markdown.

## Features

- Reads the current conversation from the active tab, including messages loaded while scrolling.
- Supports classic ChatGPT and ChatGPT Work message layouts, including project conversations.
- Ignores hidden cached conversations after sidebar switching and checks the current conversation ID before export.
- Collects virtualized message windows in order using stable message IDs, then restores the original scroll position.
- Retains citation source links without downloading site favicons as chat images.
- Generates Obsidian Flavored Markdown with YAML properties.
- Preserves bold, italic, strikethrough, inline code, links, line breaks, quotes, and horizontal rules.
- Exports tables as Markdown tables and retains ordered/nested list structure.
- Recovers KaTeX formula source for Obsidian math, and retains Mermaid code fences.
- Preserves code indentation, trailing spaces, and blank lines, including nested code-fence examples.
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
2. Click the extension button and wait for the full conversation to be read. The page may briefly scroll and then return to its previous position.
3. Set optional tags.
4. Choose the target Obsidian folder once with `Choose...`.
5. Use `Save MD...` or `Open in Obsidian`.

`Save MD...` writes directly to the selected Obsidian folder when the browser supports File System Access. The folder is remembered, so later exports reuse it without showing the picker unless you click `Choose...` again. Images are saved under that folder's `assets/` directory, and image links are rewritten as `![[assets/...]]`. If the browser does not support folder handles, it falls back to the standard browser download flow.

An image download failure does not prevent the Markdown note from being saved. Successful images become local attachments; failed images keep their original links, and the status reports how many could not be downloaded. Those images still need access to their original source.

`Open in Obsidian` does the same save first, then opens the saved Markdown note through Obsidian. It depends on Obsidian being installed and registered as the handler for `obsidian://` links.

## Markdown Format

Generated notes include:

- YAML properties: `title`, `source`, `created`, `chat_url`, `tags`.
- A source callout linking back to ChatGPT.
- One `## User` or `## Assistant` section per message.

Message headings are shifted two levels deeper (up to `######`) so they stay under their role section. Chinese tags are retained; numeric-only tags are prefixed with `tag-`. Image syntax inside fenced or single-line inline code examples is kept as code, rather than downloaded or replaced by an embed.

Extraction scrolls the conversation locally so earlier and later messages can enter the rendered DOM. It checks that message windows are mounted and overlap, using stable message IDs to retain repeated text. If messages cannot be loaded or identified safely, extraction stops with a refresh instruction instead of treating a partial history as complete. Content the page never makes available cannot be recovered by this extension. Previously exported notes with missing code or messages must be exported again from the original conversation.

## Manual Format Check

After updating the extension, reload it on the browser's extensions page and refresh the ChatGPT tab. Export a conversation containing a table, a nested numbered list, inline code, a quote, a formula, and a code block. In Obsidian, check both source and reading views: table rows should remain separate, list nesting should be intact, and code indentation and blank lines should match the original. Native Obsidian display and current ChatGPT page markup still require this manual check.

If the popup reports no messages, wait for the conversation to finish loading and click `Refresh`. Each refresh installs the current extractor in the tab, so an outdated content script will not keep answering after an extension update. Work code blocks use their own DOM wrappers; their code text and displayed language are retained without copying toolbar labels.

After switching conversations, wait for the new messages to load before exporting. If the conversation changes during extraction, the popup clears the previous preview and asks you to refresh. Hidden cached messages are excluded; messages rendered above or below the viewport remain included.

## Privacy

The extension runs locally in the browser. It does not send conversation content to a server.

## Test

Run:

```bash
node --test
```
