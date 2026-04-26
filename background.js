chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.sync.get(["defaultTags", "folder"]);
  const defaults = {};

  if (!existing.defaultTags) {
    defaults.defaultTags = "ai/chatgpt";
  }

  if (!existing.folder) {
    defaults.folder = "AI/ChatGPT";
  }

  if (Object.keys(defaults).length > 0) {
    chrome.storage.sync.set(defaults);
  }
});
