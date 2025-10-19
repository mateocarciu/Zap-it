/**
 * Utility functions for the ZapIt content script
 */
window.ZapItUtils = {
	/**
	 * Converts RGB color values to hexadecimal format
	 * @param {string} rgb - RGB color string (e.g., "rgb(255, 0, 0)")
	 * @returns {string} Hexadecimal color string (e.g., "#ff0000")
	 */
	rgbToHex(rgb) {
		if (!rgb || rgb === 'rgba(0, 0, 0, 0)' || rgb === 'transparent') {
			return '#ffffff'
		}

		const result = rgb.match(/\d+/g)
		if (!result) return '#ffffff'

		return (
			'#' +
			result
				.slice(0, 3)
				.map((x) => {
					const hex = parseInt(x).toString(16)
					return hex.length === 1 ? '0' + hex : hex
				})
				.join('')
		)
	},

	/**
	 * Escapes CSS selectors to handle special characters
	 * @param {string} selector - CSS selector string
	 * @returns {string} Escaped CSS selector
	 */
	escapeSelector(selector) {
		try {
			document.querySelector(selector)
			return selector
		} catch (e) {
			if (selector.includes('.')) {
				const parts = selector.split(' ')
				const escapedParts = parts.map((part) => {
					if (part.startsWith('.')) {
						const className = part.substring(1)
						return '.' + CSS.escape(className)
					} else if (part.includes('.')) {
						const [tag, ...classes] = part.split('.')
						const escapedClasses = classes.map((cls) => CSS.escape(cls)).join('.')
						return tag + (classes.length > 0 ? '.' + escapedClasses : '')
					}
					return part
				})

				const finalSelector = escapedParts.join(' ')
				return finalSelector
			}

			const fallbackSelector = selector.replace(/:/g, '\\:')
			return fallbackSelector
		}
	},

	/**
	 * Generates a unique CSS selector for an element
	 * @param {HTMLElement} element - The DOM element
	 * @returns {string} CSS selector string
	 */
	getElementSelector(element) {
		if (element.id) {
			const escapedId = element.id.replace(/:/g, '\\:')
			return `#${escapedId}`
		}

		// Strategy 1: Try with unique attributes
		const uniqueSelector = this.getUniqueAttributeSelector(element)
		if (uniqueSelector && this.isUniqueSelector(uniqueSelector)) {
			return uniqueSelector
		}

		// Strategy 2: Build specific complete path
		return this.buildSpecificPath(element)
	},

	/**
	 * Finds a selector based on unique attributes
	 */
	getUniqueAttributeSelector(element) {
		const tagName = element.tagName.toLowerCase()

		const uniqueAttrs = ['data-testid', 'data-cy', 'data-qa', 'aria-label', 'title', 'alt', 'href', 'src']

		for (const attr of uniqueAttrs) {
			const value = element.getAttribute(attr)
			if (value && value.trim()) {
				const selector = `${tagName}[${attr}="${CSS.escape(value)}"]`
				if (this.isUniqueSelector(selector)) {
					return selector
				}
			}
		}

		// Try with specific classes
		if (element.className) {
			const classNameStr = typeof element.className === 'string' ? element.className : element.className.baseVal || element.className.toString()
			const classes = classNameStr
				.trim()
				.split(/\s+/)
				.filter((cls) => !cls.startsWith('zapit-'))
				.map((cls) => cls.replace(/:/g, '\\:'))

			// Try each combination of classes
			for (let i = classes.length; i > 0; i--) {
				const classCombo = classes.slice(0, i).join('.')
				if (classCombo) {
					const selector = `${tagName}.${classCombo}`
					if (this.isUniqueSelector(selector)) {
						return selector
					}
				}
			}
		}

		return null
	},

	/**
	 * Builds a full, specific path for the element
	 */
	buildSpecificPath(element) {
		const path = []
		let current = element

		while (current && current.nodeType === Node.ELEMENT_NODE && current !== document.body) {
			let selector = current.tagName.toLowerCase()

			if (current.id) {
				const escapedId = current.id.replace(/:/g, '\\:')
				selector += `#${escapedId}`
				path.unshift(selector)
				break
			}

			// Add the most specific classes
			if (current.className) {
				const classNameStr = typeof current.className === 'string' ? current.className : current.className.baseVal || current.className.toString()
				const classes = classNameStr
					.trim()
					.split(/\s+/)
					.filter((cls) => !cls.startsWith('zapit-'))
					.slice(0, 3) // Limit to 3 classes max to avoid overly long selectors

				if (classes.length > 0) {
					const classStr = classes.map((cls) => cls.replace(/:/g, '\\:')).join('.')
					selector += `.${classStr}`
				}
			}

			if (current.parentNode) {
				const siblings = Array.from(current.parentNode.children)
				const index = siblings.indexOf(current) + 1
				selector += `:nth-child(${index})`
			}

			path.unshift(selector)
			current = current.parentNode

			if (path.length >= 3) {
				break
			}
		}

		return path.join(' > ')
	},

	/**
	 * Checks if a selector is unique on the page
	 */
	isUniqueSelector(selector) {
		try {
			const elements = document.querySelectorAll(selector)
			return elements.length === 1
		} catch (e) {
			return false
		}
	},

	/**
	 * Creates element information tooltip text
	 * @param {HTMLElement} element - The DOM element
	 * @returns {string} Element info string
	 */
	getElementInfo(element) {
		const tagName = element.tagName.toLowerCase()

		let className = ''
		if (element.className) {
			const classNameStr = typeof element.className === 'string' ? element.className : element.className.baseVal || element.className.toString()
			className = classNameStr ? `.${classNameStr.trim().split(/\s+/).join('.')}` : ''
		}

		const id = element.id ? `#${element.id}` : ''

		return `${tagName}${id}${className}`
	},

	/**
	 * Checks if an element should be ignored during selection
	 * @param {HTMLElement} element - The DOM element to check
	 * @returns {boolean} True if element should be ignored
	 */
	shouldIgnoreElement(element) {
		return element.classList.contains('zapit-selector-overlay') || element.closest('.zapit-context-menu') || element.closest('.zapit-style-panel') || element.contentEditable === 'true'
	},

	/**
	 * Calculates optimal position for popups within viewport
	 * @param {number} x - X coordinate
	 * @param {number} y - Y coordinate
	 * @param {number} width - Popup width
	 * @param {number} height - Popup height
	 * @returns {Object} Optimal position {x, y}
	 */
	calculateOptimalPosition(x, y, width, height) {
		const viewportWidth = window.innerWidth
		const viewportHeight = window.innerHeight

		let finalX = x
		let finalY = y

		if (x + width > viewportWidth) {
			finalX = viewportWidth - width - 10
		}

		if (y + height > viewportHeight) {
			finalY = viewportHeight - height - 10
		}

		return { x: finalX, y: finalY }
	}
}
