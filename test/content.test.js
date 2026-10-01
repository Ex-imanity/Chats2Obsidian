const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const extractor = loadExtractor();
let nextNodeOrder = 0;

test("elementToMarkdown preserves image and fenced code content", () => {
  const root = el("div", {}, [
    el("p", {}, [text("Before")]),
    el("button", {}, [
      el("a", { href: "https://example.com/full-size.png" }, [
        el("img", {
          alt: "HTTP error screenshot",
          src: "https://example.com/screenshot.png",
        }),
      ]),
    ]),
    el("pre", {}, [
      el("code", { className: "language-js" }, [text("console.log(1);")]),
    ]),
  ]);

  const markdown = extractor.elementToMarkdown(root);

  assert.match(markdown, /Before/);
  assert.match(markdown, /!\[HTTP error screenshot\]\(https:\/\/example\.com\/screenshot\.png\)/);
  assert.match(markdown, /```js\nconsole\.log\(1\);\n```/);
});

test("elementToMarkdown turns code block language header into fence info", () => {
  const root = el("pre", {}, [
    el("code", {}, [text("JavaScript\nfunction handler() {\n  return 1;\n}")]),
  ]);

  const markdown = extractor.elementToMarkdown(root);

  assert.match(markdown, /^```javascript\nfunction handler\(\) \{/);
  assert.doesNotMatch(markdown, /```[\s\S]*\nJavaScript\n/);
});

test("elementToMarkdown removes blank lines between consecutive list items", () => {
  const root = el("ul", {}, [
    el("li", {}, [text("内网地址")]),
    el("li", {}, [text("test 环境只在公司内网")]),
    el("li", {}, [text("localhost / 127.0.0.1")]),
  ]);

  assert.equal(
    extractor.elementToMarkdown(root),
    "- 内网地址\n- test 环境只在公司内网\n- localhost / 127.0.0.1"
  );
});

test("preserves inline emphasis, code delimiters and hard breaks", () => {
  const root = el("p", {}, [text("Use "), el("strong", {}, [text("bold")]),
    text(" and "), el("em", {}, [text("italics")]), text(" with "),
    el("code", {}, [text("a`b")]), el("br"), text("next")]);
  assert.equal(extractor.elementToMarkdown(root), "Use **bold** and *italics* with ``a`b``  \nnext");
});

test("preserves ordered list numbering, nesting and continuation paragraphs", () => {
  const root = el("ol", { start: "3" }, [
    el("li", {}, [el("p", {}, [text("First")]), el("ul", {}, [
      el("li", {}, [text("Child")]),
    ]), el("p", {}, [text("Details")])]),
    el("li", { value: "7" }, [text("Last")]),
  ]);
  assert.equal(extractor.elementToMarkdown(root), "3. First\n   - Child\n\n   Details\n7. Last");
});

test("exports table rows with separators, escaped pipes and multiline cells", () => {
  const root = el("table", {}, [
    el("thead", {}, [el("tr", {}, [el("th", {}, [text("Name")]), el("th", {}, [text("Value")])])]),
    el("tbody", {}, [el("tr", {}, [el("td", {}, [el("strong", {}, [text("A|B")])]),
      el("td", {}, [text("one"), el("br"), text("two")])])]),
  ]);
  assert.equal(extractor.elementToMarkdown(root), "| Name | Value |\n| --- | --- |\n| **A\\|B** | one<br>two |");
});

test("preserves blockquotes and horizontal rules as Markdown blocks", () => {
  const root = el("div", {}, [el("blockquote", {}, [el("p", {}, [text("Quote")]),
    el("blockquote", {}, [el("p", {}, [text("Nested")])])]), el("hr"), el("p", {}, [text("After")])]);
  assert.equal(extractor.elementToMarkdown(root), "> Quote\n>\n> > Nested\n\n---\n\nAfter");
});

