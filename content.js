// content.js - Resume Auto Fill v1.4.1
// This script runs on every page and fills forms when requested

(function() {
  'use strict';

  // Enable paste on all fields
  function enablePaste() {
    console.log('Resume Auto Fill: Enabling paste functionality');
    
    // Remove paste blockers
    document.addEventListener('paste', (e) => e.stopImmediatePropagation(), true);
    document.addEventListener('copy', (e) => e.stopImmediatePropagation(), true);
    document.addEventListener('cut', (e) => e.stopImmediatePropagation(), true);
    
    // Remove inline handlers
    ['onpaste', 'oncopy', 'oncut'].forEach(prop => {
      document[prop] = null;
      if (document.body) document.body[prop] = null;
    });
    
    // Enable on all inputs
    const inputs = document.querySelectorAll('input, textarea');
    inputs.forEach(input => {
      ['onpaste', 'oncopy', 'oncut'].forEach(prop => {
        input[prop] = null;
      });
      input.removeAttribute('onpaste');
      input.removeAttribute('oncopy');
      input.removeAttribute('oncut');
      input.style.webkitUserSelect = 'text';
      input.style.userSelect = 'text';
    });
  }

  // Run on page load
  enablePaste();
  
  // Run again after a delay for dynamic content
  setTimeout(enablePaste, 1000);

  let cachedProfile = null;

  // Load profile from storage
  async function loadProfile() {
return new Promise((resolve) => {
      chrome.storage.sync.get(['profiles', 'activeProfileIndex'], (result) => {
        const profiles = Array.isArray(result.profiles) ? result.profiles : [];
        const idx = Number.isInteger(result.activeProfileIndex) ? result.activeProfileIndex : 0;
        cachedProfile = profiles[idx] || null;
        console.log('Resume Auto Fill: Profile loaded', cachedProfile);
        resolve(cachedProfile);
      });
    });
  }

  // Levenshtein distance for fuzzy matching
  function levenshtein(a, b) {
    const an = a.length;
    const bn = b.length;
    if (an === 0) return bn;
    if (bn === 0) return an;

    const matrix = [];
    for (let i = 0; i <= bn; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= an; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= bn; i++) {
      for (let j = 1; j <= an; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
          );
        }
      }
    }
    return matrix[bn][an];
  }

  // Fuzzy match with threshold
  function fuzzyMatch(str1, str2, threshold = 0.7) {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();
    
    if (s1.includes(s2) || s2.includes(s1)) return true;
    
    const distance = levenshtein(s1, s2);
    const maxLen = Math.max(s1.length, s2.length);
    const similarity = 1 - (distance / maxLen);
    
    return similarity >= threshold;
  }

  // Field patterns for matching
  const FIELD_PATTERNS = {
    firstName: ['first name', 'firstname', 'fname', 'given name', 'forename', 'first'],
    middleName: ['middle name', 'middlename', 'mname', 'middle initial'],
    lastName: ['last name', 'lastname', 'lname', 'surname', 'family name', 'last'],
    fullName: ['full name', 'fullname', 'name', 'your name', 'candidate name', 'complete name'],
    email: ['email', 'e-mail', 'mail', 'email address', 'contact email'],
    phone: ['phone', 'telephone', 'mobile', 'cell', 'contact number', 'phone number'],
    alternatePhone: ['alternate phone', 'secondary phone', 'other phone', 'home phone'],
    address: ['address', 'street address', 'street', 'address line'],
    city: ['city', 'town'],
    state: ['state', 'province', 'region'],
    country: ['country', 'nation'],
    zipCode: ['zip', 'postal code', 'pin code', 'postcode', 'zip code'],
    linkedin: ['linkedin', 'linked in'],
    github: ['github', 'git hub'],
    portfolio: ['portfolio', 'website', 'personal website'],
    currentCompany: ['current company', 'employer', 'organization'],
    currentTitle: ['current title', 'position', 'job title', 'role'],
    totalExperience: ['total experience', 'years of experience', 'experience'],
    currentSalary: ['current salary', 'current ctc', 'salary'],
    expectedSalary: ['expected salary', 'desired salary', 'expected ctc'],
    noticePeriod: ['notice period', 'availability', 'joining time'],
    education: ['education', 'degree', 'qualification'],
    university: ['university', 'college', 'school'],
    graduationYear: ['graduation year', 'year of graduation'],
    skills: ['skills', 'technical skills', 'expertise'],
    summary: ['summary', 'about', 'bio', 'profile'],
    coverLetter: ['cover letter', 'letter'],
    referralSource: ['how did you hear', 'referral source', 'source'],
    gender: ['gender', 'sex'],
    nationality: ['nationality', 'citizenship'],
    workAuthorization: ['work authorization', 'work permit', 'visa status']
  };

  // Match field to profile key
  function matchesField(fieldText, patterns) {
    const text = fieldText.toLowerCase().trim();
    
    for (const [key, keywords] of Object.entries(patterns)) {
      for (const keyword of keywords) {
        if (text.includes(keyword) || fuzzyMatch(text, keyword, 0.75)) {
          return key;
        }
      }
    }
    return null;
  }

  // Trigger events for React/Vue/Angular
  function triggerEvents(element) {
    const events = ['input', 'change', 'blur', 'keyup', 'keydown'];
    
    events.forEach(eventType => {
      const event = new Event(eventType, {
        bubbles: true,
        cancelable: true
      });
      element.dispatchEvent(event);
    });

    // Special handling for React
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value'
    );
    const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      'value'
    );

    if (element.tagName === 'INPUT' && nativeInputValueSetter) {
      nativeInputValueSetter.set.call(element, element.value);
    } else if (element.tagName === 'TEXTAREA' && nativeTextAreaValueSetter) {
      nativeTextAreaValueSetter.set.call(element, element.value);
    }

    const inputEvent = new Event('input', {
      bubbles: true,
      inputType: 'insertText',
      data: element.value
    });
    element.dispatchEvent(inputEvent);
  }

  // Fill a single field
  async function fillField(element, value) {
    if (!value || value === '') return false;

    try {
      // Handle checkbox/radio
      if (element.type === 'checkbox' || element.type === 'radio') {
        element.checked = value === true || value === 'true';
        triggerEvents(element);
        return true;
      }

      // Handle select
      if (element.tagName === 'SELECT') {
        const option = Array.from(element.options).find(
          opt => opt.value.toLowerCase() === String(value).toLowerCase() ||
                 opt.text.toLowerCase() === String(value).toLowerCase()
        );
        if (option) {
          element.value = option.value;
          triggerEvents(element);
          return true;
        }
        return false;
      }

      // Handle file input (skip)
      if (element.type === 'file') {
        return false;
      }

      // Handle regular inputs
      const descriptor = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
      ) || Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype,
        'value'
      );

      if (descriptor && descriptor.set) {
        descriptor.set.call(element, String(value));
      }

      element.value = String(value);
      triggerEvents(element);
      
      return true;
    } catch (error) {
      console.error('Error filling field:', error);
      return false;
    }
  }

  // Main autofill function
  async function autoFillForm() {
    console.log('Resume Auto Fill: Starting autofill...');
    
    const profile = await loadProfile();
    if (!profile) {
      console.log('Resume Auto Fill: No profile data found');
      alert('No profile data found. Please fill in your details in the extension popup first.');
      return;
    }

    // Enable paste again
    enablePaste();

    let filled = 0;
    const selector = 'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="image"]), textarea, select';
    const fields = document.querySelectorAll(selector);

    console.log(`Resume Auto Fill: Found ${fields.length} fields`);

    for (const field of fields) {
      // Get field identifier
      const fieldText = (
        field.placeholder ||
        field.name ||
        field.id ||
        field.getAttribute('aria-label') ||
        field.getAttribute('data-automation-id') ||
        field.getAttribute('label') ||
        ''
      ).trim();

      if (!fieldText) continue;

      const matchedKey = matchesField(fieldText, FIELD_PATTERNS);
      if (matchedKey && profile[matchedKey]) {
        const success = await fillField(field, profile[matchedKey]);
        if (success) {
          filled++;
          console.log(`Resume Auto Fill: Filled ${matchedKey} in field "${fieldText}"`);
        }
      }
    }

    console.log(`Resume Auto Fill: Completed - filled ${filled} fields`);
    alert(`Auto-filled ${filled} fields successfully!`);
  }

  // Listen for messages from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'FILL_FORM') {
      console.log('Resume Auto Fill: Received fill form request');
      autoFillForm()
        .then(() => sendResponse({ success: true }))
        .catch(error => {
          console.error('Resume Auto Fill: Error', error);
          sendResponse({ success: false, error: error.message });
        });
      return true; // Keep channel open for async response
    }
  });

  console.log('Resume Auto Fill: Content script loaded');
})();
