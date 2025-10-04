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
		const tagName = element.tagName.toLowerCase()

		if (element.id) {
			const escapedId = element.id.replace(/:/g, '\\:')
			return `#${escapedId}`
		}

		if (element.className) {
			const classNameStr = typeof element.className === 'string' ? element.className : element.className.baseVal || element.className.toString()

			const classes = classNameStr
				.trim()
				.split(/\s+/)
				.filter((cls) => !cls.startsWith('zapit-'))
				.map((cls) => cls.replace(/:/g, '\\:'))
				.join('.')
			if (classes) {
				return `${tagName}.${classes}`
			}
		}

		const path = []
		let current = element

		while (current && current.nodeType === Node.ELEMENT_NODE && current !== document.body) {
			let selector = current.tagName.toLowerCase()

			if (current.id) {
				const escapedId = current.id.replace(/:/g, '\\:')
				selector += `#${escapedId}`
				path.unshift(selector)
				break
			} else {
				const sibling = Array.from(current.parentNode?.children || []).filter((child) => child.tagName === current.tagName)
				if (sibling.length > 1) {
					const index = sibling.indexOf(current) + 1
					selector += `:nth-of-type(${index})`
				}
				path.unshift(selector)
			}

			current = current.parentNode
		}

		return path.join(' > ')
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
