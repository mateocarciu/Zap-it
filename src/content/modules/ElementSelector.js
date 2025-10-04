/**
 * Manages element selection, highlighting, and overlay
 */
window.ZapItElementSelector = class {
	constructor(contentScript) {
		this.contentScript = contentScript
		this.highlightedElement = null
	}

	/**
	 * Shows the selection overlay
	 */
	showSelectionOverlay() {
		if (!document.querySelector('.zapit-selector-overlay')) {
			const overlay = document.createElement('div')
			overlay.className = 'zapit-selector-overlay'
			document.body.appendChild(overlay)
		}
	}

	/**
	 * Hides the selection overlay
	 */
	hideSelectionOverlay() {
		const overlay = document.querySelector('.zapit-selector-overlay')
		if (overlay) {
			overlay.remove()
		}
	}

	/**
	 * Highlights an element with visual feedback
	 * @param {HTMLElement} element - Element to highlight
	 */
	highlightElement(element) {
		this.unhighlightElement()

		this.highlightedElement = element
		element.classList.add('zapit-element-highlight')

		const elementInfo = window.ZapItUtils.getElementInfo(element)
		element.setAttribute('data-zapit-info', elementInfo)
	}

	/**
	 * Removes highlight from the currently highlighted element
	 */
	unhighlightElement() {
		if (this.highlightedElement) {
			this.highlightedElement.classList.remove('zapit-element-highlight')
			this.highlightedElement.removeAttribute('data-zapit-info')
			this.highlightedElement = null
		}
	}

	/**
	 * Selects an element and shows the context menu
	 * @param {HTMLElement} element - Element to select
	 * @param {MouseEvent} event - Mouse event for positioning
	 */
	selectElement(element, event) {
		this.contentScript.currentSelectedElement = element
		this.unhighlightElement()
		this.contentScript.contextMenu.show(element, event.clientX, event.clientY)
	}
}
