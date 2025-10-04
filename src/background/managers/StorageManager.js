/**
 * Manages Chrome storage operations for rules and settings
 */
self.ZapItStorageManager = class {
	constructor() {
		this.initializeDefaultState()
	}

	/**
	 * Initialize default storage state
	 */
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

	/**
	 * Save a rule for a specific URL
	 * @param {Object} rule - The rule to save
	 * @param {string} tabUrl - The URL where the rule applies
	 */
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

	/**
	 * Get all rules for a specific URL
	 * @param {string} url - The URL to get rules for
	 * @returns {Array} Array of rules
	 */
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

	/**
	 * Delete a specific rule
	 * @param {string} ruleId - The ID of the rule to delete
	 * @param {string} tabUrl - The URL where the rule was applied
	 */
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

	/**
	 * Get the current edit mode state
	 * @returns {boolean} Current edit mode state
	 */
	async getEditMode() {
		try {
			const result = await chrome.storage.local.get(['editMode'])
			return result.editMode || false
		} catch (error) {
			console.error('Error getting edit mode:', error)
			return false
		}
	}

	/**
	 * Set the edit mode state
	 * @param {boolean} enabled - Whether edit mode is enabled
	 */
	async setEditMode(enabled) {
		try {
			await chrome.storage.local.set({ editMode: enabled })
		} catch (error) {
			console.error('Error setting edit mode:', error)
			throw error
		}
	}
}
