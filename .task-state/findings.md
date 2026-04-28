# Findings

- 2026-04-26: Browser extensions cannot directly write arbitrary local vault files without additional browser file permissions, File System Access API interaction, or a native host. The first release therefore uses Markdown download and `obsidian://new` import.
- 2026-04-26: Obsidian-friendly Markdown should include YAML properties, tags, source URL, and role sections. This is implemented in `src/markdown.js`.
- 2026-04-26: `obsidian://new` is convenient but may be constrained by URL length for very large conversations. `Download MD` remains the reliable fallback.
- 2026-04-26: ChatGPT DOM selectors may change. `content.js` uses `data-message-author-role` first and falls back to article/turn selectors, but live browser verification should be repeated before release packaging.
- 2026-04-28: `chrome.downloads.download` cannot silently save to an arbitrary absolute Obsidian vault path. Stable user-selected saving requires either a save picker or browser download prompt.
- 2026-04-28: The previous Markdown join logic collapsed repeated blank lines globally, including inside fenced code blocks. Regression coverage now protects code-block blank-line preservation.
- 2026-04-28: Obsidian note `/Users/gaotu/Documents/Obsidian/ChatGPT/AIChatGPT/一、Karpathy+这个+llm-wiki+到底在讲什么？.md` contains literal `+` characters in frontmatter, headings, callouts, and prose. This confirms the Markdown was written incorrectly before rendering.
- 2026-04-28: `URLSearchParams` encodes spaces as `+` in query values. Obsidian's `obsidian://new` handler preserved those `+` characters instead of decoding them as spaces, breaking Obsidian Markdown syntax.
- 2026-04-28: The same imported note contains unordered list markers as standalone lines (`-`) followed by item text on the next line. Obsidian does not treat that shape as a list item; valid Markdown requires `- item text` on one line.
- 2026-04-28: Imported note `/Users/gaotu/Documents/Obsidian/ChatGPT/AIChatGPT/一、核心结论（先给你一句话版本） 1.md` contains blank lines between consecutive `- item` lines. Obsidian renders that as a loose list with large vertical spacing.
- 2026-04-28: The same loose-list rendering rule applies to ordered Markdown list items, so tight spacing normalization should treat unordered and ordered list items consistently outside fenced code blocks.
- 2026-04-28: Exported sample `tmp/一、目标接口地址不可达（最常见）.md` contains empty code fences and no Markdown image syntax. Root cause is `content.js` DOM extraction: image tags were ignored, code blocks relied on unstable `innerText`, and language labels such as `JavaScript` could be emitted as code body instead of fence info.
- 2026-04-28: ChatGPT image previews can be nested inside buttons, so content extraction must not skip a button subtree when it contains an image.
- 2026-04-28: Obsidian cannot reliably render authenticated ChatGPT remote image URLs after export. Stable image rendering requires downloading the image to the vault and rewriting the Markdown to an Obsidian embed.
- 2026-04-28: `obsidian://new` cannot transport local attachments, so image-containing exports must use the Markdown save flow rather than direct Obsidian URI import.
- 2026-04-28: The image-containing `Open in Obsidian` flow previously stopped after showing the directory picker and saving files. It needs a follow-up `obsidian://open` call to open the saved note, using the configured `Vault` and `Folder` values because the File System Access picker does not expose a vault-relative path.
- 2026-04-28: Repeated folder prompts are avoidable by storing the selected `FileSystemDirectoryHandle` in IndexedDB and reusing it after permission verification. The File System Access API still only exposes the selected directory name, not a full vault-relative path.
- 2026-04-29: User confusion came from exposing both Vault and Folder while only Folder controls the physical save location. Simplifying the popup to a single Obsidian Folder setting matches the actual save behavior.
