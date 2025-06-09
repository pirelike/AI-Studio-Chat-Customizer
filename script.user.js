// ==UserScript==
// @name         AI Studio Chat Customizer (Advanced UI v1.8.3)
// @namespace    http://tampermonkey.net/
// @version      1.8.3
// @description  Prioritizes local MS fonts, falls back to Google Fonts. Justifies/aligns text, changes font size (+/-) and type. Panel closes on outside click or Esc, with focus management. Now supports dark mode!
// @author       pirelike (with AI improvements)
// @match        https://aistudio.google.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

(function() {
    'use strict';

    const SCRIPT_PREFIX = "AIStudioChatCustomizer";
    console.log(`${SCRIPT_PREFIX}: Script attempting to run.`);

    // --- Configuration ---
    const DEFAULT_FONT_SIZE = "16px";
    const ULTIMATE_FALLBACK_FONT = "sans-serif";
    const DEFAULT_FONT_FAMILY_KEY = "DEFAULT_SANS_SERIF";
    const DEFAULT_TEXT_ALIGN = "justify";
    const FONT_SIZE_STEP = 1;

    const PREDEFINED_FONTS = [
        { name: "Default System Sans-Serif", value: "DEFAULT_SANS_SERIF", css: "sans-serif" },
        { name: "Calibri (MS) / Carlito (Google)", value: "CALIBRI_CARLITO", msFont: "Calibri", googleFont: "Carlito", cssFallback: "sans-serif" },
        { name: "Arial (MS) / Roboto (Google)", value: "ARIAL_ROBOTO", msFont: "Arial", googleFont: "Roboto", cssFallback: "sans-serif"},
        { name: "Verdana (MS) / Source Sans Pro (Google)", value: "VERDANA_SSP", msFont: "Verdana", googleFont: "Source Sans Pro", cssFallback: "sans-serif"},
        { name: "Times New Roman (MS) / Noto Serif (Google)", value: "TNR_NOTO_SERIF", msFont: "Times New Roman", googleFont: "Noto Serif", cssFallback: "serif" },
        { name: "Georgia (MS) / Merriweather (Google)", value: "GEORGIA_MERRIWEATHER", msFont: "Georgia", googleFont: "Merriweather", cssFallback: "serif"},
        { name: "Consolas (MS) / Inconsolata (Google)", value: "CONSOLAS_INCONSOLATA", msFont: "Consolas", googleFont: "Inconsolata", cssFallback: "monospace" },
        { name: "Default System Serif", value: "DEFAULT_SERIF", css: "serif" },
        { name: "Default System Monospace", value: "DEFAULT_MONOSPACE", css: "monospace" },
        { name: "Other (Custom Font)..." , value: "OTHER_CUSTOM_FONT"}
    ];

    const DEFAULT_FONT_FAMILY_CSS = PREDEFINED_FONTS.find(f => f.value === DEFAULT_FONT_FAMILY_KEY)?.css || ULTIMATE_FALLBACK_FONT;

    const STORAGE_KEY_FONT_SIZE = `${SCRIPT_PREFIX}_fontSize`;
    const STORAGE_KEY_FONT_FAMILY_KEY = `${SCRIPT_PREFIX}_fontFamilyKey`;
    const STORAGE_KEY_CUSTOM_FONT_VALUE = `${SCRIPT_PREFIX}_customFontValue`;
    const STORAGE_KEY_TEXT_ALIGN = `${SCRIPT_PREFIX}_textAlign`;

    const STYLE_ID = `${SCRIPT_PREFIX}-styles`;
    const PANEL_STYLE_ID = `${SCRIPT_PREFIX}-panel-styles`;
    const GOOGLE_FONTS_LINK_ID_PREFIX = `${SCRIPT_PREFIX}-google-font-`;
    const SIDEBAR_SELECTOR = 'div.toggles-container';

    let currentFontSize, currentFontFamilyKey, currentCustomFontValue, currentTextAlign;
    let controlPanel, fontSizeInput, fontFamilySelect, fontFamilyCustomInput,
        textAlignButton, settingsToggleButton, fontSizeIncButton, fontSizeDecButton;
    let globalSidebarContainer = null;
    let activeGoogleFontLinks = new Set();
    let isDarkMode = false;

    // --- Dark Mode Detection ---
    function detectDarkMode() {
        const body = document.body;
        const html = document.documentElement;
        const isDark = body.classList.contains('dark-theme') ||
                      body.classList.contains('dark') ||
                      html.classList.contains('dark-theme') ||
                      html.classList.contains('dark') ||
                      body.getAttribute('data-theme') === 'dark' ||
                      html.getAttribute('data-theme') === 'dark' ||
                      isDarkColor(getComputedStyle(body).backgroundColor);
        return isDark;
    }

    function isDarkColor(color) {
        if (!color || color === 'transparent' || color === 'rgba(0, 0, 0, 0)') return false;
        const rgb = color.match(/\d+/g);
        if (!rgb || rgb.length < 3) return false;
        const [r, g, b] = rgb.map(Number);
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return luminance < 0.5;
    }

    function updateDarkModeState() {
        const newDarkMode = detectDarkMode();
        if (newDarkMode !== isDarkMode) {
            isDarkMode = newDarkMode;
            updatePanelStyles();
        }
    }

    // --- Panel State and Focus Management ---
    function openPanel() {
        if (!controlPanel || !settingsToggleButton) return;
        updateDarkModeState();
        controlPanel.style.display = 'block';
        settingsToggleButton.setAttribute('aria-expanded', 'true');
        repositionControlPanel();
        fontSizeInput.focus();
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handlePanelKeydown);
    }

    function closePanel() {
        if (!controlPanel || !settingsToggleButton) return;
        controlPanel.style.display = 'none';
        settingsToggleButton.setAttribute('aria-expanded', 'false');
        settingsToggleButton.focus();
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handlePanelKeydown);
    }

    function handleClickOutside(event) {
        if (controlPanel && controlPanel.style.display !== 'none' &&
            settingsToggleButton &&
            !controlPanel.contains(event.target) &&
            !settingsToggleButton.contains(event.target) &&
            !settingsToggleButton.shadowRoot?.contains(event.target)) {
            closePanel();
        }
    }

    function handlePanelKeydown(event) {
        if (event.key === 'Escape') {
            closePanel();
        }
    }

    // --- Font and Style Logic ---
    function getFontCssStack(fontKey, customFontName = "") {
        if (fontKey === "OTHER_CUSTOM_FONT" && customFontName) {
            return `"${customFontName.replace(/"/g, '')}", ${ULTIMATE_FALLBACK_FONT}`;
        }
        const fontConfig = PREDEFINED_FONTS.find(f => f.value === fontKey);
        if (!fontConfig) return DEFAULT_FONT_FAMILY_CSS;
        if (fontConfig.css) return fontConfig.css;
        const stack = [];
        if (fontConfig.msFont) stack.push(`"${fontConfig.msFont}"`);
        if (fontConfig.googleFont) stack.push(`"${fontConfig.googleFont}"`);
        stack.push(fontConfig.cssFallback || ULTIMATE_FALLBACK_FONT);
        return stack.join(', ');
    }

    function loadGoogleFont(fontName) {
        if (!fontName || PREDEFINED_FONTS.some(f => f.css === fontName)) return;
        const fontLinkId = `${GOOGLE_FONTS_LINK_ID_PREFIX}${fontName.replace(/\s+/g, '-')}`;
        if (document.getElementById(fontLinkId) || activeGoogleFontLinks.has(fontLinkId)) return;
        const fontLink = document.createElement('link');
        fontLink.id = fontLinkId;
        fontLink.rel = 'stylesheet';
        fontLink.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName).replace(/%20/g, '+')}:wght@400;700&display=swap`;
        document.head.appendChild(fontLink);
        activeGoogleFontLinks.add(fontLinkId);
    }

    function updateStylesAndFontLoading() {
        PREDEFINED_FONTS.forEach(fontConfig => {
            if (fontConfig.googleFont) loadGoogleFont(fontConfig.googleFont);
        });
        let finalFontCss;
        if (currentFontFamilyKey === "OTHER_CUSTOM_FONT" && currentCustomFontValue) {
            loadGoogleFont(currentCustomFontValue);
            finalFontCss = getFontCssStack(currentFontFamilyKey, currentCustomFontValue);
        } else {
            finalFontCss = getFontCssStack(currentFontFamilyKey);
        }
        let styleElement = document.getElementById(STYLE_ID);
        if (!styleElement) {
            styleElement = document.createElement('style');
            styleElement.id = STYLE_ID;
            document.head.appendChild(styleElement);
        }
        styleElement.textContent = `
            div.chat-turn-container.model ms-prompt-chunk > ms-text-chunk ms-cmark-node,
            div.chat-turn-container.model ms-prompt-chunk > ms-text-chunk ms-cmark-node span.inline-code {
                font-size: ${currentFontSize} !important;
                font-family: ${finalFontCss} !important;
            }
            div.chat-turn-container.model ms-prompt-chunk > ms-text-chunk ms-cmark-node p,
            div.chat-turn-container.model ms-prompt-chunk > ms-text-chunk ms-cmark-node li {
                text-align: ${currentTextAlign} !important;
                -webkit-hyphens: none !important; -moz-hyphens: none !important; -ms-hyphens: none !important; hyphens: none !important;
            }
        `;
    }

    // --- UI Creation ---
    function parseFontSize(value) {
        const num = parseFloat(value);
        const unit = value.match(/[a-zA-Z%]+$/)?.[0] || 'px';
        return { number: isNaN(num) ? parseFloat(DEFAULT_FONT_SIZE) : num, unit: unit };
    }

    function updateTextAlignButtonText() {
        if (textAlignButton) {
            textAlignButton.textContent = currentTextAlign === 'justify' ? 'Align: Justify (Click to change)' : 'Align: Left (Click to change)';
        }
    }

    function repositionControlPanel() {
        if (!controlPanel || !globalSidebarContainer || controlPanel.style.display === 'none') return;
        const sidebarRect = globalSidebarContainer.getBoundingClientRect();
        const panelRect = controlPanel.getBoundingClientRect();
        let topPosition = sidebarRect.top;
        if (topPosition + panelRect.height > window.innerHeight - 10) {
            topPosition = Math.max(10, window.innerHeight - panelRect.height - 10);
        }
        controlPanel.style.top = `${Math.max(10, topPosition)}px`;
        controlPanel.style.right = `${window.innerWidth - sidebarRect.left + 10}px`;
        controlPanel.style.bottom = 'auto';
    }

    function updatePanelStyles() {
        const styleElement = document.getElementById(PANEL_STYLE_ID);
        if (!styleElement) return;
        const theme = isDarkMode ? getDarkThemeCSS() : getLightThemeCSS();
        styleElement.textContent = getBaseCSS() + theme;
    }

    function getBaseCSS() {
        return `
            #${SCRIPT_PREFIX}-control-panel { position: fixed; display: none; min-width: 280px; padding: 15px; border-radius: 8px; z-index: 9998; box-shadow: 0 4px 12px rgba(0,0,0,0.15); font-family: Roboto, Arial, sans-serif; font-size: 14px; }
            #${SCRIPT_PREFIX}-panelTitle { margin-top: 0; margin-bottom: 15px; text-align: center; }
            #${SCRIPT_PREFIX}-control-panel label { display: block; margin-bottom: 5px; }
            .script-input-base { width: 100%; padding: 8px; margin-bottom: 10px; border-radius: 4px; box-sizing: border-box; height: 38px; }
            .script-button-small { display: flex; align-items: center; justify-content: center; padding: 5px 10px; min-width: 30px; border: none; cursor: pointer; font-size: 16px; line-height: 1; box-sizing: border-box; height: 38px; }
            .fs-control-container { display: flex; align-items: stretch; margin-bottom: 10px; border-radius: 4px; overflow: hidden; }
            .fs-control-container > * { border-radius: 0 !important; }
            #${SCRIPT_PREFIX}-fontSizeInput { flex-grow: 1; text-align: center; margin: 0; width: auto; margin-bottom: 0; }
            .btn-decr { background-color: #dc3545; color: white; }
            .btn-incr { background-color: #28a745; color: white; }
            /* --- CSS FIX: Force full width --- */
            .btn-full-width { display: block; width: 100% !important; text-align: left; padding-left: 8px; margin-top: 10px; margin-bottom: 0; cursor: pointer; }
        `;
    }

    function getLightThemeCSS() {
        return `
            #${SCRIPT_PREFIX}-control-panel { background-color: rgba(250, 250, 250, 0.97); border: 1px solid #ccc; }
            #${SCRIPT_PREFIX}-panelTitle, #${SCRIPT_PREFIX}-control-panel label { color: #333; }
            .script-input-base { border: 1px solid #ddd; background-color: #fff; color: #333; }
            .fs-control-container { border: 1px solid #ddd; }
            #${SCRIPT_PREFIX}-fontSizeInput { border-left: 1px solid #ddd !important; border-right: 1px solid #ddd !important; }
            .script-input-base:focus { outline: 2px solid #007bff; outline-offset: -2px; }
            /* --- CSS FIX: Force button to look like an input in light mode --- */
            .btn-full-width.script-input-base { background-color: #fff !important; border: 1px solid #ddd !important; color: #333 !important; }
            .btn-full-width.script-input-base:hover { border-color: #ccc !important; }
        `;
    }

    function getDarkThemeCSS() {
        return `
            #${SCRIPT_PREFIX}-control-panel { background-color: rgba(40, 40, 40, 0.97); border: 1px solid #555; }
            #${SCRIPT_PREFIX}-panelTitle, #${SCRIPT_PREFIX}-control-panel label { color: #e0e0e0; }
            .script-input-base { border: 1px solid #555; background-color: #333; color: #e0e0e0; }
            .script-input-base:hover:not(:focus) { border-color: #777; }
            .fs-control-container { border: 1px solid #555; }
            #${SCRIPT_PREFIX}-fontSizeInput { border-left: 1px solid #555 !important; border-right: 1px solid #555 !important; }
            .script-input-base:focus { outline: 2px solid #4dabf7; outline-offset: -2px; }
            .script-input-base::placeholder { color: #aaa; }
        `;
    }

    function injectPanelStyles() {
        if (document.getElementById(PANEL_STYLE_ID)) return;
        const styleElement = document.createElement('style');
        styleElement.id = PANEL_STYLE_ID;
        document.head.appendChild(styleElement);
        updateDarkModeState();
        updatePanelStyles();
    }

    function createSettingsPanel() {
        injectPanelStyles();
        controlPanel = document.createElement('div');
        controlPanel.id = `${SCRIPT_PREFIX}-control-panel`;
        controlPanel.setAttribute('role', 'dialog');
        const title = document.createElement('h4');
        title.id = `${SCRIPT_PREFIX}-panelTitle`;
        title.textContent = 'Chat Display Settings';
        controlPanel.appendChild(title);
        const fsLabel = document.createElement('label');
        fsLabel.textContent = 'Font Size: ';
        fsLabel.htmlFor = `${SCRIPT_PREFIX}-fontSizeInput`;
        controlPanel.appendChild(fsLabel);
        const fsControlContainer = document.createElement('div');
        fsControlContainer.className = 'fs-control-container';
        fontSizeDecButton = document.createElement('button');
        fontSizeDecButton.textContent = '-';
        fontSizeDecButton.className = 'script-button-small btn-decr';
        fontSizeDecButton.addEventListener('click', async () => {
            let { number, unit } = parseFontSize(fontSizeInput.value);
            fontSizeInput.value = currentFontSize = `${Math.max(1, number - FONT_SIZE_STEP)}${unit}`;
            await GM_setValue(STORAGE_KEY_FONT_SIZE, currentFontSize);
            updateStylesAndFontLoading();
        });
        fsControlContainer.appendChild(fontSizeDecButton);
        fontSizeInput = document.createElement('input');
        fontSizeInput.id = `${SCRIPT_PREFIX}-fontSizeInput`;
        fontSizeInput.type = 'text';
        fontSizeInput.value = currentFontSize;
        fontSizeInput.className = 'script-input-base';
        fontSizeInput.addEventListener('change', async () => {
            currentFontSize = fontSizeInput.value.trim() || DEFAULT_FONT_SIZE;
            fontSizeInput.value = currentFontSize;
            await GM_setValue(STORAGE_KEY_FONT_SIZE, currentFontSize);
            updateStylesAndFontLoading();
        });
        fsControlContainer.appendChild(fontSizeInput);
        fontSizeIncButton = document.createElement('button');
        fontSizeIncButton.textContent = '+';
        fontSizeIncButton.className = 'script-button-small btn-incr';
        fontSizeIncButton.addEventListener('click', async () => {
            let { number, unit } = parseFontSize(fontSizeInput.value);
            fontSizeInput.value = currentFontSize = `${number + FONT_SIZE_STEP}${unit}`;
            await GM_setValue(STORAGE_KEY_FONT_SIZE, currentFontSize);
            updateStylesAndFontLoading();
        });
        fsControlContainer.appendChild(fontSizeIncButton);
        controlPanel.appendChild(fsControlContainer);
        const ffLabel = document.createElement('label');
        ffLabel.textContent = 'Font Family: ';
        ffLabel.htmlFor = `${SCRIPT_PREFIX}-fontFamilySelect`;
        controlPanel.appendChild(ffLabel);
        fontFamilySelect = document.createElement('select');
        fontFamilySelect.id = `${SCRIPT_PREFIX}-fontFamilySelect`;
        fontFamilySelect.className = 'script-input-base';
        PREDEFINED_FONTS.forEach(font => {
            const option = document.createElement('option');
            option.value = font.value;
            option.textContent = font.name;
            fontFamilySelect.appendChild(option);
        });
        fontFamilySelect.addEventListener('change', handleFontFamilyChange);
        controlPanel.appendChild(fontFamilySelect);
        fontFamilyCustomInput = document.createElement('input');
        fontFamilyCustomInput.type = 'text';
        fontFamilyCustomInput.placeholder = 'Enter custom font (e.g., from Google Fonts)';
        fontFamilyCustomInput.className = 'script-input-base';
        fontFamilyCustomInput.style.display = 'none';
        fontFamilyCustomInput.addEventListener('input', handleFontFamilyChange);
        controlPanel.appendChild(fontFamilyCustomInput);
        textAlignButton = document.createElement('button');
        textAlignButton.className = 'script-input-base btn-full-width';
        updateTextAlignButtonText();
        textAlignButton.addEventListener('click', async () => {
            currentTextAlign = (currentTextAlign === 'justify') ? 'left' : 'justify';
            updateTextAlignButtonText();
            await GM_setValue(STORAGE_KEY_TEXT_ALIGN, currentTextAlign);
            updateStylesAndFontLoading();
        });
        controlPanel.appendChild(textAlignButton);
        document.body.appendChild(controlPanel);
    }

    async function handleFontFamilyChange() {
        const selectedKey = fontFamilySelect.value;
        currentFontFamilyKey = selectedKey;
        if (selectedKey === "OTHER_CUSTOM_FONT") {
            fontFamilyCustomInput.style.display = 'block';
            currentCustomFontValue = fontFamilyCustomInput.value.trim();
        } else {
            fontFamilyCustomInput.style.display = 'none';
            fontFamilyCustomInput.value = '';
            currentCustomFontValue = "";
        }
        await GM_setValue(STORAGE_KEY_FONT_FAMILY_KEY, selectedKey);
        await GM_setValue(STORAGE_KEY_CUSTOM_FONT_VALUE, currentCustomFontValue);
        updateStylesAndFontLoading();
    }

    function setInitialFontFamilyUI() {
        fontFamilySelect.value = currentFontFamilyKey;
        if (currentFontFamilyKey === "OTHER_CUSTOM_FONT") {
            fontFamilyCustomInput.style.display = 'block';
            fontFamilyCustomInput.value = currentCustomFontValue;
        }
    }

    function addToggleButtonToSidebar(sidebarContainer) {
        globalSidebarContainer = sidebarContainer;
        settingsToggleButton = document.createElement('button');
        settingsToggleButton.className = "mdc-icon-button mat-mdc-icon-button mat-mdc-button-base gmat-mdc-button mat-unthemed";
        settingsToggleButton.title = 'Chat Display Settings';
        Object.assign(settingsToggleButton.dataset, { mattooltip: 'Chat Display Settings', mattooltipposition: 'left' });
        settingsToggleButton.setAttribute('aria-haspopup', 'dialog');
        settingsToggleButton.setAttribute('aria-expanded', 'false');
        settingsToggleButton.innerHTML = `
            <span class="mat-mdc-button-persistent-ripple mdc-icon-button__ripple"></span>
            <span class="material-symbols-outlined notranslate" aria-hidden="true">text_format</span>
        `;
        settingsToggleButton.addEventListener('click', () => {
            if (controlPanel.style.display === 'none') openPanel();
            else closePanel();
        });
        sidebarContainer.appendChild(settingsToggleButton);
    }

    async function init() {
        try {
            currentFontSize = await GM_getValue(STORAGE_KEY_FONT_SIZE, DEFAULT_FONT_SIZE);
            currentFontFamilyKey = await GM_getValue(STORAGE_KEY_FONT_FAMILY_KEY, DEFAULT_FONT_FAMILY_KEY);
            currentCustomFontValue = await GM_getValue(STORAGE_KEY_CUSTOM_FONT_VALUE, "");
            currentTextAlign = await GM_getValue(STORAGE_KEY_TEXT_ALIGN, DEFAULT_TEXT_ALIGN);
        } catch (error) {
            console.error(`${SCRIPT_PREFIX}: Error loading settings:`, error);
            [currentFontSize, currentFontFamilyKey, currentCustomFontValue, currentTextAlign] = [DEFAULT_FONT_SIZE, DEFAULT_FONT_FAMILY_KEY, "", DEFAULT_TEXT_ALIGN];
        }

        createSettingsPanel();
        setInitialFontFamilyUI();
        updateTextAlignButtonText();
        updateStylesAndFontLoading();
        window.addEventListener('resize', repositionControlPanel);
        const observer = new MutationObserver(() => updateDarkModeState());
        observer.observe(document.body, { attributes: true, attributeFilter: ['class', 'data-theme'] });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] });
        const interval = setInterval(() => {
            const sidebarContainer = document.querySelector(SIDEBAR_SELECTOR);
            if (sidebarContainer && !sidebarContainer.querySelector('[title="Chat Display Settings"]')) {
                clearInterval(interval);
                addToggleButtonToSidebar(sidebarContainer);
            }
        }, 500);
        setTimeout(() => {
            clearInterval(interval);
            if (!globalSidebarContainer) console.warn(`${SCRIPT_PREFIX}: Sidebar not found.`);
        }, 10000);
    }

    if (document.readyState === "complete" || document.readyState === "interactive") init();
    else window.addEventListener('DOMContentLoaded', init, { once: true });

})();
