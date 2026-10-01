(() => {
const ChatGPTToObsidianExtractor = (() => {
  const MESSAGE_BODIES = '[data-message-author-role], [data-chatgpt-search-unit-key$=":user"], [data-user-message-bubble], [data-markdown-text-style="assistant-message"]';
  let visibilityCache = null;

  function withVisibilityCache(read) {
    const previous = visibilityCache;
    visibilityCache = previous || new WeakMap();
    try { return read(); } finally { visibilityCache = previous; }
  }

  function extractConversation() {
    return withVisibilityCache(() => {
      const scope = conversationScope();
      const messages = extractMessages(scope).map(({ role, text }) => ({ role, text }));

      return {
        title: extractTitle(scope),
        url: location.href,
        createdAt: new Date().toISOString(),
        messages,
      };
    });
  }

  async function extractCompleteConversation() {
    const scope = conversationScope();
    const initial = extractConversation();
    const scroller = scope.querySelector(".thread-scroll-container");
    if (!scroller || scroller.scrollHeight <= scroller.clientHeight) return initial;

    const previous = globalThis.__chats2obsidianCollection;
    const job = { scroller, position: previous?.scroller === scroller ? previous.position : scroller.scrollTop };
    globalThis.__chats2obsidianCollection = job;
    const identity = (url) => url.match(/\/c\/([^/?#]+)/)?.[1] || url;
    const reverse = getComputedStyle(scroller).flexDirection === "column-reverse";
    const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const check = () => {
      if (globalThis.__chats2obsidianCollection !== job) throw new Error("Export refresh was superseded by a newer request.");
      if (identity(location.href) !== identity(initial.url) || conversationScope() !== scope) {
        throw new Error("Conversation changed while reading. Refresh the export.");
      }
    };
    const waitForLayout = async () => {
      await pause(120);
      for (let attempt = 0; attempt < 40; attempt++) {
        check();
        // Scroll coordinates move immediately; React may mount the target
        // window later. Require actual message content inside the viewport.
        if (withVisibilityCache(() => viewportHasMessages(scope, scroller))) return;
        await pause(50);
      }
      throw new Error("The message viewport is still loading. Refresh to read the complete conversation.");
    };
    const capture = () => withVisibilityCache(() => {
      check();
      const records = extractMessages(scope);
      if (records.some((record) => !record.id) || new Set(records.map((record) => record.id)).size !== records.length) {
        throw new Error("Stable message identities are unavailable. Cannot safely read the complete conversation.");
      }
      return records;
    });
    let collected = [];
    try {
      // Loading older turns can change scrollHeight. Reach the actual oldest
      // edge twice at the same height before walking towards the newest edge.
      let height = -1, atOldest = false;
      for (let attempt = 0; attempt < 20; attempt++) {
        check();
        scroller.scrollTop = reverse ? -1e9 : 0;
        await waitForLayout();
        check();
        const edge = reverse ? scroller.clientHeight - scroller.scrollHeight : 0;
        if (Math.abs(scroller.scrollTop - edge) < 2 && height === scroller.scrollHeight) {
          atOldest = true;
          break;
        }
        height = scroller.scrollHeight;
      }
      if (!atOldest) throw new Error("Earlier messages are still loading. Refresh to read the complete conversation.");

      const started = Date.now();
      let atNewest = 0, complete = false;
      for (let step = 0; step < 320 && Date.now() - started < 45000; step++) {
        const window = capture();
        collected = mergeMessageWindow(collected, window);
        const edge = reverse ? 0 : scroller.scrollHeight - scroller.clientHeight;
        if (Math.abs(scroller.scrollTop - edge) < 2) {
          if (++atNewest === 2) { complete = true; break; }
        } else atNewest = 0;
        scroller.scrollTop = Math.min(edge, scroller.scrollTop + Math.max(1, scroller.clientHeight * 0.75));
        await waitForLayout();
      }
      if (!complete) throw new Error("Could not finish reading the complete conversation. Wait and refresh the export.");
      check();
      return { ...initial, messages: collected.map(({ role, text }) => ({ role, text })) };
    } finally {
      // A newer refresh inherits the original position. The older collector
      // must not move its scroller or restore a different conversation's view.
      if (globalThis.__chats2obsidianCollection === job) {
        if (identity(location.href) === identity(initial.url) && scroller.isConnected !== false) {
          scroller.scrollTop = job.position;
          await pause(120);
        }
        if (globalThis.__chats2obsidianCollection === job) delete globalThis.__chats2obsidianCollection;
      }
    }
  }

  function mergeMessageWindow(collected, window) {
    if (!window.length) throw new Error("Messages are still loading. Refresh to read the complete conversation.");
    const same = (a, b) => a.id === b.id;
    const update = (a, b) => b.text.length >= a.text.length ? b : a;
    // A shrinking overscan window may already lie entirely in the collected
    // sequence. Preserve repeated equal text by matching sequences, not sets.
    for (let start = 0; start <= collected.length - window.length; start++) {
      if (window.every((record, offset) => same(collected[start + offset], record))) {
        return collected.map((record, index) => index >= start && index < start + window.length
          ? update(record, window[index - start]) : record);
      }
    }
    let overlap = Math.min(collected.length, window.length);
    while (overlap && !window.slice(0, overlap).every((record, offset) =>
      same(collected[collected.length - overlap + offset], record))) overlap--;
    if (collected.length && !overlap) {
      throw new Error("Message windows did not overlap. Refresh to read the complete conversation.");
    }
    return [...collected.slice(0, collected.length - overlap),
      ...window.map((record, offset) => offset < overlap
        ? update(collected[collected.length - overlap + offset], record) : record)];
  }

  function viewportHasMessages(scope, scroller) {
    if (typeof scroller.getBoundingClientRect !== "function") return true;
    const viewport = scroller.getBoundingClientRect();
    return Array.from(scope.querySelectorAll(MESSAGE_BODIES)).some((node) => {
      if (!isDisplayed(node) || (!cleanText(node.textContent) && !node.querySelector("img"))) return false;
      const bounds = node.getBoundingClientRect();
      return bounds.bottom > viewport.top && bounds.top < viewport.bottom && bounds.bottom > bounds.top;
    });
  }

  function extractTitle(scope) {
    const candidates = [
      scope.querySelector('[data-testid="conversation-title"]'),
      document.querySelector("title"),
    ];

    const title = candidates
      .map((node) => (node ? node.innerText || node.textContent : ""))
      .find((text) => cleanText(text).length > 0);

    return cleanText(title)
      .replace(/\s*[-|]\s*ChatGPT\s*$/i, "")
      .replace(/^ChatGPT\s*[-|]\s*/i, "")
      || "ChatGPT Conversation";
  }

  function isDisplayed(node) {
    // ChatGPT caches whole workspaces. The main itself can still be display:flex
    // while an ancestor hides it. Offscreen messages must remain exportable.
    if (!node || node.nodeType !== Node.ELEMENT_NODE) return true;
    if (visibilityCache?.has(node)) return visibilityCache.get(node);
    let displayed = node.getAttribute("hidden") === null;
    if (typeof getComputedStyle === "function") {
      const style = getComputedStyle(node);
      if (style.display === "none" || style.visibility === "hidden" ||
        style.visibility === "collapse" || style.contentVisibility === "hidden") displayed = false;
    }
    displayed = displayed && isDisplayed(node.parentElement);
    visibilityCache?.set(node, displayed);
    return displayed;
  }

  function conversationScope() {
    const mains = Array.from(document.querySelectorAll("main"));
    const scopes = mains.length ? mains.filter(isDisplayed) : [document];
    const id = location.href.match(/\/c\/([^/?#]+)/)?.[1];
    const candidates = scopes.map((scope) => ({ scope, ids: Array.from(
      scope.querySelectorAll("[data-chatgpt-selection-conversation-id]")
    ).filter(isDisplayed).map((node) => node.getAttribute("data-chatgpt-selection-conversation-id")) }));
    const current = id && candidates.find(({ ids }) => ids.length && ids.every((value) => value === id));
    const fallback = candidates.find(({ ids }) => !ids.length);
    const selected = current || (!id ? candidates[0] : fallback);
    if (!selected) throw new Error("Conversation is switching or still loading. Wait and refresh the export.");
    return selected.scope;
  }

  function extractMessages(scope) {
    // Both layouts can coexist during updates. Read explicit bodies together in
    // DOM order, rather than stopping after finding one classic role/article.
    const nodes = Array.from(scope.querySelectorAll(MESSAGE_BODIES)).filter(isDisplayed);
    const records = nodes.map((node) => ({ node, role: inferRole(node), text: elementToMarkdown(node) }))
      .filter((message) => cleanText(message.text).length > 0);
    const messages = records.filter((record) => !records.some((parent) =>
      parent !== record && parent.node.contains(record.node)));
    const turns = Array.from(
      scope.querySelectorAll('article, [data-testid^="conversation-turn-"]')
    ).filter(isDisplayed).filter((turn, _, all) => !all.some((parent) => parent !== turn && parent.contains(turn)));
    for (const turn of turns) {
      if (messages.some((message) => turn.contains(message.node) || message.node.contains(turn))) continue;
      const role = inferRole(turn);
      // An arbitrary article can be an activity card, not a conversation turn.
      if (role === "note" && !/^conversation-turn-/.test(turn.getAttribute("data-testid") || "")) continue;
      const body = turn.querySelector('.markdown, [data-testid="user-message"]') || turn;
      const text = elementToMarkdown(body);
      if (cleanText(text)) messages.push({ node: turn, role, text });
    }
    return messages.sort((left, right) => left.node.compareDocumentPosition(right.node) & 4 ? -1 : 1)
      .map(({ node, role, text }) => ({ id: messageIdentity(node), role, text }));
  }

  function messageIdentity(node) {
    for (let element = node; element && element.nodeType === Node.ELEMENT_NODE; element = element.parentElement) {
      const id = element.getAttribute("data-message-id") ||
        element.getAttribute("data-chatgpt-selection-message-id") ||
        element.getAttribute("data-chatgpt-search-message-ids")?.trim().split(/\s+/)[0];
      if (id) return id;
    }
    return "";
  }

  function inferRole(node) {
    if (node.getAttribute("data-markdown-text-style") === "assistant-message") return "assistant";
    if (node.getAttribute("data-user-message-bubble") !== null ||
      /:user$/.test(node.getAttribute("data-chatgpt-search-unit-key") || "")) return "user";
    const marker = node.querySelector("[data-message-author-role]");
    const explicit = node.getAttribute("data-message-author-role") ||
      node.getAttribute("data-turn") || marker?.getAttribute("data-message-author-role");
    if (explicit) return explicit;
    // Inspect labels, never answer prose: an assistant can say "you" or "user".
    const label = node.getAttribute("aria-label") || "";
    if (/you said|user|you/i.test(label)) return "user";
    if (/chatgpt|assistant/i.test(label)) return "assistant";
    return "note";
  }

  function elementToMarkdown(node) {
    return withVisibilityCache(() => normalizeExtractedMarkdown(render(node)));
  }

  function isSourceIcon(node) {
    for (let element = node; element && element.nodeType === Node.ELEMENT_NODE; element = element.parentElement) {
      if (element.getAttribute("data-testid") === "chatgpt-citation" ||
        /(?:^|\s)Favicon(?:-|\s|$)/.test(element.className || "")) return true;
    }
    return false;
  }

  function children(node) {
    return Array.from(node.childNodes || []);
  }

  function renderChildren(node) {
    return children(node).map(render).join("");
  }

  function block(value) {
    return value ? `\n\n${value.replace(/^\n+|\n+$/g, "")}\n\n` : "";
  }

  function render(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      return escapeMarkdownText(String(node.textContent || "").replace(/\u00a0/g, " "));
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return "";
    if (!isDisplayed(node)) return "";
    const tag = node.tagName.toLowerCase();
    if (["script", "style", "svg"].includes(tag)) return "";
    if (node.getAttribute("data-markdown-copy") === "exclude") return "";

    // KaTeX contains both accessible MathML and a second visual tree. Read the
    // original TeX at the outer wrapper before filtering aria-hidden children.
    if (/(?:^|\s)katex(?:-display)?(?:\s|$)/.test(node.className || "")) {
      const annotation = node.querySelector('annotation[encoding="application/x-tex"]');
      if (annotation) {
        const tex = nodeText(annotation).trim();
        return /(?:^|\s)katex-display(?:\s|$)/.test(node.className)
          ? block(`$$\n${tex}\n$$`) : `$${tex}$`;
      }
    }
    // aria-hidden affects accessibility, not visual display. Dropping a rendered
    // message wrapper's subtree here can discard the whole answer.
    if (tag === "button" && !node.querySelector("img")) return "";
    if (tag === "pre" || node.getAttribute("data-markdown-copy") === "code-block") return block(extractCodeBlock(node));
    if (tag === "code") {
      const value = nodeText(node).replace(/\r\n?/g, "\n").replace(/\n/g, " ");
      const ticks = (value.match(/`+/g) || []).reduce((max, run) => Math.max(max, run.length), 0);
      const fence = "`".repeat(ticks + 1);
      const padding = /^`|`$/.test(value) || (/^ .* $/.test(value) && value.trim()) ? " " : "";
      return `${fence}${padding}${value}${padding}${fence}`;
    }
    if (tag === "img") {
      if (isSourceIcon(node)) return "";
      const source = node.currentSrc || node.src || node.getAttribute("src");
      if (!source) return "";
      const alt = cleanText(node.alt || node.getAttribute("alt") || "image");
      return block(`![${escapeMarkdownLabel(alt)}](${escapeDestination(source)})`);
    }
    if (tag === "br") return "  \n";
    if (tag === "hr") return block("---");
    if (tag === "a") {
      const label = renderChildren(node).trim();
      const linkedImage = node.querySelector("img");
      if (linkedImage && !isSourceIcon(linkedImage)) return label;
      return node.href ? `[${label || escapeMarkdownLabel(node.href)}](${escapeDestination(node.href)})` : label;
    }
    if (tag === "table") return block(renderTable(node));
    if (tag === "ul" || tag === "ol") return block(renderList(node, tag === "ol"));
    if (tag === "blockquote") {
      const value = normalizeExtractedMarkdown(renderChildren(node));
      return block(value.split("\n").map((line) => line ? `> ${line}` : ">").join("\n"));
    }
    const value = renderChildren(node);
    const wrappers = { strong: "**", b: "**", em: "*", i: "*", del: "~~", s: "~~" };
    if (wrappers[tag]) return `${wrappers[tag]}${value}${wrappers[tag]}`;
    if (/^h[1-6]$/.test(tag)) return block(`${"#".repeat(Number(tag.slice(1)))} ${value.trim()}`);
    if (["p", "div", "section", "article"].includes(tag)) return block(value);
    return value;
  }

  function renderList(node, ordered) {
    let number = Number.parseInt(node.getAttribute("start"), 10) || 1;
    return children(node).filter((child) => child.tagName === "LI" && isDisplayed(child)).map((item) => {
      const explicit = Number.parseInt(item.getAttribute("value"), 10);
      if (ordered && Number.isFinite(explicit)) number = explicit;
      const marker = ordered ? `${number++}. ` : "- ";
      let content = "";
      children(item).forEach((child) => {
        if (child.tagName === "UL" || child.tagName === "OL") {
          content = content.replace(/\n+$/g, "") + "\n" + renderList(child, child.tagName === "OL") + "\n\n";
        } else content += render(child);
      });
      const body = normalizeExtractedMarkdown(content);
      const lines = body.split("\n");
      return marker + lines.map((line, index) => index && line ? " ".repeat(marker.length) + line : line).join("\n");
    }).join("\n");
  }

  function renderTable(node) {
    const rows = [];
    function collect(element) {
      children(element).forEach((child) => {
        if (!isDisplayed(child)) return;
        if (child.tagName === "TR") rows.push(child);
        else if (child.tagName && child.tagName !== "TABLE") collect(child);
      });
    }
    collect(node);
    const values = rows.map((row) => children(row)
      .filter((cell) => (cell.tagName === "TD" || cell.tagName === "TH") && isDisplayed(cell))
      .map((cell) => normalizeExtractedMarkdown(renderChildren(cell))
        .replace(/\|/g, "\\|").replace(/ *\n+/g, "<br>")));
    if (!values.length) return "";
    const width = Math.max(...values.map((row) => row.length));
    const format = (row) => `| ${Array.from({ length: width }, (_, i) => row[i] || "").join(" | ")} |`;
    const hasHeader = children(rows[0]).some((cell) => cell.tagName === "TH" && isDisplayed(cell));
    const header = hasHeader ? values.shift() : Array(width).fill("");
    return [format(header), format(Array(width).fill("---")), ...values.map(format)].join("\n");
  }

  function escapeMarkdownText(value) {
    return value.replace(/[\\`*_[\]$<>~]/g, "\\$&")
      .replace(/^(\s*)(#{1,6}|[-+])(?=\s)/gm, "$1\\$2")
      .replace(/^(\s*\d+)([.)])(?=\s)/gm, "$1\\$2");
  }

  function escapeDestination(value) {
    return String(value).replace(/\s/g, (char) => encodeURIComponent(char))
      .replace(/\(/g, "%28").replace(/\)/g, "%29");
  }

  function languageFromCode(code) {
    if (!code) return "";
    const className = code.className || "";
    const match = className.match(/language-([A-Za-z0-9_+#-]+)/);
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
    const header = pre.querySelector('[data-markdown-copy="exclude"] .truncate');
    let language = languageFromCode(source) || languageFromCode(pre) || normalizeLanguageName(nodeText(header));

    const inferred = !language && extractLeadingLanguage(text);
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
    return `${fence}${language}\n${text}${text.endsWith("\n") ? "" : "\n"}${fence}`;
  }

  function nodeText(node) {
    if (!node) return "";
    return node.textContent || node.innerText || "";
  }

  function cleanCodeText(value) {
    return String(value || "").replace(/\r\n?/g, "\n");
  }

  function extractLeadingLanguage(value) {
    const lines = String(value || "").split("\n");
    if (lines.length < 2) return null;

    const first = cleanText(lines[0]);
    const language = normalizeLanguageName(first, true);
    if (!language) return null;

    return {
      language,
      text: lines.slice(1).join("\n"),
    };
  }

  function normalizeLanguageName(value, knownOnly = false) {
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
      "纯文本": "text",
      "mermaid": "mermaid",
      "latex": "latex",
    };

    return aliases[normalized] || (!knownOnly && /^[a-z0-9_+-]+$/.test(normalized) ? normalized : "");
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
    const lines = String(markdown || "").replace(/\r\n?/g, "\n").split("\n");
    const normalized = [];
    let fence = null;
    let blanks = 0;
    for (const line of lines) {
      const match = line.match(/^(?:\s*> ?)*[ \t]*(`{3,}|~{3,})(.*)$/);
      if (match && (!fence || (match[1][0] === fence[0] && match[1].length >= fence.length && !match[2].trim()))) {
        fence = fence ? null : match[1];
        normalized.push(line);
        blanks = 0;
      } else if (fence) {
        normalized.push(line);
      } else if (!line.trim()) {
        if (++blanks <= 1) normalized.push("");
      } else {
        blanks = 0;
        normalized.push(line);
      }
    }
    return normalized.join("\n").replace(/^\n+|\n+$/g, "");
  }

  function cleanText(value) {
    return String(value || "")
      .replace(/\r\n/g, "\n")
      .replace(/\u00a0/g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .trim();
  }

  return { extractConversation, extractCompleteConversation, elementToMarkdown };
})();

if (typeof module === "object" && module.exports) {
  module.exports = ChatGPTToObsidianExtractor;
}

globalThis.__chats2obsidianExtractor = ChatGPTToObsidianExtractor;
if (globalThis.__chats2obsidianListener) {
  chrome.runtime.onMessage.removeListener(globalThis.__chats2obsidianListener);
}
globalThis.__chats2obsidianListener = (message, _sender, sendResponse) => {
  if (message && message.type === "CHATGPT_TO_OBSIDIAN_EXTRACT") {
    ChatGPTToObsidianExtractor.extractCompleteConversation().then(
      (conversation) => sendResponse({ ok: true, conversation }),
      (error) => sendResponse({ ok: false, error: error.message || String(error) })
    );
    return true;
  }

  return false;
};
chrome.runtime.onMessage.addListener(globalThis.__chats2obsidianListener);
})();
