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
  // Personal Details
  fullName: ["name", "full name", "candidate name", "your name"],
  email: ["email", "e-mail", "mail", "email address"],
  phone: ["phone", "mobile", "contact number", "telephone", "phone number"],
  city: ["city", "town"],
  state: ["state", "province", "region"],
  country: ["country", "nation"],
  zipCode: ["zip", "postal code", "pin code", "postcode", "zip code"],
  linkedin: ["linkedin", "linked in", "linkedin profile"],
  github: ["github", "git hub"],
  portfolio: ["portfolio", "website", "personal website", "web site"],
  
  // Professional Summary
  summary: ["summary", "professional summary", "about", "profile summary", "overview"],
  
  // Work Experience
  designation: ["designation", "title", "job title", "current role", "position"],
  currentCompany: ["current company", "company", "employer", "organization", "current employer"],
  experience: ["experience", "total experience", "work experience", "years of experience"],
  relevantExperience: ["relevant experience", "related experience"],
  responsibilities: ["responsibilities", "duties", "job responsibilities", "key responsibilities"],
  achievements: ["achievements", "accomplishments", "key achievements"],
  
  // Education
  degree: ["degree", "education", "qualification", "highest degree"],
  specialization: ["specialization", "major", "field of study", "stream"],
  institution: ["institution", "university", "college", "school"],
  graduationYear: ["graduation year", "year of graduation", "passing year", "completion year"],
  
  // Skills
  skills: ["skills", "skillset", "key skills", "technical skills"],
  tools: ["tools", "technologies", "software", "tech stack"],
  certifications: ["certifications", "certificates", "certified"],
  languages: ["languages", "language proficiency"],
  
  // Job Application Specific
  currentCTC: ["current ctc", "current salary", "current compensation", "present salary"],
  expectedCTC: ["expected ctc", "expected salary", "salary expectation", "desired salary"],
  noticePeriod: ["notice period", "notice", "availability", "joining time"],
  preferredLocations: ["preferred location", "location preference", "preferred locations"],
  workAuthorization: ["work authorization", "visa status", "work permit"],
  willingToRelocate: ["willing to relocate", "relocate", "relocation"],
  willingToTravel: ["willing to travel", "travel", "travel percentage"],
  
  // Additional Info
  dateOfBirth: ["date of birth", "dob", "birth date"],
  gender: ["gender", "sex"],
  nationality: ["nationality", "citizenship"]
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

  // Exact matching
  for (const [key, patterns] of Object.entries(FIELD_PATTERNS)) {
    for (const p of patterns) {
      if (haystack.includes(normalize(p))) {
        return key;
      }
    }
  }

  // Fuzzy matching
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

  // Custom fields matching
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

  const allFields = document.querySelectorAll("input, textarea, select");
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
