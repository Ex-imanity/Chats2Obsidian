const markdownTools = window.ChatGPTObsidianMarkdown;

const state = {
  conversation: null,
  folderHandle: null,
  folderName: "",
  markdown: "",
  fileName: "chatgpt-conversation.md",
};

const DIRECTORY_HANDLE_DB = "chatgpt-to-obsidian";
const DIRECTORY_HANDLE_STORE = "handles";
const EXPORT_FOLDER_KEY = "exportFolder";
let refreshVersion = 0;

const elements = {
  status: document.getElementById("status"),
  folderName: document.getElementById("folderName"),
  chooseFolder: document.getElementById("chooseFolder"),
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
elements.chooseFolder.addEventListener("click", chooseExportFolder);
elements.download.addEventListener("click", saveMarkdown);
elements.openObsidian.addEventListener("click", openInObsidian);

["tags"].forEach((key) => {
  elements[key].addEventListener("input", () => {
    saveOptions();
    renderMarkdown();
  });
});

async function restoreOptions() {
  const values = await chrome.storage.sync.get(["folder", "selectedFolderName", "defaultTags"]);
  elements.tags.value = values.defaultTags || "ai/chatgpt";
  state.folderName = values.selectedFolderName || normalizeFolder(values.folder || "");
  state.folderHandle = await getStoredFolderHandle();
  if (state.folderHandle) {
    state.folderName = state.folderHandle.name;
    saveOptions();
  }
  renderFolderName();
}

function saveOptions() {
  chrome.storage.sync.set({
    selectedFolderName: state.folderName,
    defaultTags: elements.tags.value.trim(),
  });
}

async function chooseExportFolder() {
  if (!window.showDirectoryPicker) {
    setStatus("This browser does not support folder selection. Browser downloads will be used.");
    return null;
  }

  const handle = await window.showDirectoryPicker({
    id: "chatgpt-to-obsidian-export",
    mode: "readwrite",
  });

  state.folderHandle = handle;
  state.folderName = handle.name;
  await setStoredFolderHandle(handle);
  saveOptions();
  renderFolderName();
  setStatus(`Folder selected: ${state.folderName}.`);
  return handle;
}

async function refreshConversation() {
  const version = ++refreshVersion;
  state.conversation = null;
  state.markdown = "";
  elements.preview.value = "";
  setStatus("Reading full conversation...");
  setEnabled(false);

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !/^https:\/\/chatgpt\.com\//.test(tab.url || "")) {
      throw new Error("This tab is not a chatgpt.com conversation.");
    }

    const response = await requestExtraction(tab.id);
    if (version !== refreshVersion) return;

    if (!response || !response.ok) {
      throw new Error(response && response.error ? response.error : "Could not read the page.");
    }

    if (!response.conversation.messages || response.conversation.messages.length === 0) {
      throw new Error("No conversation messages were found on this page.");
    }

    const currentTab = await chrome.tabs.get(tab.id);
    if (version !== refreshVersion) return;
    if (conversationKey(tab.url) !== conversationKey(response.conversation.url) ||
      conversationKey(tab.url) !== conversationKey(currentTab.url)) {
      throw new Error("Conversation changed while reading. Refresh the export.");
    }

    state.conversation = response.conversation;
    renderMarkdown();
    setStatus(`Ready: ${response.conversation.messages.length} turns found.`);
    setEnabled(true);
  } catch (error) {
    if (version !== refreshVersion) return;
    state.conversation = null;
    state.markdown = "";
    elements.preview.value = "";
    setStatus(error.message || String(error));
  }
}

function conversationKey(url) {
  const parsed = new URL(url);
  const id = parsed.pathname.match(/\/c\/([^/]+)/)?.[1];
  return `${parsed.origin}${id ? `/c/${id}` : parsed.pathname}`;
}

async function requestExtraction(tabId) {
  // Reinstall the current version safely, including on tabs opened before an
  // extension update. Read it directly so stale message listeners cannot win.
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ["content.js"],
  });
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    func: async () => {
      try {
        return { ok: true, conversation: await globalThis.__chats2obsidianExtractor.extractCompleteConversation() };
      } catch (error) {
        return { ok: false, error: error.message || String(error) };
      }
    },
  });
  return results[0]?.result;
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

