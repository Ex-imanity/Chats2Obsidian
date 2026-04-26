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

    return cleanText(
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

    if (tag === "pre") {
      const code = element.querySelector("code");
      const language = languageFromCode(code);
      const text = cleanText(code ? code.innerText : element.innerText);
      parts.push(`\n\n\`\`\`${language}\n${text}\n\`\`\`\n\n`);
      return;
    }

    if (tag === "br") {
      parts.push("\n");
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
    return match ? match[1] : "";
  }

  function cleanText(value) {
    return String(value || "")
      .replace(/\r\n/g, "\n")
      .replace(/\u00a0/g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .trim();
  }

  return { extractConversation };
})();

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