test("reads KaTeX source once including aria-hidden display math", () => {
  const root = el("div", {}, [el("p", {}, [text("Inline "), el("span", { className: "katex" }, [
    el("annotation", { encoding: "application/x-tex" }, [text("x^2")]), text("duplicate"),
  ])]), el("span", { className: "katex-display", "aria-hidden": "true" }, [
    el("annotation", { encoding: "application/x-tex" }, [text("\\frac{a}{b}")]), text("duplicate"),
  ])]);
  assert.equal(extractor.elementToMarkdown(root), "Inline $x^2$\n\n$$\n\\frac{a}{b}\n$$");
});

test("preserves code indentation, trailing spaces and multiple blank lines", () => {
  const code = "    indented  \n\n\n\nend\n";
  assert.equal(extractor.elementToMarkdown(el("pre", {}, [el("code", { className: "language-python" }, [text(code)])])),
    "```python\n" + code + "```");
});

test("does not strip a real language-named first code line", () => {
  const code = "json\nprint(json.dumps({}))";
  assert.equal(extractor.elementToMarkdown(el("pre", {}, [el("code", { className: "language-python" }, [text(code)])])),
    "```python\n" + code + "\n```");
});

test("does not mistake an answer heading for the conversation title", () => {
  const reader = loadExtractor({ querySelectorAll: () => [], querySelector: (selector) =>
    selector === "main h1" ? el("h1", {}, [text("Answer section")]) :
    selector === "title" ? el("title", {}, [text("Conversation title - ChatGPT")]) : null });
  assert.equal(reader.extractConversation().title, "Conversation title");
});

test("nested code blocks keep blank lines and fences longer than examples", () => {
  const value = "```md\n-\nexample\n\n\n\n```";
  const root = el("ul", {}, [el("li", {}, [el("p", {}, [text("Code")]),
    el("pre", {}, [el("code", { className: "language-markdown" }, [text(value)])])])]);
  const expected = "- Code\n\n  ````markdown\n  ```md\n  -\n  example\n\n\n\n  ```\n  ````";
  assert.equal(extractor.elementToMarkdown(root), expected);
  const { buildMarkdown } = require("../src/markdown.js");
  assert.ok(buildMarkdown({ messages: [{ role: "assistant", text: expected }] }).includes(expected));
});

test("literal Markdown punctuation stays literal in rendered text and link labels", () => {
  const root = el("p", {}, [text("*literal* and $5; "),
    el("a", { href: "https://example.com/a(b)" }, [text("[docs]")])]);
  assert.equal(extractor.elementToMarkdown(root), "\\*literal\\* and \\$5; [\\[docs\\]](https://example.com/a%28b%29)");
});

test("preserves Mermaid and arbitrary explicit code languages", () => {
  const root = el("div", {}, [el("pre", {}, [el("code", { className: "language-mermaid" }, [text("flowchart TD\nA-->B")])]),
    el("pre", {}, [el("code", { "data-language": "hcl" }, [text('resource "test" {}')])])]);
  assert.equal(extractor.elementToMarkdown(root), '```mermaid\nflowchart TD\nA-->B\n```\n\n```hcl\nresource "test" {}\n```');
});

test("Work div code blocks preserve language and whitespace without toolbar text", () => {
  const root = el("div", { "data-markdown-copy": "code-block" }, [
    el("div", { "data-markdown-copy": "exclude" }, [
      el("div", { className: "truncate" }, [text("Python")]),
      el("button", {}, [text("Copy")]),
    ]),
    el("div", {}, [el("code", {}, [text("json\n  print(1)\n\n\n")])]),
  ]);
  assert.equal(extractor.elementToMarkdown(root), "```python\njson\n  print(1)\n\n\n```");
});

test("extracts rendered messages marked aria-hidden for accessibility", () => {
  const message = el("div", { "data-message-author-role": "assistant", "aria-hidden": "true" }, [
    el("p", {}, [text("Visible answer")]),
  ]);
  const reader = conversationReader([message], []);
  assert.equal(reader.extractConversation().messages[0]?.text, "Visible answer");
});

