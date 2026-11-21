# Founder Fightclub — IDE companions

Pixel founders wander along the bottom of **VS Code and Cursor** while you code. This extension uses the published `founder-fightclub@1.0.0` npm package for its 35 characters, roasts, debates, and debugging guides.

## Install

1. Download `founder-fightclub-0.2.0.vsix` from [GitHub Releases](https://github.com/yashpanpaliya11/pixel-founder-arena/releases/tag/ide-v0.2.0).
2. In VS Code, open Extensions (`Ctrl+Shift+X` / `Cmd+Shift+X`). Choose **… → Install from VSIX…** and select the downloaded file.
3. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and run **Founder Fightclub: Open Companions**.
4. The founders appear in the bottom panel. Resize the panel to about 280px tall for speech bubbles. You can keep coding in the editor above it.

Or use `code --install-extension /path/to/founder-fightclub-0.2.0.vsix`. For Cursor, replace `code` with `cursor`.

This is a downloadable VSIX; it is awaiting publisher access for the VS Code Marketplace. Installing the npm core alone does not add an editor panel.

## Use

- **Automatic error reactions:** errors reported by your language extension in the active file trigger a roast and an English explanation. Use **Next hint** and **Go to error** to learn and navigate. Fix all reported errors in that file for a celebration.
- **35 founders available, with two or three active:** choose two or three from the roster, or switch to **Indian cast** (Anupam Mittal, Peyush Bansal, Aadit Palicha).
- **Debates with roasts:** select MRR, Marketing, Bootstrapping, Competitors, Product, or AI. Background debates run while the panel is visible.
- **English/Hinglish roasts:** everything else stays English.
- **Pause/Resume**, **Sample roast**, and native task completion reactions.

Try a real JavaScript syntax error: type `console.log("hello"` in a `.js` file and wait for the editor to report the missing `)`. Then fix it to `console.log("hello");`. **Sample roast** is a separate demonstration, not an editor diagnostic.

The extension reads editor diagnostics, not arbitrary terminal output. Your language support extension must report errors for automatic reactions. It does not execute or edit your code, send your code to a server, or require API keys. Companions live in a bottom panel; they do not overlay the editor text. Other IDEs are not yet supported. Characters use cropped pixel illustrations with walking/bobbing motion, not articulated animation frames.

## Settings

Search **Founder Fightclub** in Settings. Configure auto-start, roast language/intensity, error cooldown, debate topic/interval, and background debates. Your selected cast and pause state persist locally.

## Development

Node 22+, `npm ci`, `npm run check`, `npm test`. Open this folder in VS Code and press F5 to launch an Extension Development Host. `npm run package` builds the VSIX in `../../ide/`.

Characters and dialogue are fictional parody, not statements by or endorsements from the real people. Company badges identify the characters' associations. See the root ASSETS.md and MIT license.
