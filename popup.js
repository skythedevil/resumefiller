// popup.js - Resume Auto Fill v2.0.1

const MAX_PROFILES = 5;

// Keys that are commonly used by Chrome/Windows - we block these
const DISALLOWED_KEYS = new Set([
  "T", "N", "W", "Q", "L", "P", "B", "J", "H", "M", "ESC", "F", "TAB"
]);

let profiles = [];
let activeProfileIndex = 0;
let shortcutKey = "R";

document.addEventListener("DOMContentLoaded", () => {
  init();
});

function init() {
  // Get all DOM elements
  const profileSelect = document.getElementById("profileSelect");
  const addProfileBtn = document.getElementById("addProfileBtn");
  const deleteProfileBtn = document.getElementById("deleteProfileBtn");
  const saveProfileBtn = document.getElementById("saveProfileBtn");
  const autoFillBtn = document.getElementById("autoFillBtn");
  const addCustomFieldBtn = document.getElementById("addCustomFieldBtn");
  const addBasicFieldBtn = document.getElementById("addBasicFieldBtn");
  const shortcutKeyInput = document.getElementById("shortcutKeyInput");
  const saveShortcutBtn = document.getElementById("saveShortcutBtn");
  const exportExcelBtn = document.getElementById("exportExcelBtn");
  const resumeFile = document.getElementById("resumeFile");
  const coverLetterFile = document.getElementById("coverLetterFile");

  // Load from storage
  chrome.storage.sync.get(
    ["profiles", "activeProfileIndex", "shortcutKey"],
    (data) => {
      profiles = Array.isArray(data.profiles) ? data.profiles : [];
      activeProfileIndex = Number.isInteger(data.activeProfileIndex)
        ? data.activeProfileIndex
        : 0;
      shortcutKey = (data.shortcutKey || "R").toUpperCase();

      if (profiles.length === 0) {
        profiles.push(createEmptyProfile("Profile 1"));
        activeProfileIndex = 0;
      }

      renderProfileOptions(profileSelect);
      shortcutKeyInput.value = shortcutKey;
      loadProfileToForm(profiles[activeProfileIndex]);

      // Profile selection change
      profileSelect.addEventListener("change", () => {
        activeProfileIndex = parseInt(profileSelect.value, 10);
        loadProfileToForm(profiles[activeProfileIndex]);
        chrome.storage.sync.set({ activeProfileIndex });
      });

      // Add new profile
      addProfileBtn.addEventListener("click", () => {
        if (profiles.length >= MAX_PROFILES) {
          alert(`You can only create up to ${MAX_PROFILES} profiles.`);
          return;
        }
        const name = prompt("Enter profile name:", `Profile ${profiles.length + 1}`);
        if (!name) return;
        profiles.push(createEmptyProfile(name));
        activeProfileIndex = profiles.length - 1;
        renderProfileOptions(profileSelect);
        profileSelect.value = String(activeProfileIndex);
        loadProfileToForm(profiles[activeProfileIndex]);
        saveProfiles();
      });

      // Delete current profile
      deleteProfileBtn.addEventListener("click", () => {
        if (profiles.length <= 1) {
          alert("At least one profile is required.");
          return;
        }
        if (!confirm("Delete current profile?")) return;

        profiles.splice(activeProfileIndex, 1);
        if (activeProfileIndex >= profiles.length) {
          activeProfileIndex = profiles.length - 1;
        }
        renderProfileOptions(profileSelect);
        profileSelect.value = String(activeProfileIndex);
        loadProfileToForm(profiles[activeProfileIndex]);
        saveProfiles();
      });

      // Save profile
      saveProfileBtn.addEventListener("click", () => {
        saveFormToCurrentProfile();
        saveProfiles();
        alert("Profile saved successfully!");
      });

      // Auto fill current page
      autoFillBtn.addEventListener("click", () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          const tab = tabs[0];
          if (!tab?.id) return;

          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ["content.js"]
          });
        });
      });

      // Add custom field
      addCustomFieldBtn.addEventListener("click", () => {
        const keyInput = document.getElementById("customKey");
        const valueInput = document.getElementById("customValue");
        const key = keyInput.value.trim();
        const value = valueInput.value.trim();
        if (!key) {
          alert("Custom field key is required.");
          return;
        }
        const profile = profiles[activeProfileIndex];
        profile.customFields.push({ key, value });
        renderCustomFields(profile.customFields);
        keyInput.value = "";
        valueInput.value = "";
      });

      // Add basic field dynamically
      addBasicFieldBtn.addEventListener("click", () => {
        const labelInput = document.getElementById("newFieldLabel");
        const label = labelInput.value.trim();
        if (!label) {
          alert("Field label is required.");
          return;
        }
        const profile = profiles[activeProfileIndex];
        if (!profile.basicFields) {
          profile.basicFields = [];
        }
        profile.basicFields.push({ label, value: "" });
        renderBasicFields(profile.basicFields);
        labelInput.value = "";
      });

      // Shortcut key input restriction
      shortcutKeyInput.addEventListener("input", () => {
        const val = shortcutKeyInput.value.toUpperCase().slice(0, 1);
        shortcutKeyInput.value = val;
      });

      // Save shortcut key
      saveShortcutBtn.addEventListener("click", () => {
        const val = shortcutKeyInput.value.toUpperCase();
        if (!val.match(/[A-Z0-9]/)) {
          alert("Shortcut key must be a letter or number.");
          shortcutKeyInput.value = shortcutKey;
          return;
        }

        if (DISALLOWED_KEYS.has(val)) {
          alert("This key is commonly used by Chrome or Windows. Please pick another key.");
          shortcutKeyInput.value = shortcutKey;
          return;
        }

        shortcutKey = val;
        chrome.storage.sync.set({ shortcutKey }, () => {
          alert(
            `Saved shortcut key as Ctrl+Shift+${shortcutKey}.\n` +
            `Now open chrome://extensions/shortcuts and set the same key for "Trigger resume autofill".`
          );
        });
      });

      // Export to Excel
      exportExcelBtn.addEventListener("click", () => {
        exportToExcel();
      });

      // File upload handlers
      resumeFile.addEventListener("change", (e) => {
        handleFileUpload(e, "resume");
      });

      coverLetterFile.addEventListener("change", (e) => {
        handleFileUpload(e, "coverLetter");
      });
    }
  );
}

