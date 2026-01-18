// ==UserScript==
// @name         AI Studio Typography Control
// @namespace    https://aistudio.google.com/
// @version      1.2.4
// @description  Fine-grained control over chat text appearance in Google AI Studio - font size, family, line spacing, and alignment
// @author       Pirelike
// @match        https://aistudio.google.com/*
// @icon         https://www.gstatic.com/aistudio/ai_studio_favicon_2_32x32.png
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    // ========================================
    // Configuration
    // ========================================

    const STORAGE_KEY = 'aistudio_typography_settings';

    // Font definitions with local/fallback pairs
    const FONT_OPTIONS = [
        { name: 'System Default', value: 'inherit', google: null },
        { name: 'Calibri / Carlito', value: 'Calibri, Carlito, sans-serif', google: 'Carlito' },
        { name: 'Verdana / Source Sans Pro', value: 'Verdana, "Source Sans Pro", sans-serif', google: 'Source+Sans+Pro' },
        { name: 'Georgia / Merriweather', value: 'Georgia, Merriweather, serif', google: 'Merriweather' },
        { name: 'Segoe UI / Open Sans', value: '"Segoe UI", "Open Sans", sans-serif', google: 'Open+Sans' },
        { name: 'Consolas / Source Code Pro', value: 'Consolas, "Source Code Pro", monospace', google: 'Source+Code+Pro' },
        { name: 'Arial / Roboto', value: 'Arial, Roboto, sans-serif', google: 'Roboto' },
        { name: 'Times New Roman / Libre Baskerville', value: '"Times New Roman", "Libre Baskerville", serif', google: 'Libre+Baskerville' },
        { name: 'Trebuchet MS / PT Sans', value: '"Trebuchet MS", "PT Sans", sans-serif', google: 'PT+Sans' },
        { name: 'Custom Font', value: 'custom', google: null }
    ];

    const DEFAULT_SETTINGS = {
        fontSize: '16px',
        lineHeight: '1.6',
        fontFamily: 'inherit',
        customFont: '',
        textAlign: 'left',
        hyphenation: true
    };

    // ========================================
    // State
    // ========================================

    let settings = { ...DEFAULT_SETTINGS };
    let panelVisible = false;
    let panelElement = null;
    let backdropElement = null;

    // ========================================
    // Storage Functions
    // ========================================

    function loadSettings() {
        try {
            if (typeof GM_getValue !== 'undefined') {
                const saved = GM_getValue(STORAGE_KEY, null);
                if (saved) {
                    settings = { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
                    return;
                }
            }
        } catch (e) {
            console.log('GM_getValue not available, falling back to localStorage');
        }

        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                settings = { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
            }
        } catch (e) {
            console.error('Failed to load settings:', e);
        }
    }

    function saveSettings() {
        try {
            const data = JSON.stringify(settings);
            if (typeof GM_setValue !== 'undefined') {
                GM_setValue(STORAGE_KEY, data);
            }
            localStorage.setItem(STORAGE_KEY, data);
        } catch (e) {
            console.error('Failed to save settings:', e);
        }
    }

    // ========================================
    // Google Fonts Loader
    // ========================================

    const loadedFonts = new Set();

    function loadGoogleFont(fontName) {
        if (!fontName || loadedFonts.has(fontName)) return;

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/ /g, '+')}:wght@400;500;600;700&display=swap`;
        document.head.appendChild(link);
        loadedFonts.add(fontName);
    }

    function loadFontFallbacks() {
        FONT_OPTIONS.forEach(font => {
            if (font.google) {
                loadGoogleFont(font.google);
            }
        });

        if (settings.customFont && settings.fontFamily === 'custom') {
            loadGoogleFont(settings.customFont);
        }
    }

    // We'll use simple Unicode/text icons instead of Material Symbols
    // since AI Studio's existing setup conflicts with our font loading
    const ICONS = {
        typography: '𝐓',
        alignLeft: '☰',
        alignJustify: '☰'
    };


    // ========================================
    // Theme Detection
    // ========================================

    function isDarkMode() {
        return document.body.classList.contains('dark-theme') ||
               document.documentElement.classList.contains('dark-theme') ||
               document.querySelector('.dark-theme') !== null;
    }

    function getThemeColors() {
        const dark = isDarkMode();
        return {
            bg: dark ? '#1e1f20' : '#ffffff',
            bgContainer: dark ? '#282a2c' : '#f8f9fa',
            bgHover: dark ? '#3c3d40' : '#f1f3f4',
            bgActive: dark ? '#4a4b4e' : '#e8eaed',
            text: dark ? '#e3e3e3' : '#1f1f1f',
            textSecondary: dark ? '#9aa0a6' : '#5f6368',
            border: dark ? '#444746' : '#dadce0',
            accent: dark ? '#8ab4f8' : '#1a73e8',
            accentBg: dark ? 'rgba(138, 180, 248, 0.1)' : 'rgba(26, 115, 232, 0.08)',
            shadow: dark ? 'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 0.15)'
        };
    }

    // ========================================
    // Apply Typography Styles
    // ========================================

    let styleElement = null;

    function applyStyles() {
        const fontFamily = settings.fontFamily === 'custom' && settings.customFont
            ? `"${settings.customFont}", sans-serif`
            : settings.fontFamily;

        const hyphenRules = settings.hyphenation ? `
            hyphens: auto !important;
            -webkit-hyphens: auto !important;
            -ms-hyphens: auto !important;
            word-break: break-word !important;
        ` : `
            hyphens: none !important;
            -webkit-hyphens: none !important;
            word-break: normal !important;
        `;

        const css = `
            /* Target ALL text content in chat messages */
            .chat-turn-container .turn-content,
            .chat-turn-container .turn-content *,
            .chat-turn-container .cmark-node,
            .chat-turn-container .cmark-node *,
            .chat-turn-container ms-cmark-node,
            .chat-turn-container ms-cmark-node *,
            .chat-session-content .turn-content,
            .chat-session-content .turn-content *,
            .chat-session-content .cmark-node,
            .chat-session-content .cmark-node *,
            .chat-session-content ms-cmark-node,
            .chat-session-content ms-cmark-node *,
            ms-chat-turn .turn-content,
            ms-chat-turn .turn-content *,
            ms-chat-turn .cmark-node,
            ms-chat-turn .cmark-node *,
            ms-chat-turn ms-cmark-node,
            ms-chat-turn ms-cmark-node *,
            .v3-font-body,
            .v3-font-body *,
            .text-chunk,
            .text-chunk * {
                font-size: ${settings.fontSize} !important;
                line-height: ${settings.lineHeight} !important;
                font-family: ${fontFamily} !important;
                text-align: ${settings.textAlign} !important;
            }

            /* Specific paragraph targeting */
            .chat-turn-container p,
            .chat-session-content p,
            ms-chat-turn p,
            .cmark-node p,
            ms-cmark-node p,
            .turn-content p {
                font-size: ${settings.fontSize} !important;
                line-height: ${settings.lineHeight} !important;
                font-family: ${fontFamily} !important;
                text-align: ${settings.textAlign} !important;
                ${settings.textAlign === 'justify' ? hyphenRules : ''}
            }

            /* List items */
            .chat-turn-container li,
            .chat-session-content li,
            ms-chat-turn li,
            .cmark-node li,
            ms-cmark-node li {
                font-size: ${settings.fontSize} !important;
                line-height: ${settings.lineHeight} !important;
                font-family: ${fontFamily} !important;
                text-align: ${settings.textAlign} !important;
            }

            /* Headings - slightly larger */
            .chat-turn-container h1, .chat-turn-container h2, .chat-turn-container h3,
            .chat-turn-container h4, .chat-turn-container h5, .chat-turn-container h6,
            .chat-session-content h1, .chat-session-content h2, .chat-session-content h3,
            .chat-session-content h4, .chat-session-content h5, .chat-session-content h6,
            ms-chat-turn h1, ms-chat-turn h2, ms-chat-turn h3,
            ms-chat-turn h4, ms-chat-turn h5, ms-chat-turn h6,
            .cmark-node h1, .cmark-node h2, .cmark-node h3,
            .cmark-node h4, .cmark-node h5, .cmark-node h6 {
                font-family: ${fontFamily} !important;
                line-height: ${settings.lineHeight} !important;
            }

            /* Preserve code block styling */
            .chat-turn-container pre,
            .chat-turn-container code,
            .chat-turn-container pre *,
            .chat-turn-container code *,
            .chat-session-content pre,
            .chat-session-content code,
            .chat-session-content pre *,
            .chat-session-content code *,
            ms-chat-turn pre,
            ms-chat-turn code,
            ms-chat-turn pre *,
            ms-chat-turn code *,
            .cmark-node pre,
            .cmark-node code,
            .cmark-node pre *,
            .cmark-node code *,
            ms-cmark-node pre,
            ms-cmark-node code {
                font-family: 'Google Sans Mono', 'Roboto Mono', Consolas, 'Source Code Pro', Monaco, monospace !important;
                text-align: left !important;
                hyphens: none !important;
            }
        `;

        if (styleElement) {
            styleElement.textContent = css;
        } else {
            styleElement = document.createElement('style');
            styleElement.id = 'aistudio-typography-styles';
            styleElement.textContent = css;
            document.head.appendChild(styleElement);
        }
    }

    // ========================================
    // Settings Panel
    // ========================================

    function createPanel() {
        if (panelElement) return;

        const colors = getThemeColors();

        // Create backdrop
        backdropElement = document.createElement('div');
        backdropElement.id = 'aistudio-typography-backdrop';
        document.body.appendChild(backdropElement);

        // Create panel
        panelElement = document.createElement('div');
        panelElement.id = 'aistudio-typography-panel';
        panelElement.innerHTML = `
            <div class="typo-header">
                <div class="typo-header-title">
                    <svg class="typo-header-icon" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M9.93 13.5h4.14L12 7.98zM20 2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-4.05 16.5-1.14-3H9.17l-1.12 3H5.96l5.11-13h1.86l5.11 13h-2.09z"/>
                    </svg>
                    <span>Typography</span>
                </div>
                <button class="typo-close-btn" aria-label="Close">&times;</button>
            </div>
            <div class="typo-body">
                <!-- Font Size -->
                <div class="typo-field">
                    <label class="typo-label">Font Size</label>
                    <div class="typo-stepper">
                        <button class="typo-stepper-btn" data-action="decrease-size">&minus;</button>
                        <input type="text" class="typo-stepper-input" id="typo-font-size" value="${settings.fontSize}">
                        <button class="typo-stepper-btn" data-action="increase-size">&plus;</button>
                    </div>
                </div>

                <!-- Line Spacing -->
                <div class="typo-field">
                    <label class="typo-label">Line Spacing</label>
                    <div class="typo-stepper">
                        <button class="typo-stepper-btn" data-action="decrease-line">&minus;</button>
                        <input type="text" class="typo-stepper-input" id="typo-line-height" value="${settings.lineHeight}">
                        <button class="typo-stepper-btn" data-action="increase-line">&plus;</button>
                    </div>
                </div>

                <!-- Font Family -->
                <div class="typo-field">
                    <label class="typo-label">Font Family</label>
                    <select class="typo-select" id="typo-font-family">
                        ${FONT_OPTIONS.map(f => `<option value="${f.value}" ${settings.fontFamily === f.value ? 'selected' : ''}>${f.name}</option>`).join('')}
                    </select>
                </div>

                <!-- Custom Font -->
                <div class="typo-field" id="typo-custom-font-field" style="display: ${settings.fontFamily === 'custom' ? 'block' : 'none'}">
                    <label class="typo-label">Custom Font Name</label>
                    <input type="text" class="typo-text-input" id="typo-custom-font" value="${settings.customFont}" placeholder="e.g., Lato, Nunito, Poppins">
                    <span class="typo-hint">Enter a Google Font or system font name</span>
                </div>

                <!-- Text Alignment -->
                <div class="typo-field">
                    <label class="typo-label">Text Alignment</label>
                    <div class="typo-toggle-group">
                        <button type="button" class="typo-toggle-btn ${settings.textAlign === 'left' ? 'active' : ''}" data-align="left" title="Left Align">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M15 15H3v2h12v-2zm0-8H3v2h12V7zM3 13h18v-2H3v2zm0 8h18v-2H3v2zM3 3v2h18V3H3z"/>
                            </svg>
                            <span>Left</span>
                        </button>
                        <button type="button" class="typo-toggle-btn ${settings.textAlign === 'justify' ? 'active' : ''}" data-align="justify" title="Justify">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M3 21h18v-2H3v2zm0-4h18v-2H3v2zm0-4h18v-2H3v2zm0-4h18V7H3v2zm0-6v2h18V3H3z"/>
                            </svg>
                            <span>Justify</span>
                        </button>
                    </div>
                </div>

                <!-- Hyphenation (only visible when justify is selected) -->
                <div class="typo-field" id="typo-hyphen-field" style="display: ${settings.textAlign === 'justify' ? 'block' : 'none'}">
                    <label class="typo-label">Word Breaking</label>
                    <div class="typo-toggle-group">
                        <button type="button" class="typo-toggle-btn ${settings.hyphenation ? 'active' : ''}" data-hyphen="true" title="Allow hyphenation">
                            <span>Hyphenate</span>
                        </button>
                        <button type="button" class="typo-toggle-btn ${!settings.hyphenation ? 'active' : ''}" data-hyphen="false" title="No hyphenation">
                            <span>No Break</span>
                        </button>
                    </div>
                </div>

                <!-- Reset -->
                <div class="typo-field typo-reset-field">
                    <button type="button" class="typo-reset-btn" id="typo-reset">Reset to Defaults</button>
                </div>
            </div>
        `;

        document.body.appendChild(panelElement);
        addPanelStyles();
        attachPanelEvents();
    }

    function addPanelStyles() {
        const colors = getThemeColors();

        const existingStyle = document.getElementById('aistudio-typography-panel-styles');
        if (existingStyle) existingStyle.remove();

        const style = document.createElement('style');
        style.id = 'aistudio-typography-panel-styles';
        style.textContent = `
            #aistudio-typography-backdrop {
                position: fixed;
                inset: 0;
                background: rgba(0, 0, 0, 0.4);
                z-index: 99999;
                opacity: 0;
                visibility: hidden;
                transition: opacity 0.2s ease, visibility 0.2s ease;
            }

            #aistudio-typography-backdrop.visible {
                opacity: 1;
                visibility: visible;
            }

            #aistudio-typography-panel {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%) scale(0.95);
                width: 340px;
                max-width: calc(100vw - 32px);
                max-height: calc(100vh - 32px);
                background: ${colors.bg};
                border-radius: 16px;
                box-shadow: 0 8px 32px ${colors.shadow}, 0 0 0 1px ${colors.border};
                z-index: 100000;
                font-family: 'Google Sans', 'Segoe UI', Roboto, sans-serif;
                opacity: 0;
                visibility: hidden;
                transition: opacity 0.2s ease, visibility 0.2s ease, transform 0.2s ease;
                overflow: hidden;
            }

            #aistudio-typography-panel.visible {
                opacity: 1;
                visibility: visible;
                transform: translate(-50%, -50%) scale(1);
            }

            .typo-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 16px 16px 16px 20px;
                border-bottom: 1px solid ${colors.border};
            }

            .typo-header-title {
                display: flex;
                align-items: center;
                gap: 12px;
                font-size: 16px;
                font-weight: 500;
                color: ${colors.text};
            }

            .typo-header-icon {
                font-size: 24px;
                color: ${colors.accent};
            }

            .typo-close-btn {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 36px;
                height: 36px;
                border: none;
                border-radius: 50%;
                background: transparent;
                color: ${colors.textSecondary};
                cursor: pointer;
                transition: background 0.15s ease;
            }

            .typo-close-btn:hover {
                background: ${colors.bgHover};
            }

            .typo-body {
                padding: 20px;
                overflow-y: auto;
                max-height: calc(100vh - 140px);
            }

            .typo-field {
                margin-bottom: 20px;
            }

            .typo-field:last-child {
                margin-bottom: 0;
            }

            .typo-label {
                display: block;
                font-size: 12px;
                font-weight: 500;
                color: ${colors.textSecondary};
                margin-bottom: 8px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .typo-stepper {
                display: flex;
                align-items: center;
                gap: 4px;
                background: ${colors.bgContainer};
                border-radius: 8px;
                padding: 4px;
            }

            .typo-stepper-btn {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 36px;
                height: 36px;
                border: none;
                border-radius: 6px;
                background: transparent;
                color: ${colors.text};
                cursor: pointer;
                transition: background 0.15s ease;
            }

            .typo-stepper-btn:hover {
                background: ${colors.bgHover};
            }

            .typo-stepper-btn:active {
                background: ${colors.bgActive};
            }

            .typo-stepper-input {
                flex: 1;
                min-width: 0;
                height: 36px;
                border: none;
                border-radius: 6px;
                background: ${colors.bg};
                color: ${colors.text};
                font-size: 14px;
                font-weight: 500;
                text-align: center;
                outline: none;
            }

            .typo-stepper-input:focus {
                box-shadow: 0 0 0 2px ${colors.accent};
            }

            .typo-select {
                width: 100%;
                height: 44px;
                padding: 0 12px;
                border: 1px solid ${colors.border};
                border-radius: 8px;
                background: ${colors.bg};
                color: ${colors.text};
                font-size: 14px;
                cursor: pointer;
                outline: none;
                transition: border-color 0.15s ease;
            }

            .typo-select:hover {
                border-color: ${colors.textSecondary};
            }

            .typo-select:focus {
                border-color: ${colors.accent};
            }

            .typo-text-input {
                width: 100%;
                height: 44px;
                padding: 0 12px;
                border: 1px solid ${colors.border};
                border-radius: 8px;
                background: ${colors.bg};
                color: ${colors.text};
                font-size: 14px;
                outline: none;
                box-sizing: border-box;
                transition: border-color 0.15s ease;
            }

            .typo-text-input:focus {
                border-color: ${colors.accent};
            }

            .typo-hint {
                display: block;
                font-size: 11px;
                color: ${colors.textSecondary};
                margin-top: 6px;
            }

            .typo-toggle-group {
                display: flex;
                gap: 8px;
                width: 100%;
            }

            .typo-toggle-btn {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
                flex: 1;
                height: 40px;
                padding: 0 16px;
                border: 1px solid ${colors.border};
                border-radius: 8px;
                background: ${colors.bg};
                color: ${colors.textSecondary};
                font-size: 13px;
                cursor: pointer;
                transition: all 0.15s ease;
            }

            .typo-toggle-btn:hover {
                background: ${colors.bgHover};
                border-color: ${colors.textSecondary};
            }

            .typo-toggle-btn.active {
                background: ${colors.accentBg};
                border-color: ${colors.accent};
                color: ${colors.accent};
            }

            .typo-toggle-btn svg {
                flex-shrink: 0;
            }

            .typo-toggle-label {
                font-weight: 500;
            }

            .typo-reset-field {
                padding-top: 16px;
                border-top: 1px solid ${colors.border};
                margin-top: 24px;
            }

            .typo-reset-btn {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                width: 100%;
                height: 44px;
                border: 1px solid ${colors.border};
                border-radius: 8px;
                background: ${colors.bg};
                color: ${colors.textSecondary};
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.15s ease;
            }

            .typo-reset-btn:hover {
                background: ${colors.bgHover};
                color: ${colors.text};
            }

        `;
        document.head.appendChild(style);
    }

    function attachPanelEvents() {
        // Close button
        const closeBtn = panelElement.querySelector('.typo-close-btn');
        closeBtn.addEventListener('click', hidePanel);

        // Backdrop click
        backdropElement.addEventListener('click', hidePanel);

        // Escape key
        document.addEventListener('keydown', handleKeyDown);

        // Font size controls
        panelElement.querySelector('[data-action="decrease-size"]').addEventListener('click', () => adjustFontSize(-1));
        panelElement.querySelector('[data-action="increase-size"]').addEventListener('click', () => adjustFontSize(1));

        // Line height controls
        panelElement.querySelector('[data-action="decrease-line"]').addEventListener('click', () => adjustLineHeight(-0.1));
        panelElement.querySelector('[data-action="increase-line"]').addEventListener('click', () => adjustLineHeight(0.1));

        // Font size input
        panelElement.querySelector('#typo-font-size').addEventListener('change', (e) => {
            settings.fontSize = e.target.value;
            saveSettings();
            applyStyles();
        });

        // Line height input
        panelElement.querySelector('#typo-line-height').addEventListener('change', (e) => {
            settings.lineHeight = e.target.value;
            saveSettings();
            applyStyles();
        });

        // Font family select
        panelElement.querySelector('#typo-font-family').addEventListener('change', (e) => {
            settings.fontFamily = e.target.value;
            document.getElementById('typo-custom-font-field').style.display =
                e.target.value === 'custom' ? 'block' : 'none';
            saveSettings();
            applyStyles();
        });

        // Custom font input
        panelElement.querySelector('#typo-custom-font').addEventListener('change', (e) => {
            settings.customFont = e.target.value;
            if (settings.customFont) {
                loadGoogleFont(settings.customFont);
            }
            saveSettings();
            applyStyles();
        });

        // Alignment buttons
        panelElement.querySelectorAll('.typo-toggle-btn[data-align]').forEach(btn => {
            btn.addEventListener('click', () => {
                panelElement.querySelectorAll('.typo-toggle-btn[data-align]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                settings.textAlign = btn.dataset.align;

                // Show/hide hyphenation option
                document.getElementById('typo-hyphen-field').style.display =
                    settings.textAlign === 'justify' ? 'block' : 'none';

                saveSettings();
                applyStyles();
            });
        });

        // Hyphenation buttons
        panelElement.querySelectorAll('.typo-toggle-btn[data-hyphen]').forEach(btn => {
            btn.addEventListener('click', () => {
                panelElement.querySelectorAll('.typo-toggle-btn[data-hyphen]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                settings.hyphenation = btn.dataset.hyphen === 'true';
                saveSettings();
                applyStyles();
            });
        });

        // Reset button
        panelElement.querySelector('#typo-reset').addEventListener('click', () => {
            settings = { ...DEFAULT_SETTINGS };
            saveSettings();
            updatePanelInputs();
            applyStyles();
        });
    }

    function handleKeyDown(e) {
        if (e.key === 'Escape' && panelVisible) {
            hidePanel();
        }
    }

    function adjustFontSize(delta) {
        const input = document.getElementById('typo-font-size');
        const match = settings.fontSize.match(/^([\d.]+)(.*)$/);
        if (match) {
            const value = Math.max(8, parseFloat(match[1]) + delta);
            const unit = match[2] || 'px';
            settings.fontSize = value + unit;
            input.value = settings.fontSize;
            saveSettings();
            applyStyles();
        }
    }

    function adjustLineHeight(delta) {
        const input = document.getElementById('typo-line-height');
        const value = Math.max(1, parseFloat(settings.lineHeight) + delta);
        settings.lineHeight = value.toFixed(1);
        input.value = settings.lineHeight;
        saveSettings();
        applyStyles();
    }

    function updatePanelInputs() {
        if (!panelElement) return;

        document.getElementById('typo-font-size').value = settings.fontSize;
        document.getElementById('typo-line-height').value = settings.lineHeight;
        document.getElementById('typo-font-family').value = settings.fontFamily;
        document.getElementById('typo-custom-font').value = settings.customFont;
        document.getElementById('typo-custom-font-field').style.display =
            settings.fontFamily === 'custom' ? 'block' : 'none';
        document.getElementById('typo-hyphen-field').style.display =
            settings.textAlign === 'justify' ? 'block' : 'none';

        panelElement.querySelectorAll('.typo-toggle-btn[data-align]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.align === settings.textAlign);
        });

        panelElement.querySelectorAll('.typo-toggle-btn[data-hyphen]').forEach(btn => {
            btn.classList.toggle('active', (btn.dataset.hyphen === 'true') === settings.hyphenation);
        });
    }

    function showPanel() {
        if (!panelElement) createPanel();
        updatePanelInputs();

        // Update styles for current theme
        addPanelStyles();

        panelElement.classList.add('visible');
        backdropElement.classList.add('visible');
        panelVisible = true;
    }

    function hidePanel() {
        if (panelElement) {
            panelElement.classList.remove('visible');
        }
        if (backdropElement) {
            backdropElement.classList.remove('visible');
        }
        panelVisible = false;
    }

    // ========================================
    // Sidebar Button
    // ========================================

    function addSidebarButton() {
        const findNavAndInsert = () => {
            const bottomActions = document.querySelector('.bottom-actions');

            if (bottomActions && !document.getElementById('aistudio-typography-sidebar-btn')) {
                // Match the exact structure of the "Let it snow" button
                const button = document.createElement('button');
                button.id = 'aistudio-typography-sidebar-btn';
                button.setAttribute('ms-button', '');
                button.setAttribute('variant', 'borderless');
                button.className = 'ms-button-borderless';
                button.setAttribute('aria-disabled', 'false');
                button.innerHTML = `<svg style="width:20px;height:20px;margin-right:8px;flex-shrink:0;" viewBox="0 0 24 24" fill="currentColor"><path d="M9.93 13.5h4.14L12 7.98zM20 2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-4.05 16.5-1.14-3H9.17l-1.12 3H5.96l5.11-13h1.86l5.11 13h-2.09z"/></svg><span>Typography</span>`;
                
                // Style to match other sidebar buttons (left-aligned)
                button.style.cssText = 'display: flex; align-items: center; justify-content: flex-start; width: 100%; text-align: left;';

                button.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (panelVisible) {
                        hidePanel();
                    } else {
                        showPanel();
                    }
                });

                // Insert before the "Let it snow" button or at the start
                const letItSnowBtn = bottomActions.querySelector('.let-it-snow-button');
                if (letItSnowBtn) {
                    bottomActions.insertBefore(button, letItSnowBtn);
                } else {
                    bottomActions.insertBefore(button, bottomActions.firstChild);
                }
                return true;
            }
            return false;
        };

        if (!findNavAndInsert()) {
            const observer = new MutationObserver((mutations, obs) => {
                if (findNavAndInsert()) {
                    obs.disconnect();
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            setTimeout(() => observer.disconnect(), 30000);
        }
    }

    // ========================================
    // Initialization
    // ========================================

    function init() {
        loadSettings();
        loadFontFallbacks();
        applyStyles();
        addSidebarButton();

        // Watch for theme changes
        const themeObserver = new MutationObserver(() => {
            if (panelElement) {
                addPanelStyles();
            }
        });

        themeObserver.observe(document.body, {
            attributes: true,
            attributeFilter: ['class']
        });

        console.log('AI Studio Typography Control v1.2.4 initialized');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
