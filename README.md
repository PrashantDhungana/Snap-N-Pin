# Snap N Pin Chrome Extension

A Chrome extension that provides snipping tool functionality similar to Windows' Snipping Tool.

## Features

- Click and drag to select screen area for capture
- Automatically saves screenshots in PNG format
- Timestamp-based filenames for easy organization
- Smooth selection interface with visual feedback

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right corner
3. Click "Load unpacked" and select the extension directory

## Usage

1. Click the Snap N Pin extension icon in your Chrome toolbar
2. The page will freeze and your cursor will change to a crosshair
3. Click and drag to select the area you want to capture
4. Release the mouse button to capture the selection
5. The screenshot will automatically save to your downloads folder

## Files Structure

- `manifest.json` - Extension configuration
- `background.js` - Extension background script
- `content.js` - Main screenshot functionality
- `inject.js` - Injects required libraries
- `icons/` - Extension icons

## Dependencies

- html2canvas - Used for capturing webpage content
