/**
 * Handles Chrome runtime messages from content scripts and popup
 */
self.ZapItMessageHandler = class {
	constructor(storageManager, tabManager) {
		this.storageManager = storageManager
		this.tabManager = tabManager
	}

	/**
	 * Handle incoming messages
	 * @param {Object} message - The message object
	 * @param {Object} sender - Message sender info
	 * @param {Function} sendResponse - Response callback
	 */
	async handleMessage(message, sender, sendResponse) {
		try {
			switch (message.action) {
				case 'saveRule':
					await this.storageManager.saveRule(message.rule, sender.tab.url)
					sendResponse({ success: true })
					break

				case 'getRules':
					const rules = await this.storageManager.getRulesForUrl(message.url || sender.tab.url)
					sendResponse({ rules })
					break

				case 'deleteRule':
					await this.storageManager.deleteRule(message.ruleId, sender.tab.url)
					sendResponse({ success: true })
					break

				case 'getEditMode':
					const editMode = await this.storageManager.getEditMode()
					sendResponse({ editMode })
					break

				case 'setEditMode':
					await this.storageManager.setEditMode(message.enabled)
					sendResponse({ success: true })
					break

				default:
					sendResponse({ error: 'Unrecognized action' })
			}
		} catch (error) {
			console.error('Error in handleMessage:', error)
			sendResponse({ error: error.message })
		}
	}
}
