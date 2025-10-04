importScripts('managers/StorageManager.js', 'managers/MessageHandler.js', 'managers/TabManager.js')

/**
 * Main background script orchestrator
 */
class ZapItBackground {
	constructor() {
		this.storageManager = new self.ZapItStorageManager()
		this.tabManager = new self.ZapItTabManager(this.storageManager)
		this.messageHandler = new self.ZapItMessageHandler(this.storageManager, this.tabManager)

		this.init()
	}

	/**
	 * Initialize the background script
	 */
	init() {
		// Set up message listener
		chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
			this.messageHandler.handleMessage(message, sender, sendResponse)
			return true // Keep the message channel open for async responses
		})

		// Set up tab listeners
		this.tabManager.setupTabListeners()
	}
}

new ZapItBackground()
