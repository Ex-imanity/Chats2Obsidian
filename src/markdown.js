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
    const title = cleanText(conversation.title).replace(/\s+/g, " ") || "ChatGPT Conversation";
    const createdAt = conversation.createdAt || new Date().toISOString();
    const tags = normalizeTags(conversation.tags || DEFAULT_TAGS);
    const messages = (conversation.messages || [])
      .map((message) => ({
        role: normalizeRole(message.role),
        text: normalizeMessageMarkdown(String(message.text || "").replace(/\r\n?/g, "\n").replace(/^\n+|\n+$/g, "")),
      }))
      .filter((message) => message.text.trim().length > 0);

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
    const offsets = [];
    let offset = 0;
    markdown.split("\n").forEach((line) => { offsets.push(offset); offset += line.length + 1; });
    transformOutsideCode(markdown, (line, lineIndex) => {
      const pattern = /!\[((?:\\.|[^\]\\])*)\]\(([^)\s]+)\)/g;
      const searchable = maskInlineCode(line);
      let match;
      while ((match = pattern.exec(searchable)) !== null) {
        const sourceUrl = match[2];
        if (!isDownloadableImageSource(sourceUrl)) continue;
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
          start: offsets[lineIndex] + match.index,
          end: offsets[lineIndex] + match.index + match[0].length,
        });
      }
      return line;
    });

    return plan;
  }

  function maskInlineCode(line) {
    const runs = Array.from(line.matchAll(/`+/g));
    let masked = line;
    for (let i = 0; i < runs.length; i += 1) {
      const open = runs[i];
      if (line[open.index - 1] === "\\") continue;
      const closeIndex = runs.findIndex((run, j) => j > i && run[0].length === open[0].length);
      if (closeIndex < 0) continue;
      const end = runs[closeIndex].index + runs[closeIndex][0].length;
      masked = masked.slice(0, open.index) + " ".repeat(end - open.index) + masked.slice(end);
      i = closeIndex;
    }
    return masked;
  }

  function replaceMarkdownImagesWithEmbeds(markdown, attachmentPlan) {
    let output = String(markdown || "");
    // Replace from the end so saved source offsets remain valid, including when
    // the same image syntax occurs earlier inside a code example.
    [...(attachmentPlan || [])].reverse().forEach((item) => {
      const embed = `![[${item.relativePath}]]`;
      if (Number.isInteger(item.start) && Number.isInteger(item.end)) {
        if (output.slice(item.start, item.end) === item.markdown) {
          output = output.slice(0, item.start) + embed + output.slice(item.end);
        }
      } else output = output.replace(item.markdown, embed);
    });
    return output;
  }

  function normalizeTags(tags) {
    const normalized = (tags || [])
      .map((tag) => String(tag || "").trim().replace(/^#/, ""))
      .map((tag) =>
        tag
          .replace(/\s+/g, "-")
          .replace(/[^\p{L}\p{M}\p{N}/_-]/gu, "-")
          .replace(/-+/g, "-")
          .replace(/^[-/]+|[-/]+$/g, "")
      )
      .filter(Boolean)
      .map((tag) => /^\p{N}+$/u.test(tag) ? `tag-${tag}` : tag);

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
    return JSON.stringify(String(value));
  }

  function cleanText(value) {
    return String(value || "")
      .replace(/\r\n/g, "\n")
      .replace(/\u00a0/g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .trim();
  }

  // A closing fence must use the opening marker and at least its length.
  // Shorter example fences inside a Markdown code block are ordinary code.
  function transformOutsideCode(markdown, transform, onCode = () => {}) {
    let fence = null;
    const lines = String(markdown || "").split("\n");
    return lines.map((line, index) => {
      const match = line.match(/^(?:\s*> ?)*[ \t]*(`{3,}|~{3,})(.*)$/);
      if (match && (!fence || (match[1][0] === fence[0] && match[1].length >= fence.length && !match[2].trim()))) {
        fence = fence ? null : match[1];
        onCode();
        return line;
      }
      if (fence) {
        onCode();
        return line;
      }
      return transform(line, index, lines);
    }).filter((line) => line !== null).join("\n");
  }

  function normalizeMessageMarkdown(markdown) {
    const repaired = transformOutsideCode(markdown, (line, index, lines) => {
      const marker = line.match(/^(\s*)([-*+]|\d+[.)])\s*$/);
      const next = lines[index + 1];
      if (marker && next && next.trim() && !/^\s*(?:`{3,}|~{3,}|#|>)/.test(next)) {
        lines[index + 1] = "";
        return `${marker[1]}${marker[2]} ${next.trimStart()}`;
      }
      return line;
    });
    const headings = transformOutsideCode(repaired, (line) => line.replace(
      /^(#{1,6})(?=\s)/, (_, hashes) => "#".repeat(Math.min(6, hashes.length + 2))
    ));
    return collapseExcessBlankLinesOutsideCode(headings, true);
  }

  function isListItem(line) {
    return /^(\s*)(?:[-*+]|\d+[.)])\s+\S/.test(String(line || ""));
  }

  function collapseExcessBlankLinesOutsideCode(markdown, tightenLists = false) {
    let blankLines = 0;
    return transformOutsideCode(markdown, (line, index, lines) => {
      if (!line.trim()) {
        if (tightenLists && isListItem(lines[index - 1]) && isListItem(lines[index + 1])) return null;
        blankLines += 1;
        return blankLines <= 1 ? "" : null;
      }
      blankLines = 0;
      return line;
    }, () => { blankLines = 0; });
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