test("falls back to turn content when role markers are empty", () => {
  const marker = el("div", { "data-message-author-role": "assistant" });
  const turn = el("article", { "data-turn": "assistant" }, [marker,
    el("div", { className: "markdown" }, [el("p", {}, [text("Answer outside marker")])]),
    el("button", {}, [text("Copy")]),
  ]);
  const messages = conversationReader([marker], [turn]).extractConversation().messages;
  assert.equal(messages.length, 1);
  assert.equal(messages[0].role, "assistant");
  assert.equal(messages[0].text, "Answer outside marker");
});

test("keeps turns without role markers in a mixed conversation", () => {
  const user = el("div", { "data-message-author-role": "user" }, [text("Question")]);
  const turns = [el("article", { "data-turn": "user" }, [user]),
    el("article", { "data-turn": "assistant" }, [el("p", {}, [text("You can export now")])]),
  ];
  const messages = conversationReader([user], turns).extractConversation().messages;
  assert.equal(messages.length, 2);
  assert.equal(messages[1].role, "assistant");
  assert.equal(messages[1].text, "You can export now");
});

test("reinstalling the content script keeps a single working message listener", async () => {
  const content = fs.readFileSync(path.join(__dirname, "..", "content.js"), "utf8");
  const listeners = new Set();
  const message = el("div", { "data-message-author-role": "assistant" }, [text("Latest answer")]);
  const sandbox = {
    Node: { TEXT_NODE: 3, ELEMENT_NODE: 1 },
    chrome: { runtime: { onMessage: {
      addListener(listener) { listeners.add(listener); },
      removeListener(listener) { listeners.delete(listener); },
    } } },
    document: conversationDocument([message], []),
    location: { href: "https://chatgpt.com/g/example/c/example" },
    module: { exports: {} },
  };
  vm.createContext(sandbox);
  vm.runInContext(content, sandbox);
  vm.runInContext(content, sandbox);
  assert.equal(listeners.size, 1);
  let keepChannel;
  const response = await new Promise((resolve) => {
    keepChannel = [...listeners][0]({ type: "CHATGPT_TO_OBSIDIAN_EXTRACT" }, {}, resolve);
  });
  assert.equal(keepChannel, true);
  assert.equal(response.ok, true);
  assert.equal(response.conversation.messages[0].text, "Latest answer");
});

test("extracts Work messages without classic role or article markers in DOM order", () => {
  const user = el("div", { "data-chatgpt-search-unit-key": "turn-0:0:user" }, [
    el("div", { "data-user-message-bubble": "true" }, [text("First question")]),
    el("button", {}, [text("Copy message")]),
  ]);
  const answer = el("div", { "data-markdown-text-style": "assistant-message" }, [
    el("p", {}, [el("strong", {}, [text("Answer")])]),
  ]);
  const next = el("div", { "data-user-message-bubble": "true" }, [text("Follow-up")]);
  const messages = conversationReader([], [], [user, user.childNodes[0], answer, next]).extractConversation().messages;
  assert.deepEqual(Array.from(messages, (m) => [m.role, m.text]), [
    ["user", "First question"], ["assistant", "**Answer**"], ["user", "Follow-up"],
  ]);
});

test("mixed classic and Work messages do not truncate at the classic role", () => {
  const user = el("div", { "data-message-author-role": "user" }, [text("Question")]);
  const answer = el("div", { "data-markdown-text-style": "assistant-message" }, [text("Answer")]);
  assert.deepEqual(Array.from(conversationReader([user], [], [answer]).extractConversation().messages,
    (m) => [m.role, m.text]), [["user", "Question"], ["assistant", "Answer"]]);
});

