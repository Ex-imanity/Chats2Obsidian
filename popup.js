const markdownTools = window.ChatGPTObsidianMarkdown;

const state = {
  conversation: null,
  markdown: "",
  fileName: "chatgpt-conversation.md",
};

const elements = {
  status: document.getElementById("status"),
  vault: document.getElementById("vault"),
  folder: document.getElementById("folder"),
  tags: document.getElementById("tags"),
  preview: document.getElementById("preview"),
  refresh: document.getElementById("refresh"),
  download: document.getElementById("download"),
  openObsidian: document.getElementById("openObsidian"),
};

document.addEventListener("DOMContentLoaded", async () => {
  await restoreOptions();
  await refreshConversation();
});

elements.refresh.addEventListener("click", refreshConversation);
elements.download.addEventListener("click", downloadMarkdown);
elements.openObsidian.addEventListener("click", openInObsidian);

["vault", "folder", "tags"].forEach((key) => {
  elements[key].addEventListener("input", () => {
    saveOptions();
    renderMarkdown();
  });
});

async function restoreOptions() {
  const values = await chrome.storage.sync.get(["vault", "folder", "defaultTags"]);
  elements.vault.value = values.vault || "";
  elements.folder.value = values.folder || "AI/ChatGPT";
  elements.tags.value = values.defaultTags || "ai/chatgpt";
}

function saveOptions() {
  chrome.storage.sync.set({
    vault: elements.vault.value.trim(),
    folder: elements.folder.value.trim(),
    defaultTags: elements.tags.value.trim(),
  });
}

async function refreshConversation() {
  setStatus("Reading current tab...");
  setEnabled(false);

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !/^https:\/\/chatgpt\.com\//.test(tab.url || "")) {
      throw new Error("This tab is not a chatgpt.com conversation.");
    }

    const response = await requestExtraction(tab.id);

    if (!response || !response.ok) {
      throw new Error(response && response.error ? response.error : "Could not read the page.");
    }

    if (!response.conversation.messages || response.conversation.messages.length === 0) {
      throw new Error("No conversation messages were found on this page.");
    }

    state.conversation = response.conversation;
    renderMarkdown();
    setStatus(`Ready: ${response.conversation.messages.length} turns found.`);
    setEnabled(true);
  } catch (error) {
    state.conversation = null;
    state.markdown = "";
    elements.preview.value = "";
    setStatus(error.message || String(error));
  }
}

async function requestExtraction(tabId) {
  try {
    return await chrome.tabs.sendMessage(tabId, {
      type: "CHATGPT_TO_OBSIDIAN_EXTRACT",
    });
  } catch (_error) {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content.js"],
    });

    return chrome.tabs.sendMessage(tabId, {
      type: "CHATGPT_TO_OBSIDIAN_EXTRACT",
    });
  }
}

function renderMarkdown() {
  if (!state.conversation) return;

  const title = state.conversation.title || "ChatGPT Conversation";
  const tags = elements.tags.value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  state.markdown = markdownTools.buildMarkdown({
    ...state.conversation,
    tags,
  });
  state.fileName = markdownTools.sanitizeFileName(title);
  elements.preview.value = state.markdown;
}

function downloadMarkdown() {
  if (!state.markdown) return;

  const blob = new Blob([state.markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const folder = normalizeFolder(elements.folder.value);
  const filename = folder ? `${folder}/${state.fileName}` : state.fileName;

  chrome.downloads.download(
    {
      url,
      filename,
      saveAs: true,
    },
    () => {
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  );
}

function openInObsidian() {
  if (!state.markdown) return;

  const vault = elements.vault.value.trim();
  const folder = normalizeFolder(elements.folder.value);
  const name = folder ? `${folder}/${state.fileName.replace(/\.md$/i, "")}` : state.fileName.replace(/\.md$/i, "");
  const params = new URLSearchParams({
    name,
    content: state.markdown,
  });

  if (vault) {
    params.set("vault", vault);
  }

  chrome.tabs.create({ url: `obsidian://new?${params.toString()}` });
}

function normalizeFolder(value) {
  return String(value || "")
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "")
    .trim();
}

function setStatus(message) {
  elements.status.textContent = message;
}

function setEnabled(enabled) {
  elements.download.disabled = !enabled;
  elements.openObsidian.disabled = !enabled;
}
