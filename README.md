# Zap It - Element Editor

Zap It is a powerful Chrome extension that gives you complete control over any website's appearance and content. Remove unwanted elements, customize styles, edit text content, and create a personalized browsing experience that persists across sessions.

## Demo

![Demo](/assets/demo/demo.gif)

## Prerequisites

- [Google Chrome](https://www.google.com/chrome/) browser
- Developer mode enabled in Chrome extensions

## Features

### Core Editing Capabilities

- **Element removal:** Delete any unwanted element from web pages (ads, popups, distracting content)
- **Style customization:** Modify colors, backgrounds, font sizes, borders, padding, and margins with live preview
- **Text editing:** Edit any text content inline with Enter/Escape key support
- **Smart element selection:** Intelligent highlighting system with element info tooltips
- **Context menus:** Right-click style interface for quick access to editing options

### Advanced Features

- **Persistent storage:** All modifications are automatically saved and reapplied on subsequent visits
- **Real-time preview:** See changes instantly as you make them with live style preview
- **Rule management:** Organize and manage your customizations by domain
- **Universal compatibility:** Works on all websites, including those using modern frameworks
- **CSS selector intelligence:** Handles complex selectors including Tailwind CSS classes and special characters
- **Draggable style panel:** Moveable interface that doesn't interfere with your editing workflow

### User Interface

- **Toggle edit mode:** Easy on/off switching for editing functionality
- **Visual feedback:** Smooth highlighting and overlay system

## Installation

Clone or download the extension and install it in Chrome:

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** using the toggle in the top right corner
3. Click **Load unpacked** and select the "Zap it" folder
4. The extension icon will appear in your Chrome toolbar

## Usage

1. Click the Zap It icon in your Chrome toolbar
2. Toggle the editing mode using the switch in the popup
3. Hover over any element on the page to highlight it
4. Click on highlighted elements to access the context menu
5. Choose to either remove the element or customize its style
6. Your changes are automatically saved and will persist across browser sessions

## Architecture

The extension is built using Chrome's Manifest V3 and consists of:

- **Background script:** Manages rule storage and inter-component communication
- **Content script:** Handles element selection, highlighting, and style application
- **Popup interface:** Provides rule management and extension controls
- **Modern CSS:** Dark theme with gold accents and smooth animations

## Use Cases

- **Ad blocking:** Remove persistent advertising banners and popups
- **Reading enhancement:** Hide sidebars and distracting elements for better focus
- **Accessibility:** Adjust colors and font sizes for better readability
- **Productivity:** Eliminate distracting elements from work-related websites
- **Customization:** Personalize frequently visited sites to match your preferences

## Privacy and Security

- **Local storage only:** All rules and modifications are stored locally in your browser
- **No data collection:** The extension does not send any data to external servers
- **No permissions abuse:** Only requests necessary permissions for basic functionality
