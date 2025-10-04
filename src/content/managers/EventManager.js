/**
 * Manages all event handling for the ZapIt content script
 */
window.ZapItEventManager = class {
	constructor(contentScript) {
		this.contentScript = contentScript
		this.boundHandlers = {
			mouseOver: null,
			mouseOut: null,
			click: null,
			keyDown: null
		}
	}

	/**
	 * Sets up all event listeners for edit mode
	 */
	setupEventListeners() {
		// Create bound handlers if they don't exist
		if (!this.boundHandlers.mouseOver) {
			this.boundHandlers.mouseOver = this.handleMouseOver.bind(this)
			this.boundHandlers.mouseOut = this.handleMouseOut.bind(this)
			this.boundHandlers.click = this.handleClick.bind(this)
			this.boundHandlers.keyDown = this.handleKeyDown.bind(this)
		}

		document.addEventListener('mouseover', this.boundHandlers.mouseOver, true)
		document.addEventListener('mouseout', this.boundHandlers.mouseOut, true)
		document.addEventListener('click', this.boundHandlers.click, true)
		document.addEventListener('keydown', this.boundHandlers.keyDown, true)
	}

	/**
	 * Removes all event listeners
	 */
	removeEventListeners() {
		if (this.boundHandlers.mouseOver) {
			document.removeEventListener('mouseover', this.boundHandlers.mouseOver, true)
			document.removeEventListener('mouseout', this.boundHandlers.mouseOut, true)
			document.removeEventListener('click', this.boundHandlers.click, true)
			document.removeEventListener('keydown', this.boundHandlers.keyDown, true)
		}
	}

	/**
	 * Handles mouse over events for element highlighting
	 * @param {MouseEvent} event - The mouse event
	 */
	handleMouseOver(event) {
		if (!this.contentScript.isEditMode) return

		const element = event.target

		if (window.ZapItUtils.shouldIgnoreElement(element) || this.contentScript.currentEditingElement) {
			return
		}

		this.contentScript.elementSelector.highlightElement(element)
	}

	/**
	 * Handles mouse out events for removing highlights
	 * @param {MouseEvent} event - The mouse event
	 */
	handleMouseOut(event) {
		if (!this.contentScript.isEditMode) return

		this.contentScript.elementSelector.unhighlightElement()
	}

	/**
	 * Handles click events for element selection
	 * @param {MouseEvent} event - The mouse event
	 */
	handleClick(event) {
		if (!this.contentScript.isEditMode) return

		const element = event.target

		if (window.ZapItUtils.shouldIgnoreElement(element) || this.contentScript.currentEditingElement) {
			return
		}

		event.preventDefault()
		event.stopPropagation()
		event.stopImmediatePropagation()

		this.contentScript.elementSelector.selectElement(element, event)

		return false
	}

	/**
	 * Handles keyboard events
	 * @param {KeyboardEvent} event - The keyboard event
	 */
	handleKeyDown(event) {
		if (event.key === 'Escape') {
			if (this.contentScript.currentEditingElement) {
				this.contentScript.currentEditingElement.blur()
				return
			}

			this.contentScript.contextMenu.hide()
			this.contentScript.stylePanel.hide()

			if (this.contentScript.isSelecting) {
				this.contentScript.isSelecting = false
				this.contentScript.elementSelector.unhighlightElement()
			}
		}
	}

	/**
	 * Handles Chrome runtime messages
	 * @param {Object} message - The message object
	 * @param {Object} sender - The message sender
	 * @param {Function} sendResponse - Response callback
	 */
	handleMessage(message, sender, sendResponse) {
		switch (message.action) {
			case 'toggleEditMode':
				if (message.enabled) {
					this.contentScript.enableEditMode()
				} else {
					this.contentScript.disableEditMode()
				}
				break

			case 'reapplyRules':
				this.contentScript.loadAndApplyRules()
				break

			case 'removeRuleFromDOM':
				this.contentScript.ruleManager.removeRuleFromDOM(message.rule)
				break

			case 'applyRules':
				this.contentScript.ruleManager.applyRules(message.rules)
				break
		}

		sendResponse({ success: true })
	}

	/**
	 * Sets up Chrome runtime message listener
	 */
	setupMessageListener() {
		chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
			this.handleMessage(message, sender, sendResponse)
		})
	}
}