test("Work messages are extracted while unrelated article activity is excluded", () => {
  const user = el("div", { "data-user-message-bubble": "true" }, [text("Question")]);
  const activity = el("article", {}, [text("Activity: searching")]);
  const answer = el("div", { "data-markdown-text-style": "assistant-message" }, [text("Answer")]);
  assert.deepEqual(Array.from(conversationReader([], [activity], [user, answer]).extractConversation().messages,
    (m) => [m.role, m.text]), [["user", "Question"], ["assistant", "Answer"]]);
});

test("sidebar switching skips an old main hidden by its ancestor", () => {
  const old = scopedMain("old", "Previous body");
  el("div", { style: "display: none !important" }, [el("div", {}, [old])]);
  const current = scopedMain("example", "Current body");
  const reader = loadExtractor(scopedDocument([old, current]));
  const conversation = reader.extractConversation();
  assert.equal(conversation.title, "Current title");
  assert.deepEqual(Array.from(conversation.messages, (m) => m.text), ["Current body"]);
});

test("a changed URL cannot export the still-visible previous conversation", () => {
  const reader = loadExtractor(scopedDocument([scopedMain("old", "Previous body")]));
  assert.throws(() => reader.extractConversation(), /switch|load|ready/i);
});

test("switching back selects the restored main rather than the newer hidden one", () => {
  const current = scopedMain("example", "Restored body");
  const cached = scopedMain("other", "Other body");
  el("div", { hidden: "" }, [cached]);
  assert.deepEqual(Array.from(loadExtractor(scopedDocument([current, cached])).extractConversation().messages,
    (m) => m.text), ["Restored body"]);
});

test("hidden cached messages inside the current main are excluded", () => {
  const hidden = scopedMain("old", "Cached body");
  const current = scopedMain("example", "Current body");
  current.childNodes.push(el("div", { style: "display: none" }, [hidden]));
  current.childNodes.at(-1).parentElement = current;
  assert.deepEqual(Array.from(loadExtractor(scopedDocument([current])).extractConversation().messages,
    (m) => m.text), ["Current body"]);
});

test("a visible message cannot reintroduce a hidden cached subtree while rendering", () => {
  const message = el("div", { "data-message-author-role": "assistant" }, [
    el("p", {}, [text("Current answer")]),
    el("div", { style: "display: none" }, [scopedMain("old", "Cached answer")]),
  ]);
  const main = el("main", {}, [el("div", { "data-chatgpt-selection-conversation-id": "example" }, [message])]);
  assert.deepEqual(Array.from(loadExtractor(scopedDocument([main])).extractConversation().messages,
    (m) => m.text), ["Current answer"]);
});

test("fallback turns skip hidden content within the rendered body", () => {
  const body = el("div", { className: "markdown" }, [text("Current answer"),
    el("div", { hidden: "" }, [text("Cached answer")])]);
  const turn = el("article", { "data-turn": "assistant" }, [body]);
  assert.equal(conversationReader([], [turn]).extractConversation().messages[0].text, "Current answer");
});

test("list and table helpers do not bypass hidden subtree filtering", () => {
  const root = el("div", {}, [el("ul", {}, [
    el("li", {}, [text("Current item")]),
    el("li", { hidden: "" }, [text("Cached item")]),
    el("li", {}, [text("Next item"), el("ul", { hidden: "" }, [el("li", {}, [text("Cached nested item")])])]),
  ]), el("table", {}, [
    el("tr", {}, [el("th", {}, [text("Header")]), el("th", { hidden: "" }, [text("Cached header")])]),
    el("tr", {}, [el("td", {}, [text("Current row")]), el("td", { hidden: "" }, [text("Cached cell")])]),
    el("tr", { hidden: "" }, [el("td", {}, [text("Cached row")])]),
    el("tbody", { hidden: "" }, [el("tr", {}, [el("td", {}, [text("Cached group")])])]),
  ])]);
  const markdown = extractor.elementToMarkdown(root);
  assert.doesNotMatch(markdown, /Cached/);
  assert.equal(markdown, "- Current item\n- Next item\n\n| Header |\n| --- |\n| Current row |");
});

