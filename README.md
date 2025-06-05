# AI Studio Chat Customizer

**Version:** 1.6.0
**Author:** pirelike

Customize the chat message appearance in Google's AI Studio (`aistudio.google.com`) for enhanced readability and a personalized experience. This userscript allows you to:

*   Adjust **font size** with fine-grained control (+/- buttons and direct input).
*   Change **font family** with a dropdown list, prioritizing installed Microsoft fonts and falling back to similar Google Fonts, or choose a fully custom font.
*   Toggle text **alignment** (justify or left).
*   Persistently **saves your preferences**.

## Features

*   **Font Size Control:**
    *   Increase/decrease font size in 1px steps.
    *   Directly input desired font size (e.g., "15.5px", "1.1em").
*   **Font Family Selection:**
    *   **Predefined Microsoft & Google Font Pairs:** Select common Microsoft fonts (like Calibri, Arial, Verdana, Times New Roman, Consolas). If the Microsoft font isn't installed on your system, the script automatically uses a visually similar Google Font as a fallback (e.g., Carlito for Calibri). The Google Font is pre-loaded to ensure a smooth fallback.
    *   **Generic System Fonts:** Choose default system sans-serif, serif, or monospace fonts.
    *   **Custom Font:** Select "Other (Custom Font)..." and type any font name. The script will attempt to load it from Google Fonts if it's not locally available.
*   **Text Alignment:**
    *   Switch between `justify` (default) and `left` alignment for model response paragraphs and list items.
*   **Persistent Settings:** Your chosen font size, family, and alignment are saved and automatically applied on future visits.
*   **Integrated UI:**
    *   A discreet settings icon (`text_format`) is added to the AI Studio sidebar.
    *   Clicking the icon opens a clean control panel to adjust settings.
    *   The panel can be closed by clicking the icon again or by clicking outside the panel.
    *   The panel intelligently positions itself next to the sidebar.
*   **Dynamic Font Loading:** Custom fonts and Google Font fallbacks are dynamically loaded into the page.

## Preview