async function saveMarkdown() {
  if (!state.markdown) return;

  setEnabled(false);

  try {
    const markdownPackage = await saveCurrentMarkdownPackage();
    setStatus(savedPackageStatus(markdownPackage, false));
  } catch (error) {
    if (error && error.name === "AbortError") {
      setStatus("Save canceled.");
      return;
    }

    setStatus(error && error.message ? error.message : String(error));
  } finally {
    setEnabled(Boolean(state.markdown));
  }
}

async function saveCurrentMarkdownPackage() {
  const markdownPackage = await buildMarkdownPackage();

  if (window.showDirectoryPicker) {
    const directory = await getWritableFolderHandle();
    await saveMarkdownPackageWithDirectoryHandle(markdownPackage, directory);
    return markdownPackage;
  }

  await saveMarkdownPackageWithDownloadsApi(markdownPackage);
  return markdownPackage;
}

async function buildMarkdownPackage() {
  const markdown = state.markdown;
  const plan = markdownTools.createAttachmentPlan({
    markdown,
    noteFileName: state.fileName,
    attachmentsFolder: "assets",
  });

  if (plan.length === 0) {
    return {
      markdown,
      attachments: [],
      failedAttachments: [],
    };
  }

  const attachments = [];
  const failedAttachments = [];
  for (const item of plan) {
    try {
      const blob = await fetchAttachmentBlob(item.sourceUrl);
      const relativePath = replacePathExtension(item.relativePath, extensionFromMimeType(blob.type));
      attachments.push({
        ...item,
        blob,
        fileName: fileNameFromPath(relativePath),
        relativePath,
      });
    } catch (error) {
      failedAttachments.push({ sourceUrl: item.sourceUrl, error: error.message || String(error) });
    }
  }

  return {
    markdown: markdownTools.replaceMarkdownImagesWithEmbeds(markdown, attachments),
    attachments,
    failedAttachments,
  };
}

function savedPackageStatus(markdownPackage, opened) {
  const saved = markdownPackage.attachments.length;
  const failed = markdownPackage.failedAttachments?.length || 0;
  return `Saved ${state.fileName}${saved ? ` and ${saved} attachment(s)` : ""}${opened ? " and opened Obsidian" : ""}.` +
    (failed ? ` ${failed} image(s) could not be downloaded; original links were kept.` : "");
}

async function fetchAttachmentBlob(sourceUrl) {
  const response = await fetch(sourceUrl, { credentials: "include" });
  if (!response.ok) {
    throw new Error(`Could not download image attachment: ${response.status} ${response.statusText}`);
  }

  const blob = await response.blob();
  if (!blob || blob.size === 0) {
    throw new Error("Downloaded image attachment is empty.");
  }

  return blob;
}

async function saveMarkdownPackageWithDirectoryHandle(markdownPackage, directory) {
  await writeFileToDirectory(
    directory,
    state.fileName,
    new Blob([markdownPackage.markdown], { type: "text/markdown;charset=utf-8" })
  );

  for (const attachment of markdownPackage.attachments) {
    await writeFileToDirectory(directory, attachment.relativePath, attachment.blob);
  }
}

async function writeFileToDirectory(directory, relativePath, blob) {
  const segments = String(relativePath || "")
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean);
  const fileName = segments.pop();
  let currentDirectory = directory;

  for (const segment of segments) {
    currentDirectory = await currentDirectory.getDirectoryHandle(segment, { create: true });
  }

  const handle = await currentDirectory.getFileHandle(fileName, { create: true });
  const writable = await handle.createWritable();
  await writable.write(blob);
  await writable.close();
}

async function saveMarkdownPackageWithDownloadsApi(markdownPackage) {
  const folder = normalizeFolder(state.folderName);
  const markdownPath = folder ? `${folder}/${state.fileName}` : state.fileName;
  await downloadBlob(
    new Blob([markdownPackage.markdown], { type: "text/markdown;charset=utf-8" }),
    markdownPath,
    true
  );

  for (const attachment of markdownPackage.attachments) {
    const attachmentPath = folder ? `${folder}/${attachment.relativePath}` : attachment.relativePath;
    await downloadBlob(attachment.blob, attachmentPath, false);
  }
}

