chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(["profiles", "activeProfileIndex", "shortcutKey"], (data) => {
    const defaults = {
      profiles: [],
      activeProfileIndex: 0,
      shortcutKey: "R"
    };

    const merged = { ...defaults, ...data };
    chrome.storage.sync.set(merged);
  });
});

// Listen to keyboard command
chrome.commands.onCommand.addListener((command) => {
  if (command === "trigger-autofill") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab?.id) return;

      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"]
      });
    });
  }
});