test("a displayed classic main without conversation IDs remains supported", () => {
  const main = el("main", {}, [el("div", { "data-message-author-role": "assistant" }, [text("Classic body")])]);
  assert.equal(loadExtractor(scopedDocument([main])).extractConversation().messages[0].text, "Classic body");
});

test("all hidden main containers are treated as a loading conversation", () => {
  const main = scopedMain("example", "Hidden body");
  el("div", { style: "visibility: hidden" }, [main]);
  assert.throws(() => loadExtractor(scopedDocument([main])).extractConversation(), /switch|load|ready/i);
});

function scopedMain(id, body) {
  return el("main", {}, [el("div", { "data-chatgpt-selection-conversation-id": id }, [
    el("div", { "data-markdown-text-style": "assistant-message" }, [text(body)]),
  ])]);
}

function scopedDocument(mains) {
  return {
    querySelector(selector) {
      if (selector === "main") return mains[0] || null;
      if (selector === "title") return el("title", {}, [text("Current title - ChatGPT")]);
      return null;
    },
    querySelectorAll(selector) { return selector === "main" ? mains : []; },
  };
}

test("citation site icons stay source links rather than downloadable images", () => {
  const icon = el("img", { src: "https://t0.gstatic.com/faviconV2?url=https%3A%2F%2Fexample.com" });
  const citation = el("a", { "data-testid": "chatgpt-citation", href: "https://example.com/docs" }, [
    el("span", { className: "Favicon-test" }, [icon]), text("Source docs"),
  ]);
  const root = el("p", {}, [text("Answer "), citation]);
  assert.equal(extractor.elementToMarkdown(root), "Answer [Source docs](https://example.com/docs)");
});

test("complete extraction collects virtualized turns chronologically and restores scroll", async () => {
  const fixture = virtualizedReader();
  const result = await fixture.reader.extractCompleteConversation();
  assert.deepEqual(Array.from(result.messages, (m) => m.text), ["First", "Answer", "Repeated", "Reply", "Repeated", "Last"]);
  assert.equal(fixture.scroller.scrollTop, 300);
});

test("complete extraction handles reverse flex scrolling and changing height", async () => {
  const fixture = virtualizedReader({ reverse: true, grow: true });
  const result = await fixture.reader.extractCompleteConversation();
  assert.equal(result.messages.length, 6);
  assert.equal(result.messages[0].text, "First");
  assert.equal(result.messages[5].text, "Last");
  assert.equal(fixture.scroller.scrollTop, 0);
});

test("navigation during full collection fails instead of mixing conversations", async () => {
  const fixture = virtualizedReader({ navigate: true });
  await assert.rejects(() => fixture.reader.extractCompleteConversation(), /changed|switch/i);
});

test("missing overlap during full collection fails instead of claiming a complete export", async () => {
  const fixture = virtualizedReader({ disjoint: true });
  await assert.rejects(() => fixture.reader.extractCompleteConversation(), /complete|overlap|load/i);
  assert.equal(fixture.scroller.scrollTop, 300);
});

test("a newer full collection cancels the old collector and inherits the original scroll position", async () => {
  const fixture = virtualizedReader();
  const old = fixture.reader.extractCompleteConversation();
  const latest = fixture.reader.extractCompleteConversation();
  await assert.rejects(old, /superseded/i);
  const result = await latest;
  assert.equal(result.messages.length, 6);
  assert.equal(fixture.scroller.scrollTop, 300);
});

test("full collection waits for delayed viewport mounting instead of exporting the old window", async () => {
  const fixture = virtualizedReader({ delayed: true });
  const result = await fixture.reader.extractCompleteConversation();
  assert.equal(result.messages.length, 6);
  assert.equal(result.messages[0].text, "First");
});

test("a viewport that never mounts fails instead of returning a partial conversation", async () => {
  const fixture = virtualizedReader({ delayed: true, neverMount: true });
  await assert.rejects(() => fixture.reader.extractCompleteConversation(), /load|viewport|complete/i);
});

