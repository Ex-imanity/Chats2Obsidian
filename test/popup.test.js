const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

test("refresh reads the current extractor instead of an already loaded stale script", async () => {
  let currentScript = false;
  const sandbox = {
    window: { ChatGPTObsidianMarkdown: {} },
    document: {
      getElementById: () => ({ addEventListener() {} }),
      addEventListener() {},
    },
    chrome: {
      scripting: { async executeScript({ target, files }) {
        assert.equal(target.tabId, 7);
        if (files) {
          assert.deepEqual(Array.from(files), ["content.js"]);
          currentScript = true;
          return [{ result: undefined }];
        }
        return [{ result: { ok: true, conversation: { messages: currentScript
          ? [{ role: "assistant", text: "Recovered answer" }] : [] } } }];
      } },
      tabs: { async sendMessage() {
        return { ok: true, conversation: { messages: currentScript
          ? [{ role: "assistant", text: "Recovered answer" }] : [] } };
      } },
    },
  };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "popup.js"), "utf8"), sandbox);
  const response = await sandbox.requestExtraction(7);
  assert.equal(response.conversation.messages[0]?.text, "Recovered answer");
});

function popupReader(overrides = {}) {
  const elements = new Map();
  const pending = [];
  let url = "https://chatgpt.com/c/first";
  const sandbox = {
    URL, Blob,
    window: { ChatGPTObsidianMarkdown: require("../src/markdown.js") },
    document: {
      getElementById(id) {
        if (!elements.has(id)) elements.set(id, { value: "", textContent: "", disabled: false, addEventListener() {} });
        return elements.get(id);
      },
      addEventListener() {},
    },
    chrome: {
      tabs: { async query() { return [{ id: 7, url }]; }, async get() { return { id: 7, url }; } },
      scripting: { async executeScript({ files }) {
        if (files) return [];
        return new Promise((resolve) => pending.push((conversation) => resolve([{ result: { ok: true, conversation } }])));
      } },
    },
  };
  Object.assign(sandbox, overrides);
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "popup.js"), "utf8"), sandbox);
  return { sandbox, elements, pending, navigate(value) { url = value; } };
}
function conversation(id, body) {
  return { title: id, url: `https://chatgpt.com/c/${id}`, messages: [{ role: "assistant", text: body }] };
}
async function startRefresh(reader) {
  const result = reader.sandbox.refreshConversation();
  await new Promise(setImmediate);
  assert.ok(reader.pending.length, reader.elements.get("status").textContent);
  return { result };
}

test("refresh rejects extraction when the tab navigates before the response arrives", async () => {
  const reader = popupReader();
  const { result } = await startRefresh(reader);
  reader.navigate("https://chatgpt.com/c/second");
  reader.pending[0](conversation("first", "Previous body"));
  await result;
  assert.equal(reader.elements.get("preview").value, "");
  assert.equal(reader.elements.get("download").disabled, true);
  assert.match(reader.elements.get("status").textContent, /switch|changed|refresh/i);
});

test("refresh rejects a response whose conversation differs from the requested tab", async () => {
  const reader = popupReader();
  const { result } = await startRefresh(reader);
  reader.pending[0](conversation("other", "Wrong body"));
  await result;
  assert.equal(reader.elements.get("preview").value, "");
  assert.equal(reader.elements.get("download").disabled, true);
});

test("a slower old refresh cannot replace a newer ready conversation", async () => {
  const reader = popupReader();
  const first = await startRefresh(reader);
  reader.navigate("https://chatgpt.com/c/second");
  const second = await startRefresh(reader);
  reader.pending[1](conversation("second", "Current body"));
  await second.result;
  reader.pending[0](conversation("first", "Previous body"));
  await first.result;
  assert.match(reader.elements.get("preview").value, /Current body/);
  assert.doesNotMatch(reader.elements.get("preview").value, /Previous body/);
  assert.equal(reader.elements.get("status").textContent, "Ready: 1 turns found.");
  assert.equal(reader.elements.get("download").disabled, false);
});

test("refresh clears the previous preview while loading a new conversation", async () => {
  const reader = popupReader();
  const first = await startRefresh(reader);
  reader.pending[0](conversation("first", "Previous body"));
  await first.result;
  reader.navigate("https://chatgpt.com/c/second");
  const second = await startRefresh(reader);
  const duringLoad = reader.elements.get("preview").value;
  reader.pending[1](conversation("second", "Current body"));
  await second.result;
  assert.equal(duringLoad, "");
});

function setExportMarkdown(reader, markdown) {
  vm.runInContext(`state.markdown = ${JSON.stringify(markdown)}; state.fileName = "Note.md";`, reader.sandbox);
}

test("one failed image cannot block text and successful images from saving", async () => {
  const reader = popupReader({ fetch: async (url) => {
    if (url.includes("blocked")) throw new TypeError("Failed to fetch");
    return { ok: true, async blob() { return new Blob(["image"], { type: "image/png" }); } };
  } });
  const original = "Body\n![blocked](https://example.com/blocked.png)\n![ok](https://chatgpt.com/good.png)";
  setExportMarkdown(reader, original);
  const result = await reader.sandbox.buildMarkdownPackage();
  assert.equal(result.attachments.length, 1);
  assert.equal(result.failedAttachments.length, 1);
  assert.match(result.markdown, /!\[blocked\]\(https:\/\/example.com\/blocked.png\)/);
  assert.match(result.markdown, /!\[\[assets\/Note-image-02.png\]\]/);
  assert.match(result.markdown, /Body/);
});

test("when every image fails Markdown still reaches the save path with a clear status", async () => {
  const reader = popupReader({ fetch: async () => { throw new TypeError("Failed to fetch"); } });
  const original = "Body\n![photo](https://example.com/blocked.png)";
  setExportMarkdown(reader, original);
  let saved;
  reader.sandbox.saveMarkdownPackageWithDownloadsApi = async (value) => { saved = value; };
  await reader.sandbox.saveMarkdown();
  assert.equal(saved?.markdown, original);
  assert.equal(saved.attachments.length, 0);
  assert.match(reader.elements.get("status").textContent, /saved/i);
  assert.match(reader.elements.get("status").textContent, /1.*image.*link/i);
});

test("popup awaits complete collection rather than a single viewport", async () => {
  const reader = popupReader();
  reader.sandbox.__chats2obsidianExtractor = {
    extractConversation() { throw new Error("Single viewport must not be used"); },
    async extractCompleteConversation() { return conversation("first", "Full body"); },
  };
  reader.sandbox.chrome.scripting.executeScript = async ({ files, func }) => files ? [] : [{ result: await vm.runInContext(`(${func.toString()})()`, reader.sandbox) }];
  const result = await reader.sandbox.requestExtraction(7);
  assert.equal(result.ok, true);
  assert.equal(result.conversation.messages[0].text, "Full body");
});
