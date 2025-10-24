/**
 * Manages rules (save, apply, remove) and communication with background script
 */
window.ZapItRuleManager = class {
	constructor(contentScript) {
		this.contentScript = contentScript
		this.appliedRules = []
	}

	/**
	 * Saves a rule directly to storage (Firefox & Google compatible)
	 * @param {Object} rule - The rule to save
	 */
	async saveRule(rule) {
		try {
			// Save directly to storage for better Firefox compatibility
			const hostname = new URL(window.location.href).hostname
			const storageKey = `rules_${hostname}`

			const result = await chrome.storage.local.get([storageKey])
			const existingRules = result[storageKey] || []

			const newRule = {
				...rule,
				id: Date.now() + Math.random(),
				created: new Date().toISOString(),
				url: window.location.href
			}

			existingRules.push(newRule)

			await chrome.storage.local.set({
				[storageKey]: existingRules
			})

			this.appliedRules.push(newRule)
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
		// Generate unique selector if current selector is not specific enough
		const selectorInfo = this.ensureUniqueSelector(element, selector)

		element.classList.add('zapit-removing')

		setTimeout(() => {
			element.classList.remove('zapit-removing')
			element.classList.add('zapit-removed')
		}, 400)

		const rule = {
			selector: selectorInfo.uniqueSelector,
			baseSelector: selectorInfo.baseSelector,
			action: 'remove',
			styles: {}
		}

		await this.saveRule(rule)
	}

	/**
	 * Ensures a selector is unique for the element
	 * @param {HTMLElement} element - Target element
	 * @param {string} selector - Original CSS selector
	 * @returns {Object} Object with unique selector and base selector
	 */
	ensureUniqueSelector(element, selector) {
		try {
			// Check if selector is already unique
			const elements = document.querySelectorAll(selector)
			if (elements.length === 1) {
				return {
					uniqueSelector: selector,
					baseSelector: selector
				}
			}

			// Create a more specific contextual selector
			const contextualSelector = this.createContextualSelector(element, selector)
			return {
				uniqueSelector: contextualSelector,
				baseSelector: selector
			}
		} catch (e) {
			console.error('Error creating unique selector:', e)
			return {
				uniqueSelector: selector,
				baseSelector: selector
			}
		}
	}

	/**
	 * Creates a robust contextual selector
	 * @param {HTMLElement} element - Target element
	 * @param {string} baseSelector - Base selector to enhance
	 * @returns {string} Enhanced contextual selector
	 */
	createContextualSelector(element, baseSelector) {
		const path = []
		let current = element
		let depth = 0
		const maxDepth = 4

		while (current && current !== document.body && depth < maxDepth) {
			let selector = current.tagName.toLowerCase()

			if (current.id) {
				selector += `#${current.id}`
				path.unshift(selector)
				break
			}

			// Add the most specific classes
			if (current.className) {
				const classes = current.className
					.split(' ')
					.filter((cls) => cls && !cls.startsWith('zapit-'))
					.slice(0, 2) // Take max 2 classes

				if (classes.length > 0) {
					selector += `.${classes.join('.')}`
				}
			}

			// Add position relative to siblings
			if (current.parentElement) {
				const siblings = Array.from(current.parentElement.children)
				const sameTagSiblings = siblings.filter((s) => s.tagName === current.tagName)

				if (sameTagSiblings.length > 1) {
					const index = sameTagSiblings.indexOf(current) + 1
					selector += `:nth-of-type(${index})`
				}
			}

			path.unshift(selector)
			current = current.parentElement
			depth++
		}

		return path.join(' > ')
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
				let elements = []
				let usedSelector = rule.selector

				try {
					const escapedSelector = window.ZapItUtils.escapeSelector(rule.selector)
					elements = Array.from(document.querySelectorAll(escapedSelector))
				} catch (e) {
					console.warn('Primary selector failed:', rule.selector, e)
				}

				// If no elements found and we have a baseSelector
				if (elements.length === 0 && rule.baseSelector && rule.baseSelector !== rule.selector) {
					try {
						const escapedBaseSelector = window.ZapItUtils.escapeSelector(rule.baseSelector)
						elements = Array.from(document.querySelectorAll(escapedBaseSelector))
						usedSelector = rule.baseSelector
						// console.log(`Fallback to baseSelector for rule:`, rule.action, usedSelector)
					} catch (e) {
						console.warn('Base selector also failed:', rule.baseSelector, e)
					}
				}

				elements.forEach((element) => {
					this.applyRuleToElement(element, rule)
				})

				if (elements.length === 0 && rule.selector.includes(':nth-of-type')) {
					this.tryPermissiveSelector(rule)
				}
			} catch (error) {
				console.error('Error applying rule:', rule, error)
			}
		})
	}

	/**
	 * Apply a rule to a specific element
	 */
	applyRuleToElement(element, rule) {
		switch (rule.action) {
			case 'remove':
				// Appliquer directement sans animation pour les règles chargées au démarrage
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
	}

	/**
	 * Try a more permissive approach for selectors with nth-of-type
	 */
	tryPermissiveSelector(rule) {
		try {
			// Extract the part before :nth-of-type
			const baseMatch = rule.selector.match(/^(.+?):nth-of-type\(\d+\)/)
			if (baseMatch) {
				const baseSelector = baseMatch[1]
				const elements = document.querySelectorAll(baseSelector)

				// If there is exactly one element, use it
				if (elements.length === 1) {
					console.log(`Applying rule with permissive selector:`, rule.action, baseSelector)
					this.applyRuleToElement(elements[0], rule)
				}
			}
		} catch (e) {
			console.warn('Permissive selector failed:', e)
		}
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
			const hostname = new URL(window.location.href).hostname
			const storageKey = `rules_${hostname}`
			const result = await chrome.storage.local.get([storageKey])
			const rules = result[storageKey] || []

			if (rules.length > 0) {
				this.applyRules(rules)
			}
		} catch (error) {
			console.error('Error loading rules:', error)
		}
	}
}