test("ambiguous repeated virtualized turns without stable IDs cannot be silently merged", async () => {
  const fixture = virtualizedReader({ unmarked: true });
  await assert.rejects(() => fixture.reader.extractCompleteConversation(), /stable|identity|identify/i);
});

function virtualizedReader({ reverse = false, grow = false, navigate = false, disjoint = false, delayed = false, neverMount = false, unmarked = false } = {}) {
  const rows = unmarked ? ["continue", "ok", "continue", "ok", "continue", "ok"] : ["First", "Answer", "Repeated", "Reply", "Repeated", "Last"];
  const windows = [[0,1,2], [1,2,3], [2,3,4], [3,4,5]];
  const scroller = el("div", { style: reverse ? "flex-direction: column-reverse" : "" });
  scroller.clientHeight = 100;
  let scrollHeight = 400, position = reverse ? 0 : 300, viewport = 3, mountedViewport = 3, ticks = 0;
  if (delayed) scroller.getBoundingClientRect = () => ({ top: 0, bottom: 100 });
  const main = el("main");
  const doc = scopedDocument([main]);
  const location = { href: "https://chatgpt.com/c/example" };
  function mount() {
    const indices = disjoint && viewport > 0 ? [4,5] : windows[viewport];
    mountedViewport = viewport;
    main.childNodes = indices.map((index) => el("div", unmarked ? {} : { "data-chatgpt-search-message-ids": `message-${index}` }, [
      el("div", index % 2 ? { "data-markdown-text-style": "assistant-message" } : { "data-user-message-bubble": "true" }, [text(rows[index])]),
    ]));
    main.childNodes.forEach((child) => {
      child.parentElement = main;
      if (delayed) child.childNodes[0].getBoundingClientRect = () => mountedViewport === viewport
        ? { top: 0, bottom: 80 } : { top: 200, bottom: 280 };
    });
  }
  const query = main.querySelector.bind(main);
  main.querySelector = (selector) => selector === ".thread-scroll-container" ? scroller : query(selector);
  Object.defineProperty(scroller, "scrollHeight", { get: () => scrollHeight });
  Object.defineProperty(scroller, "scrollTop", { get: () => position, set(value) {
    position = Math.max(reverse ? 100-scrollHeight : 0, Math.min(reverse ? 0 : scrollHeight-100, value));
    if (grow && position <= 100-scrollHeight) scrollHeight = 500;
    const fraction = reverse ? (position + scrollHeight-100)/(scrollHeight-100) : position/(scrollHeight-100);
    viewport = Math.min(3, Math.floor(fraction * 3 + 0.001));
    if (navigate && viewport === 1) location.href = "https://chatgpt.com/c/other";
    if (delayed) ticks = 3; else mount();
  } });
  mount();
  return { scroller, reader: loadExtractor(doc, { location, setTimeout(callback) {
    queueMicrotask(() => { if (delayed && !neverMount && --ticks === 0) mount(); callback(); });
  } }) };
}

function conversationReader(roles, turns, work = []) {
  return loadExtractor(conversationDocument(roles, turns, work));
}

function conversationDocument(roles, turns, work = []) {
  return {
    querySelector: () => null,
    querySelectorAll(selector) {
      if (selector.includes("data-message-author-role") && selector.includes("data-user-message-bubble")) return [...roles, ...work];
      if (selector === "[data-message-author-role]") return roles;
      if (selector.includes("data-user-message-bubble")) return work;
      if (selector.includes("article") || selector.includes("conversation-turn-")) return turns;
      return [];
    },
  };
}

