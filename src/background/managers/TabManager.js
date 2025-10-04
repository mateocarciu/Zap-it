/**
 * Manages tab-related operations and rule application
 */
self.ZapItTabManager = class {
	constructor(storageManager) {
		this.storageManager = storageManager
	}

	/**
	 * Apply rules when a tab is updated
	 * @param {number} tabId - The tab ID
	 * @param {string} url - The tab URL
	 */
	async applyRulesForTab(tabId, url) {
		try {
			const rules = await this.storageManager.getRulesForUrl(url)

			if (rules.length > 0) {
				// Wait a bit for the content script to load
				setTimeout(() => {
					chrome.tabs
						.sendMessage(tabId, {
							action: 'applyRules',
							rules: rules
						})
						.catch((error) => {
							console.log('Content script not ready yet for:', url)
						})
				}, 1000)
			}
		} catch (error) {
			console.error('Error while applying rules:', error)
		}
	}

	/**
	 * Set up tab event listeners
	 */
	setupTabListeners() {
		chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
			if (changeInfo.status === 'complete' && tab.url) {
				this.applyRulesForTab(tabId, tab.url)
			}
		})
	}
}
