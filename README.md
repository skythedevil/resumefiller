# Resume Auto Fill Chrome Extension

A powerful Chrome extension that automatically fills resume details in job application forms with support for fuzzy field matching and custom fields.

## Features

✅ **Auto-fill resume data** across job application sites  
✅ **Fuzzy logic matching** to detect field names intelligently  
✅ **Custom fields support** - add any additional fields you need  
✅ **Keyboard shortcut** (Ctrl+Shift+R / Cmd+Shift+R) for quick autofill  
✅ **Local storage** - your data stays private on your machine  
✅ **Dynamic field management** - add, edit, or delete fields anytime  

## Installation

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions`
3. Enable "Developer mode" (toggle in top-right)
4. Click "Load unpacked"
5. Select the extension folder
6. The extension icon will appear in your toolbar

## Usage

### Initial Setup
1. Click the extension icon in your Chrome toolbar
2. Fill in your resume details:
   - Full Name
   - Email
   - Phone
   - Designation
   - Experience
   - Skills
   - LinkedIn
   - GitHub
3. Click "Save Profile"

### Adding Custom Fields
1. In the popup, scroll to "Custom fields" section
2. Enter a field key (e.g., "Current CTC", "Notice Period")
3. Enter the field value
4. Click "Add"
5. Click "Save Profile"

### Auto-filling Forms

**Method 1: Button**
- Navigate to any job application page
- Click the extension icon
- Click "Auto Fill This Page"

**Method 2: Keyboard Shortcut**
- Navigate to any job application page
- Press `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)

## How It Works

The extension uses intelligent field detection:

1. **Exact matching**: Matches common field patterns (name, email, phone, etc.)
2. **Fuzzy matching**: Uses similarity scoring to match variations like "Full Name" vs "Your Name"
3. **Custom fields**: Matches your custom field keys against form field attributes
4. **Threshold-based**: Only fills fields with >65% similarity score

## Files Structure

```
resumefiller/
├── manifest.json          # Extension configuration
├── service_worker.js      # Background script for data management
├── content.js            # Content script for form detection & autofill
├── popup.html            # Extension popup UI
├── popup.css             # Popup styling
├── popup.js              # Popup logic
└── README.md             # This file
```

## Privacy

- All data is stored locally using Chrome's storage API
- No data is sent to external servers
- Your resume information never leaves your browser

## Permissions

- `storage`: To save your resume data locally
- `activeTab`: To interact with the current page
- `scripting`: To inject autofill functionality
- `<all_urls>`: To work on any job application site

## Keyboard Shortcuts

- `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac): Trigger autofill on current page

## Customization

You can modify the fuzzy matching threshold in `content.js`:

```javascript
const FUZZY_THRESHOLD = 0.65; // Adjust between 0.0 and 1.0
```

## Support

For issues or feature requests, please open an issue on GitHub.

## License

MIT License - feel free to use and modify as needed.

---

**Created by skythedevil**