function loadExtractor(documentOverride, overrides = {}) {
  const content = fs.readFileSync(path.join(__dirname, "..", "content.js"), "utf8");
  const sandbox = {
    Node: { TEXT_NODE: 3, ELEMENT_NODE: 1 },
    getComputedStyle(node) {
      const style = node.getAttribute("style") || "";
      return { display: /display:\s*none/.test(style) ? "none" : "flex",
        visibility: /visibility:\s*hidden/.test(style) ? "hidden" : "visible",
        flexDirection: style.includes("column-reverse") ? "column-reverse" : "column" };
    },
    chrome: { runtime: { onMessage: { addListener() {} } } },
    document: documentOverride || { querySelectorAll: () => [], querySelector: () => null },
    location: { href: "https://chatgpt.com/c/example" },
    module: { exports: {} },
    exports: {},
    ...overrides,
  };

  vm.createContext(sandbox);
  vm.runInContext(content, sandbox, { filename: "content.js" });
  return sandbox.module.exports;
}

function text(value) {
  return {
    nodeType: 3,
    textContent: value,
  };
}

function el(tagName, attrs = {}, childNodes = []) {
  const node = {
    order: nextNodeOrder++,
    nodeType: 1,
    tagName: tagName.toUpperCase(),
    childNodes,
    className: attrs.className || "",
    href: attrs.href || "",
    src: attrs.src || "",
    currentSrc: attrs.currentSrc || "",
    alt: attrs.alt || "",
    getAttribute(name) {
      return Object.hasOwn(attrs, name) ? attrs[name] : null;
    },
    contains(other) {
      return Boolean(findFirst(this, (item) => item === other));
    },
    compareDocumentPosition(other) {
      return this.order < other.order ? 4 : 2;
    },
    querySelectorAll(selector) {
      const result = [];
      function visit(parent) {
        for (const child of parent.childNodes || []) {
          const attr = (name) => child.getAttribute?.(name) ?? null;
          if (selector === "[data-message-author-role]" && attr("data-message-author-role")) result.push(child);
          if (selector === "[data-chatgpt-selection-conversation-id]" && attr("data-chatgpt-selection-conversation-id")) result.push(child);
          if (selector.includes("data-user-message-bubble") && (
            attr("data-message-author-role") || attr("data-user-message-bubble") !== null ||
            /:user$/.test(attr("data-chatgpt-search-unit-key") || "") ||
            attr("data-markdown-text-style") === "assistant-message")) result.push(child);
          if (selector.startsWith("article,") && (child.tagName === "ARTICLE" ||
            /^conversation-turn-/.test(attr("data-testid") || ""))) result.push(child);
          visit(child);
        }
      }
      visit(this);
      return result;
    },
    querySelector(selector) {
      if (selector === '[data-markdown-copy="exclude"] .truncate') {
        const header = findFirst(this, (item) => item.getAttribute?.("data-markdown-copy") === "exclude");
        return header && findFirst(header, (item) => /(?:^|\s)truncate(?:\s|$)/.test(item.className || ""));
      }
      if (selector === "[data-message-author-role]") return this.querySelectorAll(selector)[0] || null;
      if (selector === '.markdown, [data-testid="user-message"]') {
        return findFirst(this, (item) => /(?:^|\s)markdown(?:\s|$)/.test(item.className || "") || item.getAttribute?.("data-testid") === "user-message");
      }
      if (selector === 'annotation[encoding="application/x-tex"]') {
        return findFirst(this, (item) => item.tagName === "ANNOTATION" && item.getAttribute("encoding") === "application/x-tex");
      }
      return findFirst(this, (item) => item.tagName && item.tagName.toLowerCase() === selector);
    },
  };

  for (const child of childNodes) child.parentElement = node;

  Object.defineProperty(node, "textContent", {
    get() {
      return childNodes.map((child) => child.textContent || "").join("");
    },
  });

  Object.defineProperty(node, "innerText", {
    get() {
      return node.textContent;
    },
  });

  return node;
}

function findFirst(node, predicate) {
  if (predicate(node)) return node;
  for (const child of node.childNodes || []) {
    const found = findFirst(child, predicate);
    if (found) return found;
  }
  return null;
}
