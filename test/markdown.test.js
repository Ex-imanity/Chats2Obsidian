const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildObsidianOpenUri,
  buildObsidianNewUri,
  buildMarkdown,
  buildVaultFilePath,
  createAttachmentPlan,
  replaceMarkdownImagesWithEmbeds,
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

test("buildMarkdown preserves blank lines inside fenced code blocks", () => {
  const markdown = buildMarkdown({
    title: "Code spacing",
    messages: [
      {
        role: "assistant",
        text: "Before\n\n```js\nconst first = 1;\n\n\nconst second = 2;\n```\n\nAfter",
      },
    ],
  });

  assert.match(markdown, /const first = 1;\n\n\nconst second = 2;/);
});

test("buildMarkdown joins split unordered list markers with item text", () => {
  const markdown = buildMarkdown({
    title: "Split list",
    messages: [
      {
        role: "assistant",
        text: "它通常包含几层能力：\n\n-\n知识生成：用 LLM 自动写条目\n\n-\n结构化组织：把内容组织成层级",
      },
    ],
  });

  assert.match(markdown, /- 知识生成：用 LLM 自动写条目/);
  assert.match(markdown, /- 结构化组织：把内容组织成层级/);
  assert.doesNotMatch(markdown, /\n-\n知识生成/);
});

test("buildMarkdown removes blank lines between consecutive list items", () => {
  const markdown = buildMarkdown({
    title: "Loose list",
    messages: [
      {
        role: "assistant",
        text: "常见组件：\n\n- Redis（会话缓存）\n\n- Elasticsearch（日 志/检索）\n\n- MySQL / MongoDB（数据存储）\n\n👉 很多公司是：\n\n1. 第一步\n\n2. 第二步",
      },
    ],
  });

  assert.match(
    markdown,
    /- Redis（会话缓存）\n- Elasticsearch（日 志\/检索）\n- MySQL \/ MongoDB（数据存储）/
  );
  assert.match(markdown, /MySQL \/ MongoDB（数据存储）\n\n👉 很多公司是：/);
  assert.match(markdown, /1\. 第一步\n2\. 第二步/);
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

test("buildObsidianNewUri percent-encodes spaces instead of plus signs", () => {
  const uri = buildObsidianNewUri({
    vault: "ChatGPT Notes",
    name: "AIChatGPT/一、Karpathy 这个 llm-wiki 到底在讲什么？",
    content: "# 一、Karpathy 这个 llm-wiki 到底在讲什么？\n\n> [!info] Source\n> Exported from ChatGPT.\n\n## User",
  });

  assert.equal(uri.includes("+"), false);
  assert.match(uri, /^obsidian:\/\/new\?/);
  assert.match(uri, /vault=ChatGPT%20Notes/);
  assert.match(uri, /name=AIChatGPT%2F/);
  assert.match(uri, /content=%23%20/);
});

test("buildObsidianOpenUri opens an existing note by vault and file path", () => {
  const uri = buildObsidianOpenUri({
    vault: "ChatGPT Notes",
    file: "AIChatGPT/一、目标接口地址不可达（最常见）.md",
  });

  assert.equal(uri.includes("+"), false);
  assert.equal(
    uri,
    "obsidian://open?vault=ChatGPT%20Notes&file=AIChatGPT%2F%E4%B8%80%E3%80%81%E7%9B%AE%E6%A0%87%E6%8E%A5%E5%8F%A3%E5%9C%B0%E5%9D%80%E4%B8%8D%E5%8F%AF%E8%BE%BE%EF%BC%88%E6%9C%80%E5%B8%B8%E8%A7%81%EF%BC%89.md"
  );
});

test("buildVaultFilePath uses selected folder display name for Obsidian open", () => {
  assert.equal(
    buildVaultFilePath({ folderName: "AIChatGPT", fileName: "一、目标接口地址不可达（最常见）.md" }),
    "AIChatGPT/一、目标接口地址不可达（最常见）.md"
  );
  assert.equal(
    buildVaultFilePath({ folderName: "", fileName: "Welcome.md" }),
    "Welcome.md"
  );
});

test("createAttachmentPlan finds remote markdown images with stable local names", () => {
  const plan = createAttachmentPlan({
    markdown:
      "Before\n\n![已上传的图片](https://chatgpt.com/backend-api/estuary/content?id=file_123&sig=abc)\n\n![外部图](https://example.com/a/photo.jpg)\n\n![[assets/existing.png]]",
    noteFileName: "一、目标接口地址不可达（最常见）.md",
    attachmentsFolder: "assets",
  });

  assert.deepEqual(
    plan.map((item) => ({
      alt: item.alt,
      sourceUrl: item.sourceUrl,
      relativePath: item.relativePath,
    })),
    [
      {
        alt: "已上传的图片",
        sourceUrl: "https://chatgpt.com/backend-api/estuary/content?id=file_123&sig=abc",
        relativePath: "assets/一、目标接口地址不可达（最常见）-image-01.png",
      },
      {
        alt: "外部图",
        sourceUrl: "https://example.com/a/photo.jpg",
        relativePath: "assets/一、目标接口地址不可达（最常见）-image-02.jpg",
      },
    ]
  );
});

test("replaceMarkdownImagesWithEmbeds rewrites planned images as Obsidian embeds", () => {
  const markdown =
    "![已上传的图片](https://chatgpt.com/backend-api/estuary/content?id=file_123)\n\n![外部图](https://example.com/photo.jpg)";
  const plan = createAttachmentPlan({
    markdown,
    noteFileName: "HTTP 报错.md",
    attachmentsFolder: "assets",
  });

  const rewritten = replaceMarkdownImagesWithEmbeds(markdown, plan);

  assert.equal(
    rewritten,
    "![[assets/HTTP 报错-image-01.png]]\n\n![[assets/HTTP 报错-image-02.jpg]]"
  );
});
