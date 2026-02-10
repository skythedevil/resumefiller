// popup.js - Resume Auto Fill v1.4.1

const FIELDS = [
  'firstName', 'middleName', 'lastName', 'fullName',
  'email', 'phone', 'alternatePhone', 'address',
  'city', 'state', 'country', 'zipCode',
  'linkedin', 'github', 'portfolio',
  'currentCompany', 'currentTitle', 'totalExperience',
  'currentSalary', 'expectedSalary', 'noticePeriod',
  'education', 'university', 'graduationYear',
  'skills', 'summary', 'coverLetter', 'referralSource',
  'gender', 'nationality', 'workAuthorization',
  'remoteWork', 'relocation', 'veteran', 'disability'
];

// Load profile data from storage
function loadProfile() {
  chrome.storage.local.get('resumeProfile', (result) => {
    if (result.resumeProfile) {
      const profile = result.resumeProfile;
      FIELDS.forEach(fieldId => {
        const element = document.getElementById(fieldId);
        if (element) {
          if (element.type === 'checkbox') {
            element.checked = profile[fieldId] === true || profile[fieldId] === 'true';
          } else {
            element.value = profile[fieldId] || '';
          }
        }
      });
      console.log('Profile loaded successfully');
    }
  });
}

// Save profile data to storage
function saveProfile() {
  const profile = {};
  FIELDS.forEach(fieldId => {
    const element = document.getElementById(fieldId);
    if (element) {
      if (element.type === 'checkbox') {
        profile[fieldId] = element.checked;
      } else {
        profile[fieldId] = element.value;
      }
    }
  });
  
  chrome.storage.local.set({ resumeProfile: profile }, () => {
    console.log('Profile saved');
  });
}

// Export as JSON
function exportJSON() {
  const profile = {};
  FIELDS.forEach(fieldId => {
    const element = document.getElementById(fieldId);
    if (element) {
      if (element.type === 'checkbox') {
        profile[fieldId] = element.checked;
      } else {
        profile[fieldId] = element.value;
      }
    }
  });
  
  const dataStr = JSON.stringify(profile, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `resume_profile_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// Export as CSV
function exportCSV() {
  const profile = {};
  FIELDS.forEach(fieldId => {
    const element = document.getElementById(fieldId);
    if (element) {
      if (element.type === 'checkbox') {
        profile[fieldId] = element.checked;
      } else {
        profile[fieldId] = element.value;
      }
    }
  });
  
  let csv = 'Field,Value\n';
  Object.entries(profile).forEach(([key, value]) => {
    const escapedValue = String(value || '').replace(/"/g, '""');
    csv += `"${key}","${escapedValue}"\n`;
  });
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `resume_profile_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// Import data from file
function importData() {
  document.getElementById('fileInput').click();
}

// Handle file import
function handleFileImport(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const content = e.target.result;
      let profile = {};
      
      if (file.name.endsWith('.json')) {
        profile = JSON.parse(content);
      } else if (file.name.endsWith('.csv')) {
        const lines = content.split('\n');
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          const match = line.match(/^"([^"]*)","(.*)"$/);
          if (match) {
            const key = match[1];
            const value = match[2].replace(/""/g, '"');
            
            if (value === 'true') {
              profile[key] = true;
            } else if (value === 'false') {
              profile[key] = false;
            } else {
              profile[key] = value;
            }
          }
        }
      }
      
      // Save to storage first
      chrome.storage.local.set({ resumeProfile: profile }, () => {
        // Then load into UI
        FIELDS.forEach(fieldId => {
          const element = document.getElementById(fieldId);
          if (element && profile.hasOwnProperty(fieldId)) {
            if (element.type === 'checkbox') {
              element.checked = profile[fieldId] === true || profile[fieldId] === 'true';
            } else {
              element.value = profile[fieldId] || '';
            }
          }
        });
        alert('Data imported successfully!');
        console.log('Import successful:', profile);
      });
    } catch (error) {
      alert('Error importing file: ' + error.message);
      console.error('Import error:', error);
    }
  };
  reader.readAsText(file);
}

// Clear all data
function clearData() {
  if (!confirm('Are you sure you want to clear all saved data?')) return;
  
  chrome.storage.local.remove('resumeProfile', () => {
    FIELDS.forEach(fieldId => {
      const element = document.getElementById(fieldId);
      if (element) {
        if (element.type === 'checkbox') {
          element.checked = false;
        } else {
          element.value = '';
        }
      }
    });
    alert('All data cleared!');
  });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  // Load existing profile
  loadProfile();
  
  // Auto-save on input
  FIELDS.forEach(fieldId => {
    const element = document.getElementById(fieldId);
    if (element) {
      element.addEventListener('input', saveProfile);
      element.addEventListener('change', saveProfile);
    }
  });
  
  // Fill Form button
  document.getElementById('fillForm').addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'FILL_FORM' }, (response) => {
        if (response && response.success) {
          console.log('Form filled successfully');
        } else {
          console.error('Form fill failed:', response);
        }
      });
    });
  });
  
  // Export/Import/Clear buttons
  document.getElementById('exportJSON').addEventListener('click', exportJSON);
  document.getElementById('exportCSV').addEventListener('click', exportCSV);
  document.getElementById('importData').addEventListener('click', importData);
  document.getElementById('clearData').addEventListener('click', clearData);
  document.getElementById('fileInput').addEventListener('change', handleFileImport);
});
