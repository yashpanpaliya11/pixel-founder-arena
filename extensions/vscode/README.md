# Founder Fightclub — IDE companions

Pixel founders wander along the bottom of **VS Code and Cursor** while you code. This extension uses the published `founder-fightclub@1.0.0` npm package for its 35 characters, error roasts, and debugging guides. The IDE panel has quick cartoon fights instead of topic debates.

## Install

1. Download `founder-fightclub-0.4.0.vsix` from [GitHub Releases](https://github.com/yashpanpaliya11/pixel-founder-arena/releases/tag/ide-v0.4.0).
2. In VS Code, open Extensions (`Ctrl+Shift+X` / `Cmd+Shift+X`). Choose **… → Install from VSIX…** and select the downloaded file.
3. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and run **Founder Fightclub: Open Companions**.
4. The founders appear in the bottom panel. Resize the panel to about 280px tall for speech bubbles. You can keep coding in the editor above it.

Or use `code --install-extension /path/to/founder-fightclub-0.4.0.vsix`. For Cursor, replace `code` with `cursor`.

The extension is [public on the VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=yashpanpaliya11.founder-fightclub). You can also install the VSIX directly. Installing the npm core alone does not add an editor panel.

## Use

- **Automatic error reactions:** errors reported by your language extension in the active file trigger a roast and an English explanation. Use **Next hint** and **Go to error** to learn and navigate. Fix all reported errors in that file for a celebration.
- **35 founders available, with two or three active:** choose two or three from the roster, or switch to **Indian cast** (Anupam Mittal, Peyush Bansal, Aadit Palicha).
- **Pixel fights:** click **Fight!** and the chosen founders trade one-word insults with moving arms and legs, punch/kick motion, dust, and cartoon red hit pixels. Fights can start automatically while the panel is visible.
- **Voice:** each fight taunt or coding error reaction speaks one word, while the coding error roast stays in its bubble. Hinglish mode uses Hindi words such as “गधा!” and “ढक्कन!” for fights. Voice is on by default; use **Voice: on/off** in the panel or the `founderFightclub.voice` setting. The editor uses available system speech voices. Click **Fight!** or **Sample roast** once if your editor requires a user action before audio plays.
- **English/Hinglish roasts:** everything else stays English.
- **Pause/Resume**, **Sample roast**, and native task completion reactions.

Try a real JavaScript syntax error: type `console.log("hello"` in a `.js` file and wait for the editor to report the missing `)`. Then fix it to `console.log("hello");`. **Sample roast** is a separate demonstration, not an editor diagnostic.

The extension reads editor diagnostics, not arbitrary terminal output. Your language support extension must report errors for automatic reactions. It does not execute or edit your code, send your code to a server, or require API keys. Companions live in a bottom panel; they do not overlay the editor text. Other IDEs are not yet supported. Characters use cropped pixel illustrations with animated pixel limbs and effects.

## Settings

Search **Founder Fightclub** in Settings. Configure auto-start, voice, roast language/intensity, error cooldown, fight interval, and background fights. Your selected cast and pause state persist locally.

## Development

Node 22+, `npm ci`, `npm run check`, `npm test`. Open this folder in VS Code and press F5 to launch an Extension Development Host. `npm run package` builds the VSIX in `../../ide/`.

Characters and dialogue are fictional parody, not statements by or endorsements from the real people. Company badges identify the characters' associations. See the root ASSETS.md and MIT license.
