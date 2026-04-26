const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildMarkdown,
  sanitizeFileName,
  normalizeTags,
} = require("../src/markdown.js");

test("buildMarkdown creates Obsidian frontmatter and role sections", () => {
  const markdown = buildMarkdown({
    title: 'Research: "Obsidian" export',
    url: "https://chatgpt.com/c/example",
    createdAt: "2026-04-26T14:30:00.000Z",
    tags: ["ai/chatgpt", "research notes"],
    messages: [
      { role: "user", text: "Can you keep code fences?\n\n```js\nconsole.log(1);\n```" },
      { role: "assistant", text: "Yes.\n\n- Item one\n- Item two" },
    ],
  });

  assert.match(markdown, /^---\ntitle: "Research: \\"Obsidian\\" export"/);
  assert.match(markdown, /source: chatgpt/);
  assert.match(markdown, /chat_url: "https:\/\/chatgpt\.com\/c\/example"/);
  assert.match(markdown, /tags:\n  - ai\/chatgpt\n  - research-notes/);
  assert.match(markdown, /> \[!info\] Source\n> Exported from \[ChatGPT\]/);
  assert.match(markdown, /## User\n\nCan you keep code fences\?/);
  assert.match(markdown, /```js\nconsole\.log\(1\);\n```/);
  assert.match(markdown, /## Assistant\n\nYes\./);
});

test("buildMarkdown skips empty messages and labels unknown roles as Note", () => {
  const markdown = buildMarkdown({
    title: "Empty turns",
    messages: [
      { role: "user", text: "   " },
      { role: "tool", text: "A tool result" },
    ],
  });

  assert.doesNotMatch(markdown, /## User/);
  assert.match(markdown, /## Note\n\nA tool result/);
});

test("sanitizeFileName removes reserved characters and limits length", () => {
  assert.equal(sanitizeFileName("A <bad> file:name?.md"), "A bad filename.md");
  assert.equal(sanitizeFileName("   "), "chatgpt-conversation.md");
  assert.ok(sanitizeFileName("x".repeat(200)).length <= 96);
});

test("normalizeTags creates Obsidian-safe tags with default fallback", () => {
  assert.deepEqual(normalizeTags(["AI ChatGPT", "#daily/log", "", "bad tag!"]), [
    "AI-ChatGPT",
    "daily/log",
    "bad-tag",
  ]);
  assert.deepEqual(normalizeTags([]), ["ai/chatgpt"]);
});
