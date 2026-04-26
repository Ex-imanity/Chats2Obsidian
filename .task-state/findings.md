# Findings

- 2026-04-26: Browser extensions cannot directly write arbitrary local vault files without additional browser file permissions, File System Access API interaction, or a native host. The first release therefore uses Markdown download and `obsidian://new` import.
- 2026-04-26: Obsidian-friendly Markdown should include YAML properties, tags, source URL, and role sections. This is implemented in `src/markdown.js`.
- 2026-04-26: `obsidian://new` is convenient but may be constrained by URL length for very large conversations. `Download MD` remains the reliable fallback.
- 2026-04-26: ChatGPT DOM selectors may change. `content.js` uses `data-message-author-role` first and falls back to article/turn selectors, but live browser verification should be repeated before release packaging.
