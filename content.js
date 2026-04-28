const ChatGPTToObsidianExtractor = (() => {
  function extractConversation() {
    const messages = extractMessages();

    return {
      title: extractTitle(),
      url: location.href,
      createdAt: new Date().toISOString(),
      messages,
    };
  }

  function extractTitle() {
    const candidates = [
      document.querySelector("main h1"),
      document.querySelector("title"),
      document.querySelector('[data-testid="conversation-title"]'),
    ];

    const title = candidates
      .map((node) => (node ? node.innerText || node.textContent : ""))
      .find((text) => cleanText(text).length > 0);

    return cleanText(title)
      .replace(/\s*[-|]\s*ChatGPT\s*$/i, "")
      .replace(/^ChatGPT\s*[-|]\s*/i, "")
      || "ChatGPT Conversation";
  }

  function extractMessages() {
    const roleNodes = Array.from(
      document.querySelectorAll("[data-message-author-role]")
    );

    if (roleNodes.length > 0) {
      return roleNodes
        .map((node) => ({
          role: node.getAttribute("data-message-author-role"),
          text: elementToMarkdown(node),
        }))
        .filter((message) => cleanText(message.text).length > 0);
    }

    const turns = Array.from(
      document.querySelectorAll('article, [data-testid^="conversation-turn-"]')
    );

    return turns
      .map((turn) => ({
        role: inferRole(turn),
        text: elementToMarkdown(turn),
      }))
      .filter((message) => cleanText(message.text).length > 0);
  }

  function inferRole(node) {
    const text = `${node.getAttribute("aria-label") || ""} ${node.innerText || ""}`;
    if (/you said|user|you/i.test(text)) return "user";
    if (/chatgpt|assistant/i.test(text)) return "assistant";
    return "note";
  }

  function elementToMarkdown(node) {
    const parts = [];

    walk(node, parts, false);

    return normalizeExtractedMarkdown(
      parts
        .join("")
        .replace(/\n{4,}/g, "\n\n\n")
        .replace(/[ \t]+\n/g, "\n")
    );
  }

  function walk(node, parts, insidePre) {
    if (node.nodeType === Node.TEXT_NODE) {
      parts.push(node.textContent);
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return;
    }

    const element = node;
    const tag = element.tagName.toLowerCase();

    if (tag === "script" || tag === "style" || element.getAttribute("aria-hidden") === "true") {
      return;
    }

    if (tag === "button" && !element.querySelector("img")) {
      return;
    }

    if (tag === "pre") {
      const block = extractCodeBlock(element);
      if (block) {
        parts.push(`\n\n${block}\n\n`);
      }
      return;
    }

    if (tag === "img") {
      const source = element.currentSrc || element.src || element.getAttribute("src");
      if (source) {
        const alt = cleanText(element.alt || element.getAttribute("alt") || "image");
        parts.push(`\n\n![${escapeMarkdownLabel(alt)}](${source})\n\n`);
      }
      return;
    }

    if (tag === "br") {
      parts.push("\n");
      return;
    }

    if (tag === "a" && element.querySelector("img")) {
      Array.from(element.childNodes).forEach((child) => walk(child, parts, insidePre));
      return;
    }

    if (tag === "a" && element.href) {
      const text = cleanText(element.innerText) || element.href;
      parts.push(`[${text}](${element.href})`);
      return;
    }

    if (/^h[1-6]$/.test(tag)) {
      const level = Number(tag.slice(1));
      parts.push(`\n\n${"#".repeat(level)} `);
    }

    if (tag === "li") {
      parts.push("\n- ");
    }

    Array.from(element.childNodes).forEach((child) => walk(child, parts, insidePre));

    if (["p", "div", "section", "article", "li", "ul", "ol", "blockquote"].includes(tag)) {
      parts.push("\n");
    }
  }

  function languageFromCode(code) {
    if (!code) return "";
    const className = code.className || "";
    const match = className.match(/language-([A-Za-z0-9_-]+)/);
    if (match) return normalizeLanguageName(match[1]);

    const attrLanguage =
      code.getAttribute("data-language") ||
      code.getAttribute("data-lang") ||
      code.getAttribute("lang");
    return normalizeLanguageName(attrLanguage || "");
  }

  function extractCodeBlock(pre) {
    const code = pre.querySelector("code");
    const source = code || pre;
    const rawText = nodeText(source);
    let text = cleanCodeText(rawText);
    let language = languageFromCode(source) || languageFromCode(pre);

    const inferred = extractLeadingLanguage(text);
    if (inferred) {
      if (!language) {
        language = inferred.language;
      }
      text = inferred.text;
    }

    if (!text) {
      return "";
    }

    const fence = codeFenceFor(text);
    return `${fence}${language}\n${text}\n${fence}`;
  }

  function nodeText(node) {
    if (!node) return "";
    return node.textContent || node.innerText || "";
  }

  function cleanCodeText(value) {
    return String(value || "")
      .replace(/\r\n/g, "\n")
      .replace(/\u00a0/g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/^\s*(Copy code|复制代码)\s*\n/i, "")
      .trim();
  }

  function extractLeadingLanguage(value) {
    const lines = String(value || "").split("\n");
    if (lines.length < 2) return null;

    const first = cleanText(lines[0]);
    const language = normalizeLanguageName(first);
    if (!language) return null;

    return {
      language,
      text: lines.slice(1).join("\n").trim(),
    };
  }

  function normalizeLanguageName(value) {
    const normalized = String(value || "").trim().toLowerCase();
    const aliases = {
      "c++": "cpp",
      "c#": "csharp",
      "js": "js",
      "javascript": "javascript",
      "ts": "ts",
      "typescript": "typescript",
      "json": "json",
      "bash": "bash",
      "shell": "shell",
      "sh": "sh",
      "zsh": "zsh",
      "python": "python",
      "py": "python",
      "java": "java",
      "sql": "sql",
      "yaml": "yaml",
      "yml": "yaml",
      "markdown": "markdown",
      "md": "markdown",
      "html": "html",
      "xml": "xml",
      "css": "css",
      "go": "go",
      "rust": "rust",
      "php": "php",
      "text": "text",
      "plaintext": "text",
    };

    return aliases[normalized] || "";
  }

  function codeFenceFor(value) {
    const matches = String(value || "").match(/`{3,}/g) || [];
    const longest = matches.reduce((length, match) => Math.max(length, match.length), 2);
    return "`".repeat(longest + 1);
  }

  function escapeMarkdownLabel(value) {
    return String(value || "").replace(/[[\]\\]/g, "\\$&");
  }

  function normalizeExtractedMarkdown(markdown) {
    const lines = cleanText(markdown).split("\n");
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

    return cleanText(normalized.join("\n"));
  }

  function isListItem(line) {
    return /^(\s*)(?:[-*+]|\d+[.)])\s+\S/.test(String(line || ""));
  }

  function isFenceLine(line) {
    return /^`{3,}/.test(String(line || "").trim());
  }

  function cleanText(value) {
    return String(value || "")
      .replace(/\r\n/g, "\n")
      .replace(/\u00a0/g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .trim();
  }

  return { extractConversation, elementToMarkdown };
})();

if (typeof module === "object" && module.exports) {
  module.exports = ChatGPTToObsidianExtractor;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message && message.type === "CHATGPT_TO_OBSIDIAN_EXTRACT") {
    try {
      sendResponse({
        ok: true,
        conversation: ChatGPTToObsidianExtractor.extractConversation(),
      });
    } catch (error) {
      sendResponse({
        ok: false,
        error: error && error.message ? error.message : String(error),
      });
    }
  }

  return true;
});
