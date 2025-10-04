/**
 * Manages inline text editing functionality
 */
window.ZapItTextEditor = class {
	constructor(contentScript) {
		this.contentScript = contentScript
	}

	/**
	 * Enables inline text editing for an element
	 * @param {HTMLElement} element - Element to enable text editing for
	 * @param {string} selector - CSS selector for the element
	 */
	enableTextEdit(element, selector) {
		if (!element.textContent.trim() && !element.innerHTML.trim()) {
			alert('This element has no text to edit.')
			return
		}

		this.contentScript.currentEditingElement = element

		const originalText = element.innerHTML
		const originalStyles = {
			outline: element.style.outline || '',
			backgroundColor: element.style.backgroundColor || '',
			padding: element.style.padding || '',
			cursor: element.style.cursor || ''
		}

		// Apply editing styles
		element.style.outline = '2px solid #fbbf24'
		element.style.backgroundColor = 'rgba(251, 191, 36, 0.1)'
		element.style.padding = element.style.padding || '4px'
		element.style.cursor = 'text'

		// Make element editable and focus
		element.contentEditable = true
		element.focus()

		// Select all text
		const range = document.createRange()
		const selection = window.getSelection()
		range.selectNodeContents(element)
		selection.removeAllRanges()
		selection.addRange(range)

		// Set up event handlers
		const saveEdit = async () => {
			const newText = element.innerHTML

			if (newText !== originalText) {
				const rule = {
					selector: selector,
					action: 'editText',
					originalText: originalText,
					newText: newText
				}
				await this.contentScript.ruleManager.saveRule(rule)
			}

			// Cleanup
			element.contentEditable = false
			this.contentScript.currentEditingElement = null
			Object.keys(originalStyles).forEach((property) => {
				element.style[property] = originalStyles[property]
			})

			element.removeEventListener('blur', saveEdit)
			element.removeEventListener('keydown', handleKeyDown)
		}

		const handleKeyDown = (e) => {
			if (e.key === 'Enter' && !e.shiftKey) {
				e.preventDefault()
				element.blur()
			} else if (e.key === 'Escape') {
				element.innerHTML = originalText
				element.blur()
			}
		}

		// Add event listeners
		element.addEventListener('blur', saveEdit, { once: true })
		element.addEventListener('keydown', handleKeyDown)
	}
}
