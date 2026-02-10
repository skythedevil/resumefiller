// popup.js

function $(id) {
  return document.getElementById(id);
}

let currentProfile = null;

async function loadProfile() {
  return new Promise((resolve) => {
    chrome.storage.local.get("resumeProfile", (data) => {
      currentProfile = data.resumeProfile || {
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
      resolve(currentProfile);
    });
  });
}

function renderProfile(profile) {
  $("fullName").value = profile.fullName || "";
  $("email").value = profile.email || "";
  $("phone").value = profile.phone || "";
  $("designation").value = profile.designation || "";
  $("experience").value = profile.experience || "";
  $("skills").value = profile.skills || "";
  $("linkedin").value = profile.linkedin || "";
  $("github").value = profile.github || "";

  renderCustomFields(profile.customFields || {});
}

function renderCustomFields(customFields) {
  const container = $("customFieldsContainer");
  container.innerHTML = "";

  Object.entries(customFields).forEach(([key, value]) => {
    const row = document.createElement("div");
    row.className = "custom-field-row";

    const keyInput = document.createElement("input");
    keyInput.type = "text";
    keyInput.value = key;
    keyInput.dataset.originalKey = key;

    const valueInput = document.createElement("input");
    valueInput.type = "text";
    valueInput.value = value;

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "X";

    deleteBtn.addEventListener("click", () => {
      delete currentProfile.customFields[keyInput.dataset.originalKey];
      row.remove();
      saveProfileToStorage();
    });

    keyInput.addEventListener("change", () => {
      const oldKey = keyInput.dataset.originalKey;
      const newKey = keyInput.value.trim();
      if (!newKey) return;

      if (oldKey !== newKey) {
        currentProfile.customFields[newKey] = currentProfile.customFields[oldKey];
        delete currentProfile.customFields[oldKey];
        keyInput.dataset.originalKey = newKey;
        saveProfileToStorage();
      }
    });

    valueInput.addEventListener("change", () => {
      currentProfile.customFields[keyInput.dataset.originalKey] = valueInput.value;
      saveProfileToStorage();
    });

    row.appendChild(keyInput);
    row.appendChild(valueInput);
    row.appendChild(deleteBtn);
    container.appendChild(row);
  });
}

async function saveProfileToStorage() {
  currentProfile.fullName = $("fullName").value.trim();
  currentProfile.email = $("email").value.trim();
  currentProfile.phone = $("phone").value.trim();
  currentProfile.designation = $("designation").value.trim();
  currentProfile.experience = $("experience").value.trim();
  currentProfile.skills = $("skills").value.trim();
  currentProfile.linkedin = $("linkedin").value.trim();
  currentProfile.github = $("github").value.trim();

  await chrome.storage.local.set({ resumeProfile: currentProfile });
}

function addCustomField() {
  const key = $("newCustomKey").value.trim();
  const value = $("newCustomValue").value.trim();
  if (!key) return;

  if (!currentProfile.customFields) currentProfile.customFields = {};
  currentProfile.customFields[key] = value;

  $("newCustomKey").value = "";
  $("newCustomValue").value = "";
  renderCustomFields(currentProfile.customFields);
  saveProfileToStorage();
}

async function triggerAutofill() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id != null) {
    chrome.tabs.sendMessage(tab.id, { type: "AUTOFILL_NOW" });
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const profile = await loadProfile();
  renderProfile(profile);

  $("saveProfileBtn").addEventListener("click", saveProfileToStorage);
  $("addCustomFieldBtn").addEventListener("click", addCustomField);
  $("autofillBtn").addEventListener("click", triggerAutofill);
});
