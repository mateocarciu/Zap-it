class ZapItPopup {
	constructor() {
		this.isEditMode = false
		this.currentTab = null
		this.init()
	}

	async init() {
		await this.getCurrentTab()
		await this.loadState()
		this.setupEventListeners()
		await this.loadRulesForCurrentSite()
	}

	async getCurrentTab() {
		const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
		this.currentTab = tab
	}

	setupEventListeners() {
		const toggleMode = document.getElementById('toggleMode')
		const clearRules = document.getElementById('clearRules')

		toggleMode.addEventListener('change', (e) => {
			this.toggleEditMode(e.target.checked)
		})

		clearRules.addEventListener('click', () => {
			this.clearAllRules()
		})
	}

	async loadState() {
		try {
			const result = await chrome.storage.local.get(['editMode'])
			this.isEditMode = result.editMode || false
			this.updateUI()
		} catch (error) {
			console.error('Error loading state:', error)
		}
	}

	async toggleEditMode(enabled) {
		this.isEditMode = enabled

		try {
			await chrome.storage.local.set({ editMode: enabled })

			if (this.currentTab) {
				await chrome.tabs.sendMessage(this.currentTab.id, {
					action: 'toggleEditMode',
					enabled: enabled
				})
			}

			this.updateUI()

			setTimeout(() => {
				window.close()
			}, 200)
		} catch (error) {
			console.error('Error toggling mode:', error)
			if (error.message.includes('Receiving end does not exist')) {
				chrome.tabs.reload(this.currentTab.id)
			}
		}
	}

	updateUI() {
		const toggleMode = document.getElementById('toggleMode')
		toggleMode.checked = this.isEditMode
	}

	async loadRulesForCurrentSite() {
		if (!this.currentTab) return

		try {
			const hostname = new URL(this.currentTab.url).hostname
			const result = await chrome.storage.local.get([`rules_${hostname}`])
			const rules = result[`rules_${hostname}`] || []

			this.displayRules(rules)
		} catch (error) {
			console.error('Error loading rules:', error)
		}
	}

	displayRules(rules) {
		const rulesList = document.getElementById('rulesList')
		const rulesCount = document.getElementById('rulesCount')
		const clearRules = document.getElementById('clearRules')
		const noRules = document.getElementById('noRules')

		rulesCount.textContent = rules.length

		if (rules.length === 0) {
			rulesList.style.display = 'none'
			noRules.style.display = 'block'
			clearRules.style.display = 'none'
		} else {
			rulesList.style.display = 'flex'
			noRules.style.display = 'none'
			clearRules.style.display = 'flex'

			rulesList.innerHTML = rules
				.map(
					(rule, index) => `
					<div class="rule-item">
						<div class="rule-info">
							<div class="rule-selector">${this.shortenSelector(rule.selector)}</div>
							<div class="rule-action">${this.getActionText(rule.action)}</div>
							<div class="rule-timestamp">${this.formatTimestamp(rule.created)}</div>
						</div>
						<button class="delete-rule-btn" data-rule-id="${rule.id}" title="Delete this rule">
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14Z"/>
								<path d="M10 11v6M14 11v6"/>
							</svg>
						</button>
					</div>
				`
				)
				.join('')

			document.querySelectorAll('.delete-rule-btn').forEach((btn) => {
				btn.addEventListener('click', (e) => {
					e.stopPropagation()
					const ruleId = e.currentTarget.getAttribute('data-rule-id')
					this.deleteIndividualRule(ruleId)
				})
			})
		}
	}

	shortenSelector(selector) {
		if (selector.length > 40) {
			return selector.substring(0, 40) + '...'
		}
		return selector
	}

	getActionText(action) {
		switch (action) {
			case 'remove':
				return 'Element removed'
			case 'style':
				return 'Style changed'
			default:
				return action
		}
	}

	formatTimestamp(timestamp) {
		if (!timestamp) return ''

		const date = new Date(timestamp)
		const now = new Date()

		const timeString = date.toLocaleTimeString('en-US', {
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		})

		if (date.toDateString() === now.toDateString()) {
			return `Today at ${timeString}`
		}

		const yesterday = new Date(now)
		yesterday.setDate(yesterday.getDate() - 1)
		if (date.toDateString() === yesterday.toDateString()) {
			return `Yesterday at ${timeString}`
		}

		const dateString = date.toLocaleDateString('en-US', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric'
		})

		return `${dateString} at ${timeString}`
	}

	async deleteIndividualRule(ruleId) {
		if (!this.currentTab) return

		try {
			const hostname = new URL(this.currentTab.url).hostname
			const storageKey = `rules_${hostname}`

			const result = await chrome.storage.local.get([storageKey])
			const rules = result[storageKey] || []

			const ruleToDelete = rules.find((rule) => rule.id == ruleId)

			const updatedRules = rules.filter((rule) => rule.id != ruleId)

			await chrome.storage.local.set({
				[storageKey]: updatedRules
			})

			if (ruleToDelete) {
				await this.removeRuleFromDOM(ruleToDelete)
			}

			await this.loadRulesForCurrentSite()
		} catch (error) {
			console.error('Error deleting rule:', error)
		}
	}

	async removeRuleFromDOM(rule) {
		if (!this.currentTab) return

		try {
			await chrome.tabs.sendMessage(this.currentTab.id, {
				action: 'removeRuleFromDOM',
				rule: rule
			})
		} catch (error) {
			console.error('Error removing from DOM:', error)
		}
	}

	async clearAllRules() {
		if (!this.currentTab) return

		if (!confirm('Are you sure you want to delete all rules for this site?')) {
			return
		}

		try {
			const hostname = new URL(this.currentTab.url).hostname
			await chrome.storage.local.remove(`rules_${hostname}`)

			chrome.tabs.reload(this.currentTab.id)

			await this.loadRulesForCurrentSite()
		} catch (error) {
			console.error('Error deleting rules:', error)
		}
	}
}

document.addEventListener('DOMContentLoaded', () => {
	new ZapItPopup()
})
