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
				<span class="icon">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
					</svg>
				</span>
				Edit text
			</button>
			<div class="zapit-context-menu-separator"></div>
			<button class="zapit-context-menu-item danger" data-action="remove">
				<span class="icon">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<polyline points="3,6 5,6 21,6"/>
						<path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"/>
						<line x1="10" y1="11" x2="10" y2="17"/>
						<line x1="14" y1="11" x2="14" y2="17"/>
					</svg>
				</span>
				Delete this element
			</button>
			<div class="zapit-context-menu-separator"></div>
			<button class="zapit-context-menu-item" data-action="style">
				<span class="icon">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<circle cx="13.5" cy="6.5" r=".5"/>
						<circle cx="17.5" cy="10.5" r=".5"/>
						<circle cx="8.5" cy="7.5" r=".5"/>
						<circle cx="6.5" cy="12.5" r=".5"/>
						<path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>
					</svg>
				</span>
				Edit style
			</button>
			<div class="zapit-context-menu-separator"></div>
			<button class="zapit-context-menu-item" data-action="cancel">
				<span class="icon">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<line x1="18" y1="6" x2="6" y2="18"/>
						<line x1="6" y1="6" x2="18" y2="18"/>
					</svg>
				</span>
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
