const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const extractor = loadExtractor();

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

function loadExtractor() {
  const content = fs.readFileSync(path.join(__dirname, "..", "content.js"), "utf8");
  const sandbox = {
    Node: { TEXT_NODE: 3, ELEMENT_NODE: 1 },
    chrome: { runtime: { onMessage: { addListener() {} } } },
    document: { querySelectorAll: () => [], querySelector: () => null },
    location: { href: "https://chatgpt.com/c/example" },
    module: { exports: {} },
    exports: {},
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
    nodeType: 1,
    tagName: tagName.toUpperCase(),
    childNodes,
    className: attrs.className || "",
    href: attrs.href || "",
    src: attrs.src || "",
    currentSrc: attrs.currentSrc || "",
    alt: attrs.alt || "",
    getAttribute(name) {
      if (name === "aria-hidden") return attrs["aria-hidden"] || null;
      if (name === "data-message-author-role") return attrs["data-message-author-role"] || null;
      return attrs[name] || null;
    },
    querySelector(selector) {
      if (selector !== "code" && selector !== "img") return null;
      return findFirst(this, (item) => item.tagName && item.tagName.toLowerCase() === selector);
    },
  };

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
