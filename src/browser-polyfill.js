/**
 * Firefox compatibility polyfill
 * This allows the use of chrome.* API in Firefox by mapping to browser.* API
 */

;(function () {
	'use strict'

	// Check if we're in Firefox
	if (typeof browser !== 'undefined') {
		window.chrome = browser
	}
})()
