// ==UserScript==
// @name         AI Studio Chat Customizer (Advanced UI v1.6.0)
// @namespace    http://tampermonkey.net/
// @version      1.6.0
// @description  Prioritizes local MS fonts, falls back to Google Fonts. Justifies/aligns text, changes font size (+/-) and type. Panel closes on outside click.
// @author       pirelike
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
    // Ultimate fallback if nothing else works or is specified
    const ULTIMATE_FALLBACK_FONT = "sans-serif";
    const DEFAULT_FONT_FAMILY_KEY = "DEFAULT_SANS_SERIF"; // Key for the default selection

    const DEFAULT_TEXT_ALIGN = "justify";
    const FONT_SIZE_STEP = 1;

    // Structure: { name: "Display Name",
    //              value: "CSS_FONT_NAME_OR_KEY", // Unique key for this font option
    //              msFont: "Local Microsoft Font", // Optional: Preferred local Microsoft font
    //              googleFont: "Google Font Name" // Optional: Google Font fallback or primary
    //            }
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
        { name: "Other (Custom Font)..." , value: "OTHER_CUSTOM_FONT"} // Keep this for fully custom input
    ];

    // Determine the actual default font family string based on the key
    const DEFAULT_FONT_FAMILY_CSS = PREDEFINED_FONTS.find(f => f.value === DEFAULT_FONT_FAMILY_KEY)?.css || ULTIMATE_FALLBACK_FONT;

    const STORAGE_KEY_FONT_SIZE = `${SCRIPT_PREFIX}_fontSize`;
    const STORAGE_KEY_FONT_FAMILY_KEY = `${SCRIPT_PREFIX}_fontFamilyKey`; // Store the key, not the CSS string
    const STORAGE_KEY_CUSTOM_FONT_VALUE = `${SCRIPT_PREFIX}_customFontValue`; // Store the actual custom font name
    const STORAGE_KEY_TEXT_ALIGN = `${SCRIPT_PREFIX}_textAlign`;

    const STYLE_ID = `${SCRIPT_PREFIX}-styles`;
    const GOOGLE_FONTS_LINK_ID_PREFIX = `${SCRIPT_PREFIX}-google-font-`;
    const SIDEBAR_SELECTOR = 'div.toggles-container';

    let currentFontSize = DEFAULT_FONT_SIZE;
    let currentFontFamilyKey = DEFAULT_FONT_FAMILY_KEY; // The key of the selected font option
    let currentCustomFontValue = ""; // The actual string for a custom font
    let currentTextAlign = DEFAULT_TEXT_ALIGN;

    let controlPanel, fontSizeInput, fontFamilySelect, fontFamilyCustomInput,
        textAlignButton, settingsToggleButton, fontSizeIncButton, fontSizeDecButton;
    let globalSidebarContainer = null;
    let activeGoogleFontLinks = new Set();


    function handleClickOutside(event) {
        if (controlPanel && controlPanel.style.display !== 'none' &&
            settingsToggleButton &&
            !controlPanel.contains(event.target) &&
            !settingsToggleButton.contains(event.target) &&
            !settingsToggleButton.shadowRoot?.contains(event.target)
            ) {
            controlPanel.style.display = 'none';
            settingsToggleButton.setAttribute('aria-expanded', 'false');
            document.removeEventListener('mousedown', handleClickOutside);
        }
    }

    function getFontCssStack(fontKey, customFontName = "") {
        if (fontKey === "OTHER_CUSTOM_FONT") {
            if (customFontName) {
                // For "Other...", we assume it might be a Google Font, or a system font the user knows.
                // We'll try to load it from Google Fonts. If it's local, it will just work.
                return `"${customFontName.replace(/"/g, '')}", ${ULTIMATE_FALLBACK_FONT}`;
            }
            return DEFAULT_FONT_FAMILY_CSS; // Fallback if custom is empty
        }

        const fontConfig = PREDEFINED_FONTS.find(f => f.value === fontKey);
        if (!fontConfig) return DEFAULT_FONT_FAMILY_CSS;

        if (fontConfig.css) return fontConfig.css; // For generic system fonts like "sans-serif"

        let stack = [];
        if (fontConfig.msFont) stack.push(`"${fontConfig.msFont}"`);
        if (fontConfig.googleFont) stack.push(`"${fontConfig.googleFont}"`);
        stack.push(fontConfig.cssFallback || ULTIMATE_FALLBACK_FONT);

        return stack.join(', ');
    }

    function loadGoogleFont(fontName) {
        if (!fontName || PREDEFINED_FONTS.some(f => f.css === fontName)) return; // Don't load generic "sans-serif" etc.

        const fontLinkId = `${GOOGLE_FONTS_LINK_ID_PREFIX}${fontName.replace(/\s+/g, '-')}`;
        if (document.getElementById(fontLinkId) || activeGoogleFontLinks.has(fontLinkId)) {
            return; // Already loaded or link exists
        }

        const fontLink = document.createElement('link');
        fontLink.id = fontLinkId;
        fontLink.rel = 'stylesheet';
        fontLink.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName).replace(/%20/g, '+')}:wght@400;700&display=swap`;
        document.head.appendChild(fontLink);
        activeGoogleFontLinks.add(fontLinkId); // Track it
        console.log(`${SCRIPT_PREFIX}: Attempting to load Google Font: ${fontName}`);
    }

    function updateStylesAndFontLoading() {
        // Determine which Google Fonts to load
        // Always load Google Font alternatives for predefined MS/Google pairs
        PREDEFINED_FONTS.forEach(fontConfig => {
            if (fontConfig.googleFont) {
                loadGoogleFont(fontConfig.googleFont);
            }
        });

        // If "Other..." is selected and a custom font is entered, try to load it
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
            styleElement.type = 'text/css';
            (document.head || document.documentElement).appendChild(styleElement);
        }

        const cssRules = `
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
            div.chat-turn-container.model ms-prompt-chunk > ms-text-chunk ms-cmark-node span.inline-code {
                padding: 0.1em 0.4em !important;
                background-color: rgba(200,200,200,0.2) !important;
            }
        `;
        styleElement.textContent = cssRules;
        console.log(`${SCRIPT_PREFIX}: Applied font stack: ${finalFontCss}`);
    }


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
        if (!controlPanel || !globalSidebarContainer || controlPanel.style.display === 'none') {
            return;
        }
        const sidebarRect = globalSidebarContainer.getBoundingClientRect();
        const panelRect = controlPanel.getBoundingClientRect();

        let topPosition = sidebarRect.top;
        if (topPosition + panelRect.height > window.innerHeight - 10) {
            topPosition = Math.max(10, window.innerHeight - panelRect.height - 10);
        } else {
            topPosition = Math.max(10, topPosition);
        }
        controlPanel.style.top = `${topPosition}px`;
        controlPanel.style.right = `${window.innerWidth - sidebarRect.left + 10}px`;
        controlPanel.style.bottom = 'auto';
    }


    function createSettingsPanel() {
        controlPanel = document.createElement('div');
        controlPanel.id = `${SCRIPT_PREFIX}-control-panel`;
        controlPanel.setAttribute('role', 'dialog');
        controlPanel.setAttribute('aria-labelledby', `${SCRIPT_PREFIX}-panelTitle`);
        controlPanel.setAttribute('aria-modal', 'false');

        controlPanel.style.position = 'fixed';
        controlPanel.style.padding = '15px'; controlPanel.style.backgroundColor = 'rgba(250, 250, 250, 0.97)';
        controlPanel.style.border = '1px solid #ccc'; controlPanel.style.borderRadius = '8px';
        controlPanel.style.zIndex = '9998'; controlPanel.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        controlPanel.style.fontFamily = 'Roboto, Arial, sans-serif'; controlPanel.style.fontSize = '14px';
        controlPanel.style.display = 'none'; controlPanel.style.minWidth = '280px';

        const title = document.createElement('h4');
        title.id = `${SCRIPT_PREFIX}-panelTitle`;
        title.textContent = 'Chat Display Settings';
        title.style.marginTop = '0'; title.style.marginBottom = '15px'; title.style.textAlign = 'center'; title.style.color = '#333';
        controlPanel.appendChild(title);

        // Font Size Section
        const fsLabel = document.createElement('label');
        fsLabel.textContent = 'Font Size: ';
        fsLabel.htmlFor = `${SCRIPT_PREFIX}-fontSizeInput`;
        fsLabel.style.display = 'block'; fsLabel.style.marginBottom = '5px';
        controlPanel.appendChild(fsLabel);

        const fsControlContainer = document.createElement('div');
        fsControlContainer.style.display = 'flex';
        fsControlContainer.style.alignItems = 'stretch';
        fsControlContainer.style.marginBottom = '10px';

        fontSizeDecButton = document.createElement('button');
        fontSizeDecButton.textContent = '-';
        fontSizeDecButton.setAttribute('aria-label', 'Decrease font size');
        applySmallButtonStyles(fontSizeDecButton);
        fontSizeDecButton.style.backgroundColor = '#dc3545';
        fontSizeDecButton.style.color = 'white';
        fontSizeDecButton.style.borderRightWidth = '0';
        fontSizeDecButton.style.borderTopRightRadius = '0';
        fontSizeDecButton.style.borderBottomRightRadius = '0';
        fontSizeDecButton.addEventListener('click', async () => {
            let { number, unit } = parseFontSize(fontSizeInput.value);
            number = Math.max(1, number - FONT_SIZE_STEP);
            currentFontSize = `${number}${unit}`;
            fontSizeInput.value = currentFontSize;
            try {
                await GM_setValue(STORAGE_KEY_FONT_SIZE, currentFontSize);
            } catch (error) {
                console.error(`${SCRIPT_PREFIX}: Error saving font size:`, error);
            }
            updateStylesAndFontLoading();
        });
        fsControlContainer.appendChild(fontSizeDecButton);

        fontSizeInput = document.createElement('input');
        fontSizeInput.id = `${SCRIPT_PREFIX}-fontSizeInput`;
        fontSizeInput.type = 'text';
        fontSizeInput.value = currentFontSize;
        applyInputStyles(fontSizeInput, false);
        fontSizeInput.style.flexGrow = '1';
        fontSizeInput.style.textAlign = 'center';
        fontSizeInput.style.margin = '0';
        fontSizeInput.style.borderRadius = '0';
        fontSizeInput.style.borderLeftWidth = '1px';
        fontSizeInput.style.borderRightWidth = '1px';
        fontSizeInput.addEventListener('change', async () => {
            currentFontSize = fontSizeInput.value.trim() || DEFAULT_FONT_SIZE;
            fontSizeInput.value = currentFontSize;
            try {
                await GM_setValue(STORAGE_KEY_FONT_SIZE, currentFontSize);
            } catch (error) {
                console.error(`${SCRIPT_PREFIX}: Error saving font size:`, error);
            }
            updateStylesAndFontLoading();
        });
        fsControlContainer.appendChild(fontSizeInput);

        fontSizeIncButton = document.createElement('button');
        fontSizeIncButton.textContent = '+';
        fontSizeIncButton.setAttribute('aria-label', 'Increase font size');
        applySmallButtonStyles(fontSizeIncButton);
        fontSizeIncButton.style.backgroundColor = '#28a745';
        fontSizeIncButton.style.color = 'white';
        fontSizeIncButton.style.borderLeftWidth = '0';
        fontSizeIncButton.style.borderTopLeftRadius = '0';
        fontSizeIncButton.style.borderBottomLeftRadius = '0';
        fontSizeIncButton.addEventListener('click', async () => {
            let { number, unit } = parseFontSize(fontSizeInput.value);
            number += FONT_SIZE_STEP;
            currentFontSize = `${number}${unit}`;
            fontSizeInput.value = currentFontSize;
            try {
                await GM_setValue(STORAGE_KEY_FONT_SIZE, currentFontSize);
            } catch (error) {
                console.error(`${SCRIPT_PREFIX}: Error saving font size:`, error);
            }
            updateStylesAndFontLoading();
        });
        fsControlContainer.appendChild(fontSizeIncButton);
        controlPanel.appendChild(fsControlContainer);

        // Font Family Section
        const ffLabel = document.createElement('label');
        ffLabel.textContent = 'Font Family: ';
        ffLabel.htmlFor = `${SCRIPT_PREFIX}-fontFamilySelect`;
        ffLabel.style.display = 'block'; ffLabel.style.marginBottom = '5px';
        controlPanel.appendChild(ffLabel);

        fontFamilySelect = document.createElement('select');
        fontFamilySelect.id = `${SCRIPT_PREFIX}-fontFamilySelect`;
        applyInputStyles(fontFamilySelect);
        PREDEFINED_FONTS.forEach(font => {
            const option = document.createElement('option');
            option.value = font.value; // Use the unique key as value
            option.textContent = font.name;
            fontFamilySelect.appendChild(option);
        });
        fontFamilySelect.addEventListener('change', handleFontFamilyChange);
        controlPanel.appendChild(fontFamilySelect);

        fontFamilyCustomInput = document.createElement('input');
        fontFamilyCustomInput.type = 'text';
        fontFamilyCustomInput.placeholder = 'Enter custom font (e.g., from Google Fonts)';
        fontFamilyCustomInput.setAttribute('aria-label', 'Custom font family input');
        applyInputStyles(fontFamilyCustomInput);
        fontFamilyCustomInput.style.display = 'none';
        fontFamilyCustomInput.addEventListener('input', handleFontFamilyChange);
        controlPanel.appendChild(fontFamilyCustomInput);

        // Text Align Toggle Button
        textAlignButton = document.createElement('button');
        applyButtonStyles(textAlignButton);
        textAlignButton.style.marginTop = '15px';
        updateTextAlignButtonText();
        textAlignButton.addEventListener('click', async () => {
            currentTextAlign = (currentTextAlign === 'justify') ? 'left' : 'justify';
            updateTextAlignButtonText();
            try {
                await GM_setValue(STORAGE_KEY_TEXT_ALIGN, currentTextAlign);
            } catch (error) {
                console.error(`${SCRIPT_PREFIX}: Error saving text align:`, error);
            }
            updateStylesAndFontLoading();
        });
        controlPanel.appendChild(textAlignButton);

        document.body.appendChild(controlPanel);
    }

    async function handleFontFamilyChange() {
        const selectedKey = fontFamilySelect.value;
        currentFontFamilyKey = selectedKey; // Update the key

        if (selectedKey === "OTHER_CUSTOM_FONT") {
            fontFamilyCustomInput.style.display = 'block';
            currentCustomFontValue = fontFamilyCustomInput.value.trim();
            // Save the key and the custom value separately
            try {
                await GM_setValue(STORAGE_KEY_FONT_FAMILY_KEY, selectedKey);
                await GM_setValue(STORAGE_KEY_CUSTOM_FONT_VALUE, currentCustomFontValue);
            } catch (error) {
                console.error(`${SCRIPT_PREFIX}: Error saving custom font settings:`, error);
            }
        } else {
            fontFamilyCustomInput.style.display = 'none';
            fontFamilyCustomInput.value = ''; // Clear custom input
            currentCustomFontValue = ""; // Clear stored custom value
            try {
                await GM_setValue(STORAGE_KEY_FONT_FAMILY_KEY, selectedKey);
                await GM_setValue(STORAGE_KEY_CUSTOM_FONT_VALUE, ""); // Clear custom font from storage
            } catch (error) {
                console.error(`${SCRIPT_PREFIX}: Error saving font family key:`, error);
            }
        }
        updateStylesAndFontLoading();
    }

    function setInitialFontFamilyUI() {
        fontFamilySelect.value = currentFontFamilyKey;

        if (currentFontFamilyKey === "OTHER_CUSTOM_FONT") {
            fontFamilyCustomInput.style.display = 'block';
            fontFamilyCustomInput.value = currentCustomFontValue;
        } else {
            fontFamilyCustomInput.style.display = 'none';
            fontFamilyCustomInput.value = '';
        }
    }

    function applyInputStyles(inputElement, makeBlock = true) {
        if (makeBlock) inputElement.style.display = 'block';
        inputElement.style.width = 'calc(100% - 16px)';
        inputElement.style.padding = '8px';
        inputElement.style.marginBottom = '10px';
        inputElement.style.border = '1px solid #ddd';
        inputElement.style.borderRadius = '4px';
        inputElement.style.backgroundColor = '#fff';
        inputElement.style.boxSizing = 'border-box';
        inputElement.style.height = '38px';
    }

    function applyButtonStyles(buttonElement) {
        buttonElement.style.display = 'block'; buttonElement.style.width = '100%';
        buttonElement.style.padding = '10px'; buttonElement.style.backgroundColor = '#6c757d';
        buttonElement.style.color = 'white'; buttonElement.style.border = 'none';
        buttonElement.style.borderRadius = '4px'; buttonElement.style.textAlign = 'center';
        buttonElement.style.cursor = 'pointer'; buttonElement.style.fontSize = '14px';
        buttonElement.style.boxSizing = 'border-box';
    }

    function applySmallButtonStyles(buttonElement) {
        buttonElement.style.padding = '5px 10px';
        buttonElement.style.minWidth = '30px';
        buttonElement.style.border = '1px solid #ced4da';
        buttonElement.style.borderRadius = '4px';
        buttonElement.style.cursor = 'pointer';
        buttonElement.style.fontSize = '16px';
        buttonElement.style.lineHeight = '1';
        buttonElement.style.boxSizing = 'border-box';
        buttonElement.style.height = '38px';
        buttonElement.style.display = 'flex';
        buttonElement.style.alignItems = 'center';
        buttonElement.style.justifyContent = 'center';
    }

    function addToggleButtonToSidebar(sidebarContainer) {
        globalSidebarContainer = sidebarContainer;

        settingsToggleButton = document.createElement('button');
        settingsToggleButton.className = "mdc-icon-button mat-mdc-icon-button mat-mdc-button-base gmat-mdc-button mat-unthemed";
        settingsToggleButton.setAttribute('type', 'button');
        settingsToggleButton.setAttribute('mattooltip', 'Chat Display Settings');
        settingsToggleButton.title = 'Chat Display Settings';
        settingsToggleButton.setAttribute('mattooltipposition', 'left');
        settingsToggleButton.setAttribute('aria-label', 'Open Chat Display Settings');
        settingsToggleButton.setAttribute('aria-haspopup', 'dialog');
        settingsToggleButton.setAttribute('aria-expanded', 'false');

        const rippleSpan = document.createElement('span');
        rippleSpan.className = 'mat-mdc-button-persistent-ripple mdc-icon-button__ripple';
        settingsToggleButton.appendChild(rippleSpan);

        const iconSpan = document.createElement('span');
        iconSpan.textContent = 'text_format';
        iconSpan.className = 'material-symbols-outlined notranslate';
        iconSpan.setAttribute('aria-hidden', 'true');
        settingsToggleButton.appendChild(iconSpan);

        const focusIndicator = document.createElement('span');
        focusIndicator.className = 'mat-focus-indicator';
        settingsToggleButton.appendChild(focusIndicator);

        const touchTarget = document.createElement('span');
        touchTarget.className = 'mat-mdc-button-touch-target';
        settingsToggleButton.appendChild(touchTarget);

        settingsToggleButton.addEventListener('click', () => {
            const isHidden = controlPanel.style.display === 'none';
            controlPanel.style.display = isHidden ? 'block' : 'none';
            settingsToggleButton.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
            if (isHidden) {
                repositionControlPanel();
                document.addEventListener('mousedown', handleClickOutside);
            } else {
                document.removeEventListener('mousedown', handleClickOutside);
            }
        });
        sidebarContainer.appendChild(settingsToggleButton);
        console.log(`${SCRIPT_PREFIX}: Toggle button (icon: text_format) added to sidebar.`);
    }

    // --- Initialization ---
    async function init() {
        // Load settings
        try {
            currentFontSize = await GM_getValue(STORAGE_KEY_FONT_SIZE, DEFAULT_FONT_SIZE);
            currentFontFamilyKey = await GM_getValue(STORAGE_KEY_FONT_FAMILY_KEY, DEFAULT_FONT_FAMILY_KEY);
            currentCustomFontValue = await GM_getValue(STORAGE_KEY_CUSTOM_FONT_VALUE, "");
            currentTextAlign = await GM_getValue(STORAGE_KEY_TEXT_ALIGN, DEFAULT_TEXT_ALIGN);
        } catch (error) {
            console.error(`${SCRIPT_PREFIX}: Error loading settings:`, error);
            // Reset to defaults on error
            currentFontSize = DEFAULT_FONT_SIZE;
            currentFontFamilyKey = DEFAULT_FONT_FAMILY_KEY;
            currentCustomFontValue = "";
            currentTextAlign = DEFAULT_TEXT_ALIGN;
        }

        createSettingsPanel();
        setInitialFontFamilyUI();
        updateTextAlignButtonText();
        updateStylesAndFontLoading(); // This will also trigger initial Google Font loading

        window.addEventListener('resize', () => {
            if (controlPanel && controlPanel.style.display !== 'none' && globalSidebarContainer) {
                repositionControlPanel();
            }
        });

        const interval = setInterval(() => {
            const sidebarContainer = document.querySelector(SIDEBAR_SELECTOR);
            if (sidebarContainer) {
                clearInterval(interval);
                if (!document.body.contains(settingsToggleButton) && !sidebarContainer.contains(settingsToggleButton)) {
                     addToggleButtonToSidebar(sidebarContainer);
                }
            }
        }, 500);

        setTimeout(() => {
            clearInterval(interval);
            if (!globalSidebarContainer && (!settingsToggleButton || (!document.body.contains(settingsToggleButton) && (!globalSidebarContainer || !globalSidebarContainer.contains(settingsToggleButton))))) {
                console.warn(`${SCRIPT_PREFIX}: Sidebar container '${SIDEBAR_SELECTOR}' not found after 10 seconds. Toggle button not added.`);
            }
        }, 10000);
    }

    if (document.readyState === "complete" || document.readyState === "interactive") {
        init();
    } else {
        window.addEventListener('DOMContentLoaded', init, { once: true });
    }
})();
