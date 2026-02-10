// content.js

let cachedProfile = null;

async function loadProfile() {
  return new Promise((resolve) => {
    chrome.storage.local.get("resumeProfile", (data) => {
      cachedProfile = data.resumeProfile || null;
      resolve(cachedProfile);
    });
  });
}

const FIELD_PATTERNS = {
  fullName: ["name", "full name", "candidate name"],
  email: ["email", "e-mail"],
  phone: ["phone", "mobile", "contact number"],
  designation: ["designation", "title", "current role", "job title"],
  experience: ["experience", "total experience", "work experience"],
  skills: ["skills", "skillset"],
  linkedin: ["linkedin", "linked in profile"],
  github: ["github", "git hub"]
};

function normalize(str) {
  return (str || "")
    .toString()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function editDistance(s1, s2) {
  s1 = s1 || "";
  s2 = s2 || "";
  s1 = s1.toLowerCase();
  s2 = s2.toLowerCase();

  const costs = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}

function similarity(s1, s2) {
  const longer = s1.length >= s2.length ? s1 : s2;
  const shorter = s1.length < s2.length ? s1 : s2;
  const longerLength = longer.length;
  if (longerLength === 0) return 1.0;
  return (longerLength - editDistance(longer, shorter)) / parseFloat(longerLength);
}

function detectFieldKey(input, profile) {
  const attrCandidates = [
    input.name,
    input.id,
    input.placeholder,
    input.getAttribute("aria-label"),
    input.getAttribute("data-testid"),
    input.getAttribute("data-field-name")
  ];

  const label = document.querySelector(`label[for="${input.id}"]`);
  if (label) {
    attrCandidates.push(label.innerText);
  }

  const haystack = normalize(attrCandidates.join(" "));
  if (!haystack) return null;

  for (const [key, patterns] of Object.entries(FIELD_PATTERNS)) {
    for (const p of patterns) {
      if (haystack.includes(normalize(p))) {
        return key;
      }
    }
  }

  const FUZZY_THRESHOLD = 0.65;
  let bestKey = null;
  let bestScore = 0;

  for (const [key, patterns] of Object.entries(FIELD_PATTERNS)) {
    for (const p of patterns) {
      const score = similarity(haystack, normalize(p));
      if (score > bestScore) {
        bestScore = score;
        bestKey = key;
      }
    }
  }

  if (bestKey && bestScore >= FUZZY_THRESHOLD) {
    return bestKey;
  }

  if (profile && profile.customFields) {
    for (const customKey of Object.keys(profile.customFields)) {
      const normKey = normalize(customKey);
      if (haystack.includes(normKey)) {
        return { type: "custom", key: customKey };
      }
    }

    let bestCustom = null;
    let bestCustomScore = 0;
    for (const customKey of Object.keys(profile.customFields)) {
      const score = similarity(haystack, normalize(customKey));
      if (score > bestCustomScore) {
        bestCustomScore = score;
        bestCustom = customKey;
      }
    }
    if (bestCustom && bestCustomScore >= FUZZY_THRESHOLD) {
      return { type: "custom", key: bestCustom };
    }
  }

  return null;
}

function autofillForm(profile) {
  if (!profile) return;

  const allFields = document.querySelectorAll("input, textarea");

  allFields.forEach((input) => {
    const type = (input.type || "").toLowerCase();

    if (["password", "checkbox", "radio", "file", "hidden", "submit", "button"].includes(type)) {
      return;
    }

    const detected = detectFieldKey(input, profile);
    if (!detected) return;

    let valueToSet = "";

    if (typeof detected === "string") {
      valueToSet = profile[detected] || "";
    } else if (detected.type === "custom") {
      valueToSet = profile.customFields[detected.key] || "";
    }

    if (valueToSet) {
      input.value = valueToSet;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  const profile = await loadProfile();
  autofillForm(profile);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "AUTOFILL_NOW") {
    (async () => {
      if (!cachedProfile) {
        await loadProfile();
      }
      autofillForm(cachedProfile);
      sendResponse({ success: true });
    })();
    return true;
  }
});
