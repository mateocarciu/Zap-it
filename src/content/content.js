class ZapItContentScript {
	constructor() {
		this.isEditMode = false
		this.isSelecting = false
		this.currentSelectedElement = null
		this.currentEditingElement = null

		// init modules
		this.eventManager = new window.ZapItEventManager(this)
		this.elementSelector = new window.ZapItElementSelector(this)
		this.contextMenu = new window.ZapItContextMenu(this)
		this.stylePanel = new window.ZapItStylePanel(this)
		this.ruleManager = new window.ZapItRuleManager(this)
		this.textEditor = new window.ZapItTextEditor(this)

		this.init()
	}

	init() {
		this.eventManager.setupMessageListener()
		this.loadInitialState()
		this.ruleManager.loadAndApplyRules()
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
		return this.ruleManager.loadAndApplyRules()
	}

	enableEditMode() {
		this.isEditMode = true
		this.isSelecting = true
		document.body.classList.add('zapit-selection-mode')
		this.eventManager.setupEventListeners()
		this.elementSelector.showSelectionOverlay()
	}

	disableEditMode() {
		this.isEditMode = false
		this.isSelecting = false
		document.body.classList.remove('zapit-selection-mode')
		this.eventManager.removeEventListeners()
		this.elementSelector.hideSelectionOverlay()
		this.contextMenu.hide()
		this.stylePanel.hide()
	}
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', () => {
		new ZapItContentScript()
	})
} else {
	new ZapItContentScript()
}