function createEmptyProfile(name) {
  return {
    name,
    fullName: "",
    email: "",
    phone: "",
    designation: "",
    experience: "",
    skills: "",
    linkedin: "",
    github: "",
    customFields: [],
    basicFields: [],
    resumeFile: null,
    coverLetterFile: null
  };
}

function renderProfileOptions(selectEl) {
  selectEl.innerHTML = "";
  profiles.forEach((p, idx) => {
    const option = document.createElement("option");
    option.value = String(idx);
    option.textContent = p.name || `Profile ${idx + 1}`;
    selectEl.appendChild(option);
  });
  selectEl.value = String(activeProfileIndex);
}

function loadProfileToForm(profile) {
  document.getElementById("fullName").value = profile.fullName || "";
  document.getElementById("email").value = profile.email || "";
  document.getElementById("phone").value = profile.phone || "";
  document.getElementById("designation").value = profile.designation || "";
  document.getElementById("experience").value = profile.experience || "";
  document.getElementById("skills").value = profile.skills || "";
  document.getElementById("linkedin").value = profile.linkedin || "";
  document.getElementById("github").value = profile.github || "";

  renderCustomFields(profile.customFields || []);
  renderBasicFields(profile.basicFields || []);
  
  // Update file names
  updateFileName("resumeFileName", profile.resumeFile);
  updateFileName("coverLetterFileName", profile.coverLetterFile);
}

function saveFormToCurrentProfile() {
  const profile = profiles[activeProfileIndex];
  profile.fullName = document.getElementById("fullName").value.trim();
  profile.email = document.getElementById("email").value.trim();
  profile.phone = document.getElementById("phone").value.trim();
  profile.designation = document.getElementById("designation").value.trim();
  profile.experience = document.getElementById("experience").value.trim();
  profile.skills = document.getElementById("skills").value.trim();
  profile.linkedin = document.getElementById("linkedin").value.trim();
  profile.github = document.getElementById("github").value.trim();

  // Read custom fields from DOM
  const customRows = document.querySelectorAll(".custom-field-row");
  profile.customFields = [];
  customRows.forEach((row) => {
    const keyInput = row.querySelector(".custom-key");
    const valueInput = row.querySelector(".custom-value");
    const key = keyInput.value.trim();
    const value = valueInput.value.trim();
    if (key) {
      profile.customFields.push({ key, value });
    }
  });

  // Read basic fields from DOM
  const basicRows = document.querySelectorAll(".basic-field-row");
  profile.basicFields = [];
  basicRows.forEach((row) => {
    const labelInput = row.querySelector(".basic-label");
    const valueInput = row.querySelector(".basic-value");
    const label = labelInput.value.trim();
    const value = valueInput.value.trim();
    if (label) {
      profile.basicFields.push({ label, value });
    }
  });
}

