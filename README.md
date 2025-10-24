# Zap It - Web Page Editor

A powerful browser extension to edit, remove, and customize any website's elements. Your changes persist across sessions.

**Available for Chrome and Firefox!**

## Demo

![Demo](/assets/demo/demo.gif)

## Features

- **Remove elements** - Delete ads, popups, and distracting content
- **Customize styles** - Modify colors, fonts, spacing, and more with live preview
- **Edit text** - Change any text content inline
- **Persistent changes** - Modifications are saved and auto-applied on revisit
- **Smart selection** - Intelligent element highlighting and CSS selector handling
- **Intuitive interface** - Draggable style panel and context menus

## Installation

### Chrome

1. Clone this repository
2. Open `chrome://extensions/`
3. Enable **Developer mode**
4. Click **Load unpacked** → Select the extension folder

### Firefox

1. Clone this repository
2. Rename `manifest_firefox.json` to `manifest.json`
3. Open `about:debugging#/runtime/this-firefox`
4. Click **Load Temporary Add-on** → Select `manifest.json`

## Usage

1. Click the Zap It icon in your toolbar
2. Toggle edit mode ON
3. Hover and click elements to edit or remove them
4. Changes save automatically!

## Architecture

- Uses **Manifest V3** for Chrome, **V2** for Firefox
- Browser polyfill (`src/browser-polyfill.js`) for cross-browser compatibility
- Direct storage access for better Firefox support
- Modern UI with dark theme

## Privacy

- All data stored locally
- No external servers
- No tracking or analytics
