class ZapItBackground {
	constructor() {
		this.init()
	}

	init() {
		chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
			this.handleMessage(message, sender, sendResponse)
			return true
		})

		chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
			if (changeInfo.status === 'complete' && tab.url) {
				this.applyRulesForTab(tabId, tab.url)
			}
		})

		this.initializeDefaultState()
	}

	async initializeDefaultState() {
		try {
			const result = await chrome.storage.local.get(['editMode'])
			if (result.editMode === undefined) {
				await chrome.storage.local.set({ editMode: false })
			}
		} catch (error) {
			console.error('Error during initialization:', error)
		}
	}

	async handleMessage(message, sender, sendResponse) {
		try {
			switch (message.action) {
				case 'saveRule':
					await this.saveRule(message.rule, sender.tab.url)
					sendResponse({ success: true })
					break

				case 'getRules':
					const rules = await this.getRulesForUrl(message.url || sender.tab.url)
					sendResponse({ rules })
					break

				case 'deleteRule':
					await this.deleteRule(message.ruleId, sender.tab.url)
					sendResponse({ success: true })
					break

				case 'getEditMode':
					const result = await chrome.storage.local.get(['editMode'])
					sendResponse({ editMode: result.editMode || false })
					break

				default:
					sendResponse({ error: 'Unrecognized action' })
			}
		} catch (error) {
			console.error('Error in handleMessage:', error)
			sendResponse({ error: error.message })
		}
	}

	async saveRule(rule, tabUrl) {
		try {
			const hostname = new URL(tabUrl).hostname
			const storageKey = `rules_${hostname}`

			const result = await chrome.storage.local.get([storageKey])
			const existingRules = result[storageKey] || []

			const newRule = {
				...rule,
				id: Date.now() + Math.random(),
				created: new Date().toISOString(),
				url: tabUrl
			}

			existingRules.push(newRule)

			await chrome.storage.local.set({
				[storageKey]: existingRules
			})

			console.log(`Rule saved for ${hostname}:`, newRule)
		} catch (error) {
			console.error('Error while saving:', error)
			throw error
		}
	}

	async getRulesForUrl(url) {
		try {
			const hostname = new URL(url).hostname
			const storageKey = `rules_${hostname}`

			const result = await chrome.storage.local.get([storageKey])
			return result[storageKey] || []
		} catch (error) {
			console.error('Error while retrieving rules:', error)
			return []
		}
	}

	async deleteRule(ruleId, tabUrl) {
		try {
			const hostname = new URL(tabUrl).hostname
			const storageKey = `rules_${hostname}`

			const result = await chrome.storage.local.get([storageKey])
			const rules = result[storageKey] || []

			const updatedRules = rules.filter((rule) => rule.id !== ruleId)

			await chrome.storage.local.set({
				[storageKey]: updatedRules
			})

			console.log(`Rule deleted for ${hostname}`)
		} catch (error) {
			console.error('Error while deleting:', error)
			throw error
		}
	}

	async applyRulesForTab(tabId, url) {
		try {
			const rules = await this.getRulesForUrl(url)

			if (rules.length > 0) {
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
}

new ZapItBackground()
