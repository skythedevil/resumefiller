// service_worker.js

const DEFAULT_PROFILE = {
  fullName: "",
  email: "",
  phone: "",
  designation: "",
  experience: "",
  skills: "",
  linkedin: "",
  github: "",
  customFields: {}
};

chrome.runtime.onInstalled.addListener(async () => {
  const data = await chrome.storage.local.get("resumeProfile");
  if (!data.resumeProfile) {
    await chrome.storage.local.set({ resumeProfile: DEFAULT_PROFILE });
  }
});

export async function getProfile() {
  const data = await chrome.storage.local.get("resumeProfile");
  return data.resumeProfile || { ...DEFAULT_PROFILE };
}

export async function saveProfile(profile) {
  await chrome.storage.local.set({ resumeProfile: profile });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    if (message.type === "TRIGGER_AUTOFILL") {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id != null) {
        chrome.tabs.sendMessage(tab.id, { type: "AUTOFILL_NOW" });
      }
      sendResponse({ success: true });
    }
  })();
  return true;
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command === "run-autofill") {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id != null) {
      chrome.tabs.sendMessage(tab.id, { type: "AUTOFILL_NOW" });
    }
  }
});
