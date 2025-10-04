/**
 * Manages the style editing panel
 */
window.ZapItStylePanel = class {
	constructor(contentScript) {
		this.contentScript = contentScript
		this.panel = null
		this.backdrop = null
		this.currentElement = null
		this.originalStyles = null
	}

	/**
	 * Shows the style panel for an element
	 * @param {HTMLElement} element - The element to style
	 * @param {string} selector - CSS selector for the element
	 */
	show(element, selector) {
		this.hide()

		// Store original styles for restoration
		this.currentElement = element
		this.originalStyles = {
			backgroundColor: element.style.backgroundColor || '',
			color: element.style.color || '',
			fontSize: element.style.fontSize || '',
			border: element.style.border || '',
			padding: element.style.padding || '',
			margin: element.style.margin || ''
		}

		// Create backdrop
		const backdrop = document.createElement('div')
		backdrop.className = 'zapit-backdrop'
		document.body.appendChild(backdrop)

		// Create panel
		const panel = document.createElement('div')
		panel.className = 'zapit-style-panel'

		const computedStyle = window.getComputedStyle(element)

		panel.innerHTML = this.createPanelHTML(computedStyle)

		document.body.appendChild(panel)
		this.panel = panel
		this.backdrop = backdrop

		// Make panel draggable
		this.makePanelDraggable(panel)

		// Set up event listeners
		this.setupEventListeners(element, selector)
	}

	/**
	 * Creates the HTML content for the style panel
	 * @param {CSSStyleDeclaration} computedStyle - Computed styles of the element
	 * @returns {string} HTML content
	 */
	createPanelHTML(computedStyle) {
		return `
			<div class="zapit-style-panel-header">
				<span>Edit Element Style</span>
				<button class="zapit-style-panel-close">×</button>
			</div>
			<div class="zapit-style-panel-content">
				<div class="zapit-style-group">
					<div class="zapit-style-group-title">Background Color</div>
					<input type="color" class="zapit-style-input" id="backgroundColor" 
						   value="${window.ZapItUtils.rgbToHex(computedStyle.backgroundColor)}" title="Click to choose background color">
				</div>
				
				<div class="zapit-style-group">
					<div class="zapit-style-group-title">Text Color</div>
					<input type="color" class="zapit-style-input" id="color" 
						   value="${window.ZapItUtils.rgbToHex(computedStyle.color)}" title="Click to choose text color">
				</div>
				
				<div class="zapit-style-group">
					<div class="zapit-style-group-title">Font Size</div>
					<input type="text" class="zapit-style-input" id="fontSize" 
						   value="${computedStyle.fontSize}" placeholder="e.g. 16px, 1.2em, 120%">
				</div>
				
				<div class="zapit-style-group">
					<div class="zapit-style-group-title">Border</div>
					<input type="text" class="zapit-style-input" id="border" 
						   value="${computedStyle.border}" placeholder="e.g. 1px solid #000, 2px dashed red">
				</div>
				
				<div class="zapit-style-group">
					<div class="zapit-style-group-title">Padding</div>
					<input type="text" class="zapit-style-input" id="padding" 
						   value="${computedStyle.padding}" placeholder="e.g. 10px, 5px 10px">
				</div>
				
				<div class="zapit-style-group">
					<div class="zapit-style-group-title">Margin</div>
					<input type="text" class="zapit-style-input" id="margin" 
						   value="${computedStyle.margin}" placeholder="e.g. 10px, 5px 10px">
				</div>
				
				<div class="zapit-style-buttons">
					<button class="zapit-button zapit-button-primary" id="applyStyles">
						Apply Changes
					</button>
					<button class="zapit-button zapit-button-secondary" id="cancelStyles">
						Cancel
					</button>
				</div>
			</div>
		`
	}

	/**
	 * Sets up event listeners for the style panel
	 * @param {HTMLElement} element - The target element
	 * @param {string} selector - CSS selector for the element
	 */
	setupEventListeners(element, selector) {
		this.panel.querySelector('.zapit-style-panel-close').addEventListener('click', () => {
			this.restoreOriginalStyles()
			this.hide()
		})

		this.panel.querySelector('#applyStyles').addEventListener('click', async () => {
			await this.applyCustomStyles(element, selector)
		})

		this.panel.querySelector('#cancelStyles').addEventListener('click', () => {
			this.restoreOriginalStyles()
			this.hide()
		})

		this.backdrop.addEventListener('click', () => {
			this.restoreOriginalStyles()
			this.hide()
		})

		// Live preview on input changes
		this.panel.querySelectorAll('.zapit-style-input').forEach((input) => {
			input.addEventListener('input', () => {
				this.previewStyles(element)
			})
		})
	}

	/**
	 * Hides the style panel
	 */
	hide() {
		if (this.panel) {
			this.panel.remove()
			this.panel = null
		}
		if (this.backdrop) {
			this.backdrop.remove()
			this.backdrop = null
		}
		this.currentElement = null
		this.originalStyles = null
	}

	/**
	 * Previews style changes on the element
	 * @param {HTMLElement} element - The target element
	 */
	previewStyles(element) {
		if (!this.panel) return

		const inputs = this.panel.querySelectorAll('.zapit-style-input')

		inputs.forEach((input) => {
			if (input.value) {
				element.style[input.id] = input.value
			}
		})
	}

	/**
	 * Applies the custom styles and saves the rule
	 * @param {HTMLElement} element - The target element
	 * @param {string} selector - CSS selector for the element
	 */
	async applyCustomStyles(element, selector) {
		const inputs = this.panel.querySelectorAll('.zapit-style-input')
		const styles = {}

		inputs.forEach((input) => {
			if (input.value) {
				styles[input.id] = input.value
			}
		})

		// Apply styles to element
		Object.keys(styles).forEach((property) => {
			element.style[property] = styles[property]
		})

		// Save rule
		const rule = {
			selector: selector,
			action: 'style',
			styles: styles
		}

		await this.contentScript.ruleManager.saveRule(rule)
		this.hide()
	}

	/**
	 * Restores the original styles of the element
	 */
	restoreOriginalStyles() {
		if (!this.currentElement || !this.originalStyles) return

		Object.keys(this.originalStyles).forEach((property) => {
			this.currentElement.style[property] = this.originalStyles[property]
		})
	}

	/**
	 * Makes the panel draggable
	 * @param {HTMLElement} panel - The panel element
	 */
	makePanelDraggable(panel) {
		const header = panel.querySelector('.zapit-style-panel-header')
		if (!header) return

		// Force cursor style immediately
		header.style.setProperty('cursor', 'move', 'important')

		let isDragging = false
		let startX = 0
		let startY = 0
		let startLeft = 0
		let startTop = 0

		const handleMouseDown = (e) => {
			if (e.target.classList.contains('zapit-style-panel-close')) {
				return
			}

			// Only start drag if clicking on header (but not close button)
			if (e.target === header || (header.contains(e.target) && !e.target.classList.contains('zapit-style-panel-close'))) {
				isDragging = true

				// Get current panel position
				const panelStyle = window.getComputedStyle(panel)
				startLeft = parseInt(panelStyle.left) || 50
				startTop = parseInt(panelStyle.top) || 50

				// Get mouse position
				startX = e.clientX
				startY = e.clientY

				header.style.setProperty('cursor', 'grabbing', 'important')
				document.body.style.userSelect = 'none'
				e.preventDefault()
				e.stopPropagation()
			}
		}

		const handleMouseMove = (e) => {
			if (!isDragging) return

			e.preventDefault()
			e.stopPropagation()

			// Calculate new position
			const deltaX = e.clientX - startX
			const deltaY = e.clientY - startY
			let newLeft = startLeft + deltaX
			let newTop = startTop + deltaY

			// Get panel and viewport dimensions
			const panelRect = panel.getBoundingClientRect()
			const maxX = window.innerWidth - panelRect.width
			const maxY = window.innerHeight - panelRect.height

			// Constrain to viewport bounds
			newLeft = Math.max(0, Math.min(newLeft, maxX))
			newTop = Math.max(0, Math.min(newTop, maxY))

			// Apply new position with important to override CSS
			panel.style.setProperty('left', newLeft + 'px', 'important')
			panel.style.setProperty('top', newTop + 'px', 'important')
		}

		const handleMouseUp = (e) => {
			if (isDragging) {
				isDragging = false
				header.style.setProperty('cursor', 'move', 'important')
				document.body.style.userSelect = ''
				e.preventDefault()
				e.stopPropagation()
			}
		}

		// Remove any existing listeners first
		header.removeEventListener('mousedown', handleMouseDown)
		document.removeEventListener('mousemove', handleMouseMove)
		document.removeEventListener('mouseup', handleMouseUp)

		// Add event listeners
		header.addEventListener('mousedown', handleMouseDown, { passive: false })
		document.addEventListener('mousemove', handleMouseMove, { passive: false })
		document.addEventListener('mouseup', handleMouseUp, { passive: false })

		// Add visual feedback
		header.style.setProperty('cursor', 'move', 'important')
		header.title = 'Cliquez et glissez pour déplacer'
	}
}
