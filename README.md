# 🎨 AI Studio Chat Customizer

[![Version](https://img.shields.io/badge/version-1.9.0-blue)](https://github.com/pirelike/AI-Studio-Chat-Customizer/blob/main/script.user.js)
[![Platform](https://img.shields.io/badge/platform-Tampermonkey-orange)](https://www.tampermonkey.net/)
[![License](https://img.shields.io/badge/license-MIT-green)](https://github.com/pirelike/AI-Studio-Chat-Customizer/blob/main/LICENSE)

A browser userscript that gives you fine-grained control over the appearance of chat text in Google's AI Studio. Enhance your reading experience by adjusting font size, family, line spacing, and text alignment to your exact preferences.

Tired of the default chat typography? Make it your own!



## ✨ Features

*   **Font Size Control**: Easily increase or decrease the font size with `+` and `-` buttons, or type in a specific value (e.g., `15px`, `1.1em`).
*   **Line Spacing Control**: Adjust the space between lines of text for optimal readability.
*   **Advanced Font Family Selection**:
    *   Choose from a curated list of professional, high-readability fonts.
    *   The script smartly prioritizes locally installed Microsoft fonts (like Calibri, Verdana) for speed and falls back to their Google Fonts equivalents (Carlito, Source Sans Pro) if they aren't available.
    *   Includes a "Custom Font" option to use any font from Google Fonts or your system.
*   **Text Alignment**: Switch between standard `left` alignment and `justified` text for a more book-like appearance.
*   **Persistent Settings**: Your preferences are automatically saved and applied every time you visit AI Studio.
*   **Intuitive UI**:
    *   A clean, floating settings panel that's easy to use.
    *   The panel automatically adapts to AI Studio's light or dark mode.
    *   Closes conveniently when you press `Esc` or click outside of it.
*   **Seamless Integration**: Adds a simple `Abc` icon to the AI Studio sidebar for easy access.

---

## 🚀 Installation Guide

Never used a userscript before? No problem! It's a simple two-step process.

### Step 1: Install a Userscript Manager

A userscript manager is a browser extension that runs scripts like this one. You only need to install it once.

Choose your browser below and click the link to install the recommended extension:

*   **Chrome**: [Tampermonkey](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
*   **Firefox**: [Tampermonkey](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/) or [Greasemonkey](https://addons.mozilla.org/en-US/firefox/addon/greasemonkey/)
*   **Edge**: [Tampermonkey](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd)
*   **Safari**: [Userscripts](https://apps.apple.com/us/app/userscripts/id1463298887)
*   **Brave / Opera / Vivaldi**: Install [Tampermonkey](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) from the Chrome Web Store.

### Step 2: Install the AI Studio Chat Customizer Script

With the userscript manager installed, you're ready to add the script.

1.  **Click the installation link below:**

    ### 👉 [**Install Script**](https://github.com/pirelike/AI-Studio-Chat-Customizer/raw/main/script.user.js)

2.  Your userscript manager will open a new tab and show you the script's source code and information. Click the **"Install"** button to confirm.

    

That's it! The script is now installed and will activate automatically when you visit Google AI Studio.

---

## ⚙️ How to Use

1.  Navigate to [**Google AI Studio**](https://aistudio.google.com/).
2.  In any chat, look for the new text format icon (**Abc**) in the right-hand sidebar, below the other icons like "History" and "Settings".
3.  Click this icon to open the **Chat Display Settings** panel.
4.  Adjust the settings as you wish. Changes are applied to the chat text instantly.
5.  Your settings are saved automatically. You can close the panel by pressing the `Esc` key or clicking anywhere else on the page.

### Configuration Details

*   **Custom Font**: To use a font not on the list (e.g., "Lexend" or "Fira Code"), select "Other (Custom Font)..." from the dropdown. An input box will appear. Type the name of the font exactly as it appears on [Google Fonts](https://fonts.google.com/). The script will automatically load it.
*   **Saved Data**: Your choices are saved in your browser's storage via the Tampermonkey extension, so they will persist across sessions.

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](https://github.com/pirelike/AI-Studio-Chat-Customizer/blob/main/LICENSE) file for details.
