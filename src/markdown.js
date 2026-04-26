(function (root, factory) {
  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  root.ChatGPTObsidianMarkdown = api;
})(typeof globalThis !== "undefined" ? globalThis : window, function () {
  const DEFAULT_TAGS = ["ai/chatgpt"];

  function buildMarkdown(input) {
    const conversation = input || {};
    const title = cleanText(conversation.title) || "ChatGPT Conversation";
    const createdAt = conversation.createdAt || new Date().toISOString();
    const tags = normalizeTags(conversation.tags || DEFAULT_TAGS);
    const messages = (conversation.messages || [])
      .map((message) => ({
        role: normalizeRole(message.role),
        text: cleanText(message.text),
      }))
      .filter((message) => message.text.length > 0);

    const lines = [
      "---",
      `title: ${yamlString(title)}`,
      "source: chatgpt",
      `created: ${yamlString(createdAt)}`,
    ];

    if (conversation.url) {
      lines.push(`chat_url: ${yamlString(conversation.url)}`);
    }

    lines.push("tags:");
    tags.forEach((tag) => lines.push(`  - ${tag}`));
    lines.push("---", "", `# ${title}`, "");

    if (conversation.url) {
      lines.push(
        "> [!info] Source",
        `> Exported from [ChatGPT](${conversation.url}).`,
        ""
      );
    }

    messages.forEach((message) => {
      lines.push(`## ${message.role}`, "", message.text, "");
    });

    return `${lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd()}\n`;
  }

  function sanitizeFileName(name) {
    const base = cleanText(name)
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "")
      .replace(/\s+/g, " ")
      .trim();
    const withExtension = base || "chatgpt-conversation.md";
    const markdownName = /\.md$/i.test(withExtension)
      ? withExtension
      : `${withExtension}.md`;

    if (markdownName.length <= 96) {
      return markdownName;
    }

    const extension = ".md";
    return `${markdownName.slice(0, 96 - extension.length).trim()}${extension}`;
  }

  function normalizeTags(tags) {
    const normalized = (tags || [])
      .map((tag) => String(tag || "").trim().replace(/^#/, ""))
      .map((tag) =>
        tag
          .replace(/\s+/g, "-")
          .replace(/[^A-Za-z0-9/_-]/g, "-")
          .replace(/-+/g, "-")
          .replace(/^[-/]+|[-/]+$/g, "")
      )
      .filter(Boolean);

    return normalized.length > 0 ? Array.from(new Set(normalized)) : DEFAULT_TAGS;
  }

  function normalizeRole(role) {
    const value = String(role || "").toLowerCase();
    if (value === "user") return "User";
    if (value === "assistant") return "Assistant";
    if (value === "system") return "System";
    return "Note";
  }

  function yamlString(value) {
    return `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }

  function cleanText(value) {
    return String(value || "")
      .replace(/\r\n/g, "\n")
      .replace(/\u00a0/g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .trim();
  }

  return {
    buildMarkdown,
    sanitizeFileName,
    normalizeTags,
  };
});
