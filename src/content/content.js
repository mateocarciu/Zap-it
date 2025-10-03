class ZapItContentScript {
	constructor() {
		this.isEditMode = false
		this.isSelecting = false
		this.highlightedElement = null
		this.contextMenu = null
		this.stylePanel = null
		this.currentSelectedElement = null
		this.appliedRules = []

		this.init()
	}

	init() {
		chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
			this.handleMessage(message, sender, sendResponse)
		})

		this.loadInitialState()
		this.loadAndApplyRules()
	}

	async loadInitialState() {
		try {
			const response = await chrome.runtime.sendMessage({ action: 'getEditMode' })
			if (response && response.editMode) {
				this.enableEditMode()
			}
		} catch (error) {
			console.error('Error loading initial state:', error)
		}
	}

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

	handleMessage(message, sender, sendResponse) {
		switch (message.action) {
			case 'toggleEditMode':
				if (message.enabled) {
					this.enableEditMode()
				} else {
					this.disableEditMode()
				}
				break

			case 'reapplyRules':
				this.loadAndApplyRules()
				break

			case 'removeRuleFromDOM':
				this.removeRuleFromDOM(message.rule)
				break

			case 'applyRules':
				this.applyRules(message.rules)
				break
		}

		sendResponse({ success: true })
	}

	enableEditMode() {
		this.isEditMode = true
		this.isSelecting = true
		document.body.classList.add('zapit-selection-mode')
		this.setupEventListeners()
		this.showSelectionOverlay()
	}

	disableEditMode() {
		this.isEditMode = false
		this.isSelecting = false
		document.body.classList.remove('zapit-selection-mode')
		this.removeEventListeners()
		this.hideSelectionOverlay()
		this.hideContextMenu()
		this.hideStylePanel()
	}

	setupEventListeners() {
		document.addEventListener('mouseover', this.handleMouseOver.bind(this), true)
		document.addEventListener('mouseout', this.handleMouseOut.bind(this), true)
		document.addEventListener('click', this.handleClick.bind(this), true)
		document.addEventListener('keydown', this.handleKeyDown.bind(this), true)
	}

	removeEventListeners() {
		document.removeEventListener('mouseover', this.handleMouseOver.bind(this), true)
		document.removeEventListener('mouseout', this.handleMouseOut.bind(this), true)
		document.removeEventListener('click', this.handleClick.bind(this), true)
		document.removeEventListener('keydown', this.handleKeyDown.bind(this), true)
	}

	showSelectionOverlay() {
		if (!document.querySelector('.zapit-selector-overlay')) {
			const overlay = document.createElement('div')
			overlay.className = 'zapit-selector-overlay'
			document.body.appendChild(overlay)
		}
	}

	hideSelectionOverlay() {
		const overlay = document.querySelector('.zapit-selector-overlay')
		if (overlay) {
			overlay.remove()
		}
	}

	handleMouseOver(event) {
		if (!this.isEditMode) return

		const element = event.target

		if (element.classList.contains('zapit-selector-overlay') || element.closest('.zapit-context-menu') || element.closest('.zapit-style-panel')) {
			return
		}

		this.highlightElement(element)
	}

	handleMouseOut(event) {
		if (!this.isEditMode) return

		this.unhighlightElement()
	}

	handleClick(event) {
		if (!this.isEditMode) return

		const element = event.target

		if (element.closest('.zapit-context-menu') || element.closest('.zapit-style-panel')) {
			return
		}

		event.preventDefault()
		event.stopPropagation()
		event.stopImmediatePropagation()

		this.selectElement(element, event)

		return false
	}
	handleKeyDown(event) {
		if (event.key === 'Escape') {
			this.hideContextMenu()
			this.hideStylePanel()
			if (this.isSelecting) {
				this.isSelecting = false
				this.unhighlightElement()
			}
		}
	}

	highlightElement(element) {
		this.unhighlightElement()

		this.highlightedElement = element
		element.classList.add('zapit-element-highlight')

		const tagName = element.tagName.toLowerCase()

		let className = ''
		if (element.className) {
			const classNameStr = typeof element.className === 'string' ? element.className : element.className.baseVal || element.className.toString()
			className = classNameStr ? `.${classNameStr.trim().split(/\s+/).join('.')}` : ''
		}

		const id = element.id ? `#${element.id}` : ''

		element.setAttribute('data-zapit-info', `${tagName}${id}${className}`)
	}

	unhighlightElement() {
		if (this.highlightedElement) {
			this.highlightedElement.classList.remove('zapit-element-highlight')
			this.highlightedElement.removeAttribute('data-zapit-info')
			this.highlightedElement = null
		}
	}

	selectElement(element, event) {
		this.currentSelectedElement = element
		this.unhighlightElement()
		this.showContextMenu(element, event.clientX, event.clientY)
	}

	showContextMenu(element, x, y) {
		this.hideContextMenu()

		const menu = document.createElement('div')
		menu.className = 'zapit-context-menu'

		const tagName = element.tagName.toLowerCase()
		const selector = this.getElementSelector(element)

		menu.innerHTML = `
			<div class="zapit-context-menu-header">
				${tagName} - Available actions
			</div>
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

		const rect = menu.getBoundingClientRect()
		const viewportWidth = window.innerWidth
		const viewportHeight = window.innerHeight

		let finalX = x
		let finalY = y

		if (x + rect.width > viewportWidth) {
			finalX = viewportWidth - rect.width - 10
		}

		if (y + rect.height > viewportHeight) {
			finalY = viewportHeight - rect.height - 10
		}

		menu.style.left = `${finalX}px`
		menu.style.top = `${finalY}px`

		menu.querySelectorAll('.zapit-context-menu-item').forEach((item) => {
			item.addEventListener('click', (e) => {
				e.preventDefault()
				e.stopPropagation()
				const action = e.currentTarget.getAttribute('data-action')
				this.handleMenuAction(action, element)
			})
		})

		this.contextMenu = menu

		setTimeout(() => {
			const clickHandler = (event) => {
				if (!menu.contains(event.target)) {
					this.hideContextMenu()
					document.removeEventListener('click', clickHandler)
				}
			}
			document.addEventListener('click', clickHandler)
		}, 300)
	}

	hideContextMenu() {
		if (this.contextMenu) {
			this.contextMenu.remove()
			this.contextMenu = null
		}
	}

	async handleMenuAction(action, element) {
		this.hideContextMenu()

		const selector = this.getElementSelector(element)

		switch (action) {
			case 'remove':
				await this.removeElement(element, selector)
				break

			case 'style':
				this.showStylePanel(element, selector)
				break

			case 'cancel':
				break
		}
	}

	async removeElement(element, selector) {
		element.classList.add('zapit-removed')

		const rule = {
			selector: selector,
			action: 'remove',
			styles: {}
		}

		await this.saveRule(rule)
	}

	showStylePanel(element, selector) {
		this.hideStylePanel()

		const backdrop = document.createElement('div')
		backdrop.className = 'zapit-backdrop'
		document.body.appendChild(backdrop)

		const panel = document.createElement('div')
		panel.className = 'zapit-style-panel'

		const computedStyle = window.getComputedStyle(element)
		this.originalStyles = {
			backgroundColor: element.style.backgroundColor || '',
			color: element.style.color || '',
			fontSize: element.style.fontSize || '',
			border: element.style.border || '',
			padding: element.style.padding || '',
			margin: element.style.margin || ''
		}

		panel.innerHTML = `
			<div class="zapit-style-panel-header">
				<span>Edit Element Style</span>
				<button class="zapit-style-panel-close">×</button>
			</div>
			<div class="zapit-style-panel-content">
				<div class="zapit-style-group">
					<div class="zapit-style-group-title">Background Color</div>
					<input type="color" class="zapit-style-input" id="backgroundColor" 
						   value="${this.rgbToHex(computedStyle.backgroundColor)}" title="Click to choose background color">
				</div>
				
				<div class="zapit-style-group">
					<div class="zapit-style-group-title">Text Color</div>
					<input type="color" class="zapit-style-input" id="color" 
						   value="${this.rgbToHex(computedStyle.color)}" title="Click to choose text color">
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

		document.body.appendChild(panel)
		this.stylePanel = { panel, backdrop, element }

		// Add drag functionality
		this.makePanelDraggable(panel)

		panel.querySelector('.zapit-style-panel-close').addEventListener('click', () => {
			this.restoreOriginalStyles()
			this.hideStylePanel()
		})

		panel.querySelector('#applyStyles').addEventListener('click', async () => {
			await this.applyCustomStyles(element, selector)
		})

		panel.querySelector('#cancelStyles').addEventListener('click', () => {
			this.restoreOriginalStyles()
			this.hideStylePanel()
		})

		backdrop.addEventListener('click', () => {
			this.restoreOriginalStyles()
			this.hideStylePanel()
		})

		panel.querySelectorAll('.zapit-style-input').forEach((input) => {
			input.addEventListener('input', () => {
				this.previewStyles(element)
			})
		})
	}

	hideStylePanel() {
		if (this.stylePanel) {
			this.stylePanel.panel.remove()
			this.stylePanel.backdrop.remove()
			this.stylePanel = null
		}
	}

	previewStyles(element) {
		if (!this.stylePanel) return

		const panel = this.stylePanel.panel
		const inputs = panel.querySelectorAll('.zapit-style-input')

		inputs.forEach((input) => {
			if (input.value) {
				element.style[input.id] = input.value
			}
		})
	}

	async applyCustomStyles(element, selector) {
		const panel = this.stylePanel.panel
		const inputs = panel.querySelectorAll('.zapit-style-input')
		const styles = {}

		inputs.forEach((input) => {
			if (input.value) {
				styles[input.id] = input.value
			}
		})

		Object.keys(styles).forEach((property) => {
			element.style[property] = styles[property]
		})

		const rule = {
			selector: selector,
			action: 'style',
			styles: styles
		}

		await this.saveRule(rule)
		this.hideStylePanel()
	}

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
	}

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
			console.error('Error saving:', error)
		}
	}

	removeRuleFromDOM(rule) {
		try {
			const escapedSelector = this.escapeSelector(rule.selector)
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
				}
			})
		} catch (error) {
			console.error('Error removing rule from DOM:', rule, error)
		}
	}

	applyRules(rules) {
		this.clearAppliedStyles()

		rules.forEach((rule) => {
			try {
				const escapedSelector = this.escapeSelector(rule.selector)
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
					}
				})
			} catch (error) {
				console.error('Error applying rule:', rule, error)
			}
		})
	}

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
	}
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
	}

	makePanelDraggable(panel) {
		const header = panel.querySelector('.zapit-style-panel-header')
		if (!header) {
			console.log('Header not found!')
			return
		}

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

	restoreOriginalStyles() {
		if (!this.stylePanel || !this.stylePanel.element || !this.originalStyles) return

		const element = this.stylePanel.element
		Object.keys(this.originalStyles).forEach((property) => {
			element.style[property] = this.originalStyles[property]
		})
	}

	clearAppliedStyles() {
		const styledElements = document.querySelectorAll('[data-zapit-original-styles]')
		styledElements.forEach((element) => {
			const originalStyles = JSON.parse(element.dataset.zapitOriginalStyles)
			Object.keys(originalStyles).forEach((property) => {
				element.style[property] = originalStyles[property]
			})
			delete element.dataset.zapitOriginalStyles
		})

		const removedElements = document.querySelectorAll('.zapit-removed')
		removedElements.forEach((element) => {
			element.classList.remove('zapit-removed')
		})
	}
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', () => {
		new ZapItContentScript()
	})
} else {
	new ZapItContentScript()
}
