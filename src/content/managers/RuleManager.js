/**
 * Manages rules (save, apply, remove) and communication with background script
 */
window.ZapItRuleManager = class {
	constructor(contentScript) {
		this.contentScript = contentScript
		this.appliedRules = []
	}

	/**
	 * Saves a rule via the background script
	 * @param {Object} rule - The rule to save
	 */
	async saveRule(rule) {
		try {
			const response = await chrome.runtime.sendMessage({
				action: 'saveRule',
				rule: rule
			})

			if (response && response.success) {
				this.appliedRules.push(rule)
			}
		} catch (error) {
			console.error('Error saving rule:', error)
		}
	}

	/**
	 * Removes an element by creating a removal rule
	 * @param {HTMLElement} element - Element to remove
	 * @param {string} selector - CSS selector for the element
	 */
	async removeElement(element, selector) {
		element.classList.add('zapit-removed')

		const rule = {
			selector: selector,
			action: 'remove',
			styles: {}
		}

		await this.saveRule(rule)
	}

	/**
	 * Removes a rule's effects from the DOM
	 * @param {Object} rule - The rule to remove
	 */
	removeRuleFromDOM(rule) {
		try {
			const escapedSelector = window.ZapItUtils.escapeSelector(rule.selector)
			const elements = document.querySelectorAll(escapedSelector)

			elements.forEach((element) => {
				switch (rule.action) {
					case 'remove':
						element.classList.remove('zapit-removed')
						break

					case 'style':
						if (element.dataset.zapitOriginalStyles) {
							const originalStyles = JSON.parse(element.dataset.zapitOriginalStyles)
							Object.keys(originalStyles).forEach((property) => {
								element.style[property] = originalStyles[property]
							})
							delete element.dataset.zapitOriginalStyles
						} else if (rule.styles) {
							Object.keys(rule.styles).forEach((property) => {
								element.style.removeProperty(property)
							})
						}
						break

					case 'editText':
						if (element.dataset.zapitOriginalText) {
							element.innerHTML = element.dataset.zapitOriginalText
							delete element.dataset.zapitOriginalText
						}
						break
				}
			})
		} catch (error) {
			console.error('Error removing rule from DOM:', rule, error)
		}
	}

	/**
	 * Applies multiple rules to the DOM
	 * @param {Array} rules - Array of rules to apply
	 */
	applyRules(rules) {
		this.clearAppliedStyles()

		rules.forEach((rule) => {
			try {
				const escapedSelector = window.ZapItUtils.escapeSelector(rule.selector)
				const elements = document.querySelectorAll(escapedSelector)

				elements.forEach((element) => {
					switch (rule.action) {
						case 'remove':
							element.classList.add('zapit-removed')
							break

						case 'style':
							if (rule.styles) {
								if (!element.dataset.zapitOriginalStyles) {
									const originalStyles = {}
									Object.keys(rule.styles).forEach((property) => {
										originalStyles[property] = element.style[property] || ''
									})
									element.dataset.zapitOriginalStyles = JSON.stringify(originalStyles)
								}

								Object.keys(rule.styles).forEach((property) => {
									element.style[property] = rule.styles[property]
								})
							}
							break

						case 'editText':
							if (rule.newText && !element.dataset.zapitOriginalText) {
								element.dataset.zapitOriginalText = element.innerHTML
								element.innerHTML = rule.newText
							}
							break
					}
				})
			} catch (error) {
				console.error('Error applying rule:', rule, error)
			}
		})
	}

	/**
	 * Clears all applied styles and restores original states
	 */
	clearAppliedStyles() {
		// Restore styled elements
		const styledElements = document.querySelectorAll('[data-zapit-original-styles]')
		styledElements.forEach((element) => {
			const originalStyles = JSON.parse(element.dataset.zapitOriginalStyles)
			Object.keys(originalStyles).forEach((property) => {
				element.style[property] = originalStyles[property]
			})
			delete element.dataset.zapitOriginalStyles
		})

		// Restore text elements
		const textElements = document.querySelectorAll('[data-zapit-original-text]')
		textElements.forEach((element) => {
			element.innerHTML = element.dataset.zapitOriginalText
			delete element.dataset.zapitOriginalText
		})

		// Restore removed elements
		const removedElements = document.querySelectorAll('.zapit-removed')
		removedElements.forEach((element) => {
			element.classList.remove('zapit-removed')
		})
	}

	/**
	 * Loads and applies rules for the current page
	 */
	async loadAndApplyRules() {
		try {
			const response = await chrome.runtime.sendMessage({
				action: 'getRules',
				url: window.location.href
			})

			if (response && response.rules) {
				this.applyRules(response.rules)
			}
		} catch (error) {
			console.error('Error loading rules:', error)
		}
	}
}
