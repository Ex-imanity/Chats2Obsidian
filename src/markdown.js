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
        text: normalizeMessageMarkdown(cleanText(message.text)),
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

    return `${collapseExcessBlankLinesOutsideCode(lines.join("\n")).trimEnd()}\n`;
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

  function createAttachmentPlan(options) {
    const values = options || {};
    const markdown = String(values.markdown || "");
    const attachmentsFolder = normalizeAttachmentFolder(values.attachmentsFolder || "assets");
    const noteBaseName = sanitizeAttachmentBase(values.noteFileName || "chatgpt-conversation.md");
    const plan = [];
    const pattern = /!\[([^\]]*)\]\(([^)\s]+)\)/g;
    let match;

    while ((match = pattern.exec(markdown)) !== null) {
      const sourceUrl = match[2];
      if (!isDownloadableImageSource(sourceUrl)) {
        continue;
      }

      const index = plan.length + 1;
      const extension = imageExtensionFromSource(sourceUrl);
      const fileName = `${noteBaseName}-image-${String(index).padStart(2, "0")}${extension}`;
      const relativePath = attachmentsFolder ? `${attachmentsFolder}/${fileName}` : fileName;

      plan.push({
        alt: match[1],
        markdown: match[0],
        sourceUrl,
        fileName,
        relativePath,
      });
    }

    return plan;
  }

  function replaceMarkdownImagesWithEmbeds(markdown, attachmentPlan) {
    return (attachmentPlan || []).reduce(
      (output, item) => output.replace(item.markdown, `![[${item.relativePath}]]`),
      String(markdown || "")
    );
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

  function buildObsidianNewUri(options) {
    const values = options || {};
    const params = [
      ["name", values.name],
      ["content", values.content],
      ["vault", values.vault],
    ]
      .filter(([, value]) => cleanText(value).length > 0)
      .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`);

    return `obsidian://new?${params.join("&")}`;
  }

  function buildObsidianOpenUri(options) {
    const values = options || {};
    const params = [
      ["vault", values.vault],
      ["file", values.file],
    ]
      .filter(([, value]) => cleanText(value).length > 0)
      .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`);

    return `obsidian://open?${params.join("&")}`;
  }

  function buildVaultFilePath(options) {
    const values = options || {};
    const folderName = normalizeAttachmentFolder(values.folderName || "");
    const fileName = cleanText(values.fileName || "");
    return folderName ? `${folderName}/${fileName}` : fileName;
  }

  function normalizeAttachmentFolder(value) {
    return String(value || "")
      .replace(/\\/g, "/")
      .replace(/^\/+|\/+$/g, "")
      .replace(/\/+/g, "/")
      .trim();
  }

  function sanitizeAttachmentBase(value) {
    return sanitizeFileName(value)
      .replace(/\.md$/i, "")
      .replace(/[\[\]#^|]/g, "")
      .trim() || "chatgpt-conversation";
  }

  function isDownloadableImageSource(value) {
    const source = String(value || "").trim();
    if (!source) return false;
    if (/^data:image\//i.test(source)) return true;
    if (/^blob:/i.test(source)) return true;
    return /^https?:\/\//i.test(source);
  }

  function imageExtensionFromSource(value) {
    const source = String(value || "");
    const dataMatch = source.match(/^data:image\/([A-Za-z0-9.+-]+)[;,]/);
    if (dataMatch) {
      return extensionFromImageType(dataMatch[1]);
    }

    try {
      const url = new URL(source);
      const path = url.pathname.toLowerCase();
      const pathMatch = path.match(/\.([a-z0-9]+)$/);
      if (pathMatch) {
        return extensionFromImageType(pathMatch[1]);
      }
    } catch (_error) {
      return ".png";
    }

    return ".png";
  }

  function extensionFromImageType(value) {
    const normalized = String(value || "").toLowerCase().replace(/^image\//, "");
    const aliases = {
      jpeg: ".jpg",
      jpg: ".jpg",
      png: ".png",
      gif: ".gif",
      webp: ".webp",
      svg: ".svg",
      "svg+xml": ".svg",
      bmp: ".bmp",
      avif: ".avif",
    };

    return aliases[normalized] || ".png";
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

  function normalizeMessageMarkdown(markdown) {
    return normalizeTightListSpacing(normalizeSplitListItems(markdown));
  }

  function normalizeSplitListItems(markdown) {
    const lines = String(markdown || "").split("\n");
    const normalized = [];
    let insideFence = false;

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      if (isFenceLine(line)) {
        insideFence = !insideFence;
        normalized.push(line);
        continue;
      }

      const markerMatch = line.match(/^(\s*)([-*+]|\d+[.)])\s*$/);
      const nextLine = lines[index + 1];

      if (!insideFence && markerMatch && nextLine && nextLine.trim().length > 0) {
        normalized.push(`${markerMatch[1]}${markerMatch[2]} ${nextLine.trimStart()}`);
        index += 1;
        continue;
      }

      normalized.push(line);
    }

    return normalized.join("\n");
  }

  function normalizeTightListSpacing(markdown) {
    const lines = String(markdown || "").split("\n");
    const normalized = [];
    let insideFence = false;

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      if (isFenceLine(line)) {
        insideFence = !insideFence;
        normalized.push(line);
        continue;
      }

      if (
        !insideFence &&
        line.trim() === "" &&
        isListItem(lines[index - 1]) &&
        isListItem(lines[index + 1])
      ) {
        continue;
      }

      normalized.push(line);
    }

    return normalized.join("\n");
  }

  function isListItem(line) {
    return /^(\s*)(?:[-*+]|\d+[.)])\s+\S/.test(String(line || ""));
  }

  function isFenceLine(line) {
    return /^```/.test(String(line || "").trim());
  }

  function collapseExcessBlankLinesOutsideCode(markdown) {
    const lines = String(markdown || "").split("\n");
    const collapsed = [];
    let insideFence = false;
    let blankLines = 0;

    lines.forEach((line) => {
      if (isFenceLine(line)) {
        insideFence = !insideFence;
        blankLines = 0;
        collapsed.push(line);
        return;
      }

      if (insideFence) {
        collapsed.push(line);
        return;
      }

      if (line.trim() === "") {
        blankLines += 1;
        if (blankLines <= 1) {
          collapsed.push(line);
        }
        return;
      }

      blankLines = 0;
      collapsed.push(line);
    });

    return collapsed.join("\n");
  }

  return {
    buildObsidianOpenUri,
    buildObsidianNewUri,
    buildVaultFilePath,
    buildMarkdown,
    createAttachmentPlan,
    replaceMarkdownImagesWithEmbeds,
    sanitizeFileName,
    normalizeTags,
  };
});