function renderCustomFields(customFields) {
  const container = document.getElementById("customFieldsContainer");
  container.innerHTML = "";

  customFields.forEach((field, index) => {
    const row = document.createElement("div");
    row.className = "custom-field-row";

    const keyInput = document.createElement("input");
    keyInput.type = "text";
    keyInput.className = "custom-key";
    keyInput.placeholder = "Key";
    keyInput.value = field.key || "";

    const valueInput = document.createElement("input");
    valueInput.type = "text";
    valueInput.className = "custom-value";
    valueInput.placeholder = "Value";
    valueInput.value = field.value || "";

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "×";
    deleteBtn.addEventListener("click", () => {
      const profile = profiles[activeProfileIndex];
      profile.customFields.splice(index, 1);
      renderCustomFields(profile.customFields);
    });

    row.appendChild(keyInput);
    row.appendChild(valueInput);
    row.appendChild(deleteBtn);
    container.appendChild(row);
  });
}

function renderBasicFields(basicFields) {
  const container = document.getElementById("basicFieldsContainer");
  container.innerHTML = "";

  basicFields.forEach((field, index) => {
    const row = document.createElement("div");
    row.className = "basic-field-row";

    const labelInput = document.createElement("input");
    labelInput.type = "text";
    labelInput.className = "basic-label";
    labelInput.placeholder = "Label";
    labelInput.value = field.label || "";

    const valueInput = document.createElement("input");
    valueInput.type = "text";
    valueInput.className = "basic-value";
    valueInput.placeholder = "Value";
    valueInput.value = field.value || "";

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "×";
    deleteBtn.addEventListener("click", () => {
      const profile = profiles[activeProfileIndex];
      profile.basicFields.splice(index, 1);
      renderBasicFields(profile.basicFields);
    });

    row.appendChild(labelInput);
    row.appendChild(valueInput);
    row.appendChild(deleteBtn);
    container.appendChild(row);
  });
}

function saveProfiles() {
  chrome.storage.sync.set({ profiles, activeProfileIndex });
}

function handleFileUpload(event, fileType) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const profile = profiles[activeProfileIndex];
    profile[fileType + "File"] = {
      name: file.name,
      type: file.type,
      data: e.target.result
    };
    updateFileName(fileType + "FileName", profile[fileType + "File"]);
  };
  reader.readAsDataURL(file);
}

function updateFileName(elementId, fileData) {
  const element = document.getElementById(elementId);
  if (fileData && fileData.name) {
    element.textContent = fileData.name;
  } else {
    element.textContent = "";
  }
}

function exportToExcel() {
  // Load SheetJS library from CDN
  if (typeof XLSX === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js';
    script.onload = () => performExport();
    document.head.appendChild(script);
  } else {
    performExport();
  }
}

function performExport() {
  const profile = profiles[activeProfileIndex];
  
  const data = [
    ["Field", "Value"],
    ["Full Name", profile.fullName],
    ["Email", profile.email],
    ["Phone", profile.phone],
    ["Designation", profile.designation],
    ["Experience", profile.experience],
    ["Skills", profile.skills],
    ["LinkedIn", profile.linkedin],
    ["GitHub", profile.github]
  ];

  // Add basic fields
  if (profile.basicFields && profile.basicFields.length > 0) {
    profile.basicFields.forEach(field => {
      data.push([field.label, field.value]);
    });
  }

  // Add custom fields
  if (profile.customFields && profile.customFields.length > 0) {
    profile.customFields.forEach(field => {
      data.push([field.key, field.value]);
    });
  }

  const worksheet = XLSX.utils.aoa_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Resume Data");
  
  const fileName = `${profile.name || 'Profile'}_Resume.xlsx`;
  XLSX.writeFile(workbook, fileName);
}
