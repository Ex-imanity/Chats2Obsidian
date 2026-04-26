# ChatGPT to Obsidian Extension Design

## Goal

Build a local Chrome/Edge Manifest V3 extension that exports the currently open ChatGPT conversation as Obsidian-friendly Markdown.

## Recommended Approach

Use a content script to read visible ChatGPT conversation turns from `chatgpt.com`, a shared Markdown converter module for deterministic formatting, and a popup UI for export actions. The popup asks the active tab for the conversation, renders/downloads Markdown, and can open an `obsidian://new` URI for direct import.

## Alternatives Considered

1. Native file writing into a vault.
   This needs browser file-system permissions or a native host, which is too much setup for a first version.

2. Browser extension plus Obsidian URI.
   This is the chosen approach. It keeps installation simple and works without extra local daemons.

3. Obsidian plugin pulling from ChatGPT.
   This would fit vault workflows but cannot reliably access authenticated ChatGPT browser state.

## Architecture

- `content.js` runs on `https://chatgpt.com/*`, extracts title, URL, and message turns.
- `src/markdown.js` converts normalized conversation data to Obsidian Flavored Markdown.
- `popup.js` requests extracted data, lets the user configure vault/folder/tags, and triggers download or Obsidian import.
- `background.js` provides a simple action click fallback that opens the popup.

## Markdown Shape

Each note starts with YAML properties:

```yaml
---
title: Example
source: chatgpt
chat_url: https://chatgpt.com/c/...
created: 2026-04-26
tags:
  - ai/chatgpt
---
```

The body uses clear sections per turn:

```markdown
# Example

> [!info] Source
> Exported from ChatGPT.

## User

...

## Assistant

...
```

## Error Handling

- If the active tab is not ChatGPT, show a popup error.
- If no messages are found, show a popup error.
- If Obsidian URI opening fails, the downloaded Markdown remains the fallback path.

## Testing

Use Node's built-in test runner for pure conversion behavior. Manual browser testing covers extension loading, extraction, download, and Obsidian URI open.
