# Snap N Pin - Chrome Screenshot Extension

A powerful screenshot tool for Chrome that lets you capture, save, and pin screenshots to your screen. Similar to Windows' Snipping Tool but with additional features like the ability to keep screenshots floating on top of your browser using Picture-in-Picture mode.

## Features

### 1. Screenshot Capture
- Click-and-drag selection for precise captures
- Dark overlay (50% opacity) for better visibility
- Clean screenshots without overlay artifacts
- Escape key to cancel selection

### 2. Save to Computer
- Instantly save screenshots as PNG files
- Automatic timestamp-based filenames
- Keyboard shortcut: `Alt + Shift + 1`
- Access via extension popup menu

### 3. Pin to Top
- Float screenshots on top of your browser
- Picture-in-Picture mode for cross-tab visibility
- Drag screenshots anywhere on screen
- Save pinned screenshots anytime
- Close when no longer needed
- Keyboard shortcut: `Alt + Shift + 2`
- Access via extension popup menu

### 4. Floating Window Features
- Title bar shows "Snip and Pin"
- Drag by grabbing the title bar
- Picture-in-Picture toggle (📌)
- Save button (💾) to download the screenshot
- Close button (✕) to remove the window
- PiP window stays visible across all tabs

## Installation

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked" and select the extension directory

## Keyboard Shortcuts

Default shortcuts:
- `Alt + Shift + 1`: Save screenshot to computer
- `Alt + Shift + 2`: Pin screenshot to screen
- `Esc`: Cancel screenshot selection

To customize shortcuts:
1. Go to `chrome://extensions/shortcuts` in Chrome
2. Find "Snap N Pin" in the list
3. Click the pencil icon next to each command
4. Set your preferred key combination
5. Click OK to save

## Usage

### Taking a Screenshot
1. Click the extension icon or use keyboard shortcuts
2. Choose "Save to Computer" or "Pin to Top"
3. Click and drag to select the area
4. Release to capture

### Managing Pinned Screenshots
- **Move**: Drag the title bar
- **Pin Across Tabs**: Click the 📌 button to toggle Picture-in-Picture mode
- **Save**: Click the 💾 button
- **Close**: Click the ✕ button or exit PiP mode

## Technical Details

Built with:
- Chrome Extension Manifest V3
- Vanilla JavaScript
- Chrome Extension APIs:
  - activeTab
  - downloads
  - scripting
  - tabs
- Picture-in-Picture API for cross-tab visibility

## Development

### Project Structure
```
snap-n-pin/
├── manifest.json        # Extension configuration
├── background.js       # Background service worker
├── content.js         # Content script for screenshot functionality
├── popup.html         # Extension popup menu
├── popup.js          # Popup functionality
├── icons/            # Extension icons
└── README.md         # Documentation
```

### Building from Source
1. Clone the repository
2. Make your changes
3. Load the extension in Chrome using Developer mode

## Contributing

Feel free to submit issues and enhancement requests!