async function downloadBlob(blob, filename, saveAs) {
  const url = URL.createObjectURL(blob);

  try {
    await new Promise((resolve, reject) => {
      chrome.downloads.download(
        {
          url,
          filename,
          saveAs,
        },
        () => {
          const error = chrome.runtime.lastError;
          if (error) {
            reject(new Error(error.message));
            return;
          }

          resolve();
        }
      );
    });
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

async function openInObsidian() {
  if (!state.markdown) return;

  setEnabled(false);
  try {
    setStatus("Saving to Obsidian folder...");
    const markdownPackage = await saveCurrentMarkdownPackage();
    await openSavedObsidianNote();
    setStatus(savedPackageStatus(markdownPackage, true));
  } catch (error) {
    if (error && error.name === "AbortError") {
      setStatus("Open canceled.");
    } else {
      setStatus(error && error.message ? error.message : String(error));
    }
  } finally {
    setEnabled(Boolean(state.markdown));
  }
}

async function openSavedObsidianNote() {
  const file = markdownTools.buildVaultFilePath({
    folderName: state.folderName,
    fileName: state.fileName,
  });
  const url = markdownTools.buildObsidianOpenUri({
    file,
  });

  await chrome.tabs.create({ url });
}

function normalizeFolder(value) {
  return String(value || "")
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "")
    .trim();
}

async function getWritableFolderHandle() {
  if (state.folderHandle && (await verifyFolderPermission(state.folderHandle))) {
    return state.folderHandle;
  }

  const storedHandle = state.folderHandle || await getStoredFolderHandle();
  if (storedHandle && (await verifyFolderPermission(storedHandle))) {
    state.folderHandle = storedHandle;
    state.folderName = storedHandle.name;
    saveOptions();
    renderFolderName();
    return storedHandle;
  }

  return chooseExportFolder();
}

async function verifyFolderPermission(handle) {
  if (!handle) return false;
  const options = { mode: "readwrite" };
  if ((await handle.queryPermission(options)) === "granted") {
    return true;
  }

  return (await handle.requestPermission(options)) === "granted";
}

function renderFolderName() {
  elements.folderName.textContent = state.folderName || "No folder selected";
  elements.folderName.title = state.folderName || "No folder selected";
}

async function openDirectoryHandleDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DIRECTORY_HANDLE_DB, 1);

    request.onupgradeneeded = () => {
      request.result.createObjectStore(DIRECTORY_HANDLE_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getStoredFolderHandle() {
  if (!("indexedDB" in window)) return null;
  const db = await openDirectoryHandleDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(DIRECTORY_HANDLE_STORE, "readonly");
    const store = transaction.objectStore(DIRECTORY_HANDLE_STORE);
    const request = store.get(EXPORT_FOLDER_KEY);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

async function setStoredFolderHandle(handle) {
  if (!("indexedDB" in window)) return;
  const db = await openDirectoryHandleDb();
  await new Promise((resolve, reject) => {
    const transaction = db.transaction(DIRECTORY_HANDLE_STORE, "readwrite");
    transaction.objectStore(DIRECTORY_HANDLE_STORE).put(handle, EXPORT_FOLDER_KEY);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

function extensionFromMimeType(value) {
  const normalized = String(value || "").toLowerCase().split(";")[0].trim();
  const extensions = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "image/svg+xml": ".svg",
    "image/bmp": ".bmp",
    "image/avif": ".avif",
  };

  return extensions[normalized] || "";
}

function replacePathExtension(relativePath, extension) {
  if (!extension) return relativePath;
  return String(relativePath || "").replace(/\.[A-Za-z0-9]+$/, extension);
}

function fileNameFromPath(relativePath) {
  const segments = String(relativePath || "").split("/");
  return segments[segments.length - 1] || "";
}

function setStatus(message) {
  elements.status.textContent = message;
}

function setEnabled(enabled) {
  elements.download.disabled = !enabled;
  elements.openObsidian.disabled = !enabled;
}
