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

		panel.innerHTML = `
			<div class="zapit-style-panel-header">
				<span>🎨 Edit style</span>
				<button class="zapit-style-panel-close">×</button>
			</div>
			<div class="zapit-style-panel-content">
				<div class="zapit-style-group">
					<div class="zapit-style-group-title">Background color</div>
					<input type="color" class="zapit-style-input" id="backgroundColor" 
						   value="${this.rgbToHex(computedStyle.backgroundColor)}">
				</div>
				
				<div class="zapit-style-group">
					<div class="zapit-style-group-title">Text color</div>
					<input type="color" class="zapit-style-input" id="color" 
						   value="${this.rgbToHex(computedStyle.color)}">
				</div>
				
				<div class="zapit-style-group">
					<div class="zapit-style-group-title">Font size</div>
					<input type="text" class="zapit-style-input" id="fontSize" 
						   value="${computedStyle.fontSize}" placeholder="16px">
				</div>
				
				<div class="zapit-style-group">
					<div class="zapit-style-group-title">Border</div>
					<input type="text" class="zapit-style-input" id="border" 
						   value="${computedStyle.border}" placeholder="1px solid #000">
				</div>
				
				<div class="zapit-style-group">
					<div class="zapit-style-group-title">Padding</div>
					<input type="text" class="zapit-style-input" id="padding" 
						   value="${computedStyle.padding}" placeholder="10px">
				</div>
				
				<div class="zapit-style-group">
					<div class="zapit-style-group-title">Margin</div>
					<input type="text" class="zapit-style-input" id="margin" 
						   value="${computedStyle.margin}" placeholder="10px">
				</div>
				
				<div class="zapit-style-buttons">
					<button class="zapit-button zapit-button-primary" id="applyStyles">
						Apply
					</button>
					<button class="zapit-button zapit-button-secondary" id="cancelStyles">
						Cancel
					</button>
				</div>
			</div>
		`

		document.body.appendChild(panel)
		this.stylePanel = { panel, backdrop }

		panel.querySelector('.zapit-style-panel-close').addEventListener('click', () => {
			this.hideStylePanel()
		})

		panel.querySelector('#applyStyles').addEventListener('click', async () => {
			await this.applyCustomStyles(element, selector)
		})

		panel.querySelector('#cancelStyles').addEventListener('click', () => {
			this.hideStylePanel()
		})

		backdrop.addEventListener('click', () => {
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
						if (rule.styles) {
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
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', () => {
		new ZapItContentScript()
	})
} else {
	new ZapItContentScript()
}