*   *Example: Settings Panel*

      ![Screenshot_20250605_144228](https://github.com/user-attachments/assets/7474374e-61be-4bf2-8a8f-0e6157c4287b)

*   *Example: Customized Chat Text*

      ![Screenshot_20250605_144017](https://github.com/user-attachments/assets/e44e7eb4-896d-48ff-927b-a41fd058da2b)
      ![Screenshot_20250605_144355](https://github.com/user-attachments/assets/7de3a8c7-1ae5-4bd4-a972-1e2fd0856c7f)

## Installation

To use this userscript, you need a userscript manager browser extension. Popular choices include:

*   **Tampermonkey** (Recommended: Chrome, Firefox, Edge, Safari, Opera)
*   Violentmonkey (Chrome, Firefox, Edge, Opera)
*   Greasemonkey (Firefox - older versions might have compatibility issues with some scripts)

**Steps:**

1.  **Install a Userscript Manager:**
    *   Go to your browser's extension store (e.g., Chrome Web Store, Firefox Add-ons).
    *   Search for "Tampermonkey" (or your preferred manager) and install it.

2.  **Install the AI Studio Chat Customizer Script:**
    *   **Option A: Install from GitHub Raw File (Recommended)**
        1.  Navigate to the script file in this repository: `[Link to your .user.js file on GitHub, e.g., https://github.com/YOUR_USERNAME/YOUR_REPOSITORY/raw/main/ai-studio-chat-customizer.user.js]`
            *(Make sure this link points to the **raw** version of the `.user.js` file)*
        2.  Your userscript manager (e.g., Tampermonkey) should automatically detect the userscript and open an installation tab.
        3.  Review the script's permissions and details.
        4.  Click the "Install" button.

    *   **Option B: Create a New Script Manually (Alternative)**
        1.  Open your userscript manager's dashboard (usually by clicking its icon in your browser's toolbar).
        2.  Find an option like "Create a new script" or a "+" icon.
        3.  Delete any boilerplate code in the editor.
        4.  Go to the script file in this repository: `[Link to your .user.js file on GitHub, e.g., https://github.com/YOUR_USERNAME/YOUR_REPOSITORY/blob/main/ai-studio-chat-customizer.user.js]`
            *(This time, the link to the regular view of the file is fine)*
        5.  Copy the entire content of the `ai-studio-chat-customizer.user.js` file.
        6.  Paste the copied code into the userscript manager's editor.
        7.  Save the script (File > Save, or a save icon).

3.  **Verify Installation:**
    *   Go to [https://aistudio.google.com/](https://aistudio.google.com/).
    *   Once a chat interface is loaded, look for a new "text_format" ( Aa ) icon in the right-hand sidebar (near the "Model settings", "Safety settings" icons).
    *   If the icon is present, the script is installed and running.

## Usage

1.  **Open AI Studio:** Navigate to [https://aistudio.google.com/](https://aistudio.google.com/) and open or start a chat.
2.  **Access Settings:** Click the **`text_format`** ( Aa ) icon in the right sidebar. The "Chat Display Settings" panel will appear.
3.  **Adjust Settings:**
    *   **Font Size:**
        *   Click the `-` or `+` buttons to decrease or increase the font size.
        *   Type a specific size (e.g., `16px`, `1.2em`, `110%`) into the input field and press Enter or click away.
    *   **Font Family:**
        *   Select a font from the dropdown menu.
        *   If you choose "Other (Custom Font)...", an input field will appear. Type your desired font name (e.g., "Fira Code", "Roboto Mono"). The script will attempt to load it from Google Fonts if it's not a system font.
    *   **Text Align:**
        *   Click the "Align: Justify (Click to change)" or "Align: Left (Click to change)" button to toggle between justification modes.
4.  **Apply Changes:** Changes are applied live as you make them.
5.  **Close Panel:**
    *   Click the `text_format` icon again.
    *   Click anywhere outside the settings panel.

Your settings are automatically saved and will be reapplied the next time you visit AI Studio.

## Important Notes

*   **CSS Selectors:** This script relies on specific CSS selectors to target chat messages. If Google updates the HTML structure of AI Studio, the script might break or not apply styles correctly. If this happens, the selectors in the script will need to be updated.
*   **Font Availability:**
    *   For "Microsoft Font / Google Font" pairs, the script prioritizes the locally installed Microsoft font. If not found, it attempts to use the specified Google Font. The Google Font is always pre-loaded to ensure the fallback is available.
    *   For "Other (Custom Font)...", the script attempts to load the font from Google Fonts. If the font is not on Google Fonts or is misspelled, it will fall back to your browser's default for the category (e.g., sans-serif).
*   **Performance:** Loading multiple custom fonts (especially if "Other..." is used frequently with different fonts across sessions) could have a minor impact on page load time, though generally, it should be negligible for a few fonts.
*   **`@match` URL:** The script is set to run on `https://aistudio.google.com/*`.

## Troubleshooting

*   **Icon not appearing:**
    *   Ensure Tampermonkey (or your userscript manager) is enabled.
    *   Check the Tampermonkey dashboard to see if the script is enabled and doesn't show errors.
    *   The AI Studio page might have updated its structure. Check the browser's developer console (F12) for errors related to `AIStudioChatCustomizer`.
*   **Styles not applying:**
    *   This is most likely due to changes in AI Studio's HTML structure. The CSS selectors in the script may need updating.
    *   Check the developer console for errors.
*   **Custom font not working:**
    *   If using "Other...", ensure the font name is spelled correctly.
    *   The font might not be available on Google Fonts, or it might be a local font that the browser cannot access for web rendering in this context without specific font-face declarations (which this script simplifies by using Google Fonts).

## Contributing

Feel free to fork this repository, make improvements, and submit pull requests! If you encounter issues or have feature suggestions, please open an issue on GitHub.

## License

This project is licensed under the [MIT License](LICENSE.txt) (or choose another license if you prefer).
*(You'll need to add a `LICENSE.txt` file with the MIT license text if you choose MIT)*
