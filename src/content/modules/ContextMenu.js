/**
 * Manages the context menu for element actions
 */
window.ZapItContextMenu = class {
	constructor(contentScript) {
		this.contentScript = contentScript
		this.menu = null
	}

	/**
	 * Shows the context menu for an element
	 * @param {HTMLElement} element - The selected element
	 * @param {number} x - X coordinate for menu position
	 * @param {number} y - Y coordinate for menu position
	 */
	show(element, x, y) {
		this.hide()

		const menu = document.createElement('div')
		menu.className = 'zapit-context-menu'

		const tagName = element.tagName.toLowerCase()

		menu.innerHTML = `
			<div class="zapit-context-menu-header">
				${tagName} - Available actions
			</div>
			<button class="zapit-context-menu-item" data-action="editText">
				<span class="icon">✏️</span>
				Edit text
			</button>
			<div class="zapit-context-menu-separator"></div>
			<button class="zapit-context-menu-item danger" data-action="remove">
				<span class="icon">🗑️</span>
				Delete this element
			</button>
			<div class="zapit-context-menu-separator"></div>
			<button class="zapit-context-menu-item" data-action="style">
				<span class="icon">🎨</span>
				Edit style
			</button>
			<div class="zapit-context-menu-separator"></div>
			<button class="zapit-context-menu-item" data-action="cancel">
				<span class="icon">❌</span>
				Cancel
			</button>
		`

		document.body.appendChild(menu)

		// Position the menu optimally
		const rect = menu.getBoundingClientRect()
		const position = window.ZapItUtils.calculateOptimalPosition(x, y, rect.width, rect.height)

		menu.style.left = `${position.x}px`
		menu.style.top = `${position.y}px`

		// Add event listeners
		menu.querySelectorAll('.zapit-context-menu-item').forEach((item) => {
			item.addEventListener('click', (e) => {
				e.preventDefault()
				e.stopPropagation()
				const action = e.currentTarget.getAttribute('data-action')
				this.handleMenuAction(action, element)
			})
		})

		this.menu = menu

		// Set up click-outside handler
		setTimeout(() => {
			const clickHandler = (event) => {
				if (!menu.contains(event.target)) {
					this.hide()
					document.removeEventListener('click', clickHandler)
				}
			}
			document.addEventListener('click', clickHandler)
		}, 300)
	}

	/**
	 * Hides the context menu
	 */
	hide() {
		if (this.menu) {
			this.menu.remove()
			this.menu = null
		}
	}

	/**
	 * Handles context menu action selection
	 * @param {string} action - The selected action
	 * @param {HTMLElement} element - The target element
	 */
	async handleMenuAction(action, element) {
		this.hide()

		const selector = window.ZapItUtils.getElementSelector(element)

		switch (action) {
			case 'editText':
				this.contentScript.textEditor.enableTextEdit(element, selector)
				break

			case 'remove':
				await this.contentScript.ruleManager.removeElement(element, selector)
				break

			case 'style':
				this.contentScript.stylePanel.show(element, selector)
				break

			case 'cancel':
				break
		}
	}
}
