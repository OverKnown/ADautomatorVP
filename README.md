[Открыть Automator Studio](https://overknown.github.io/ADautomatorVP/)

# Automator Studio

# !!! ENTIRELY VIBE-CODED !!!

I created this monstrosity to test Codex's capabilities and for my own use. I'm very ashamed of it.

A visual script builder for the **Antimatter Dimensions Automator**. English and Russian interfaces, connected Blockly blocks, generated code on the right, and projects saved on your device. A static site: no application server, accounts, or database required.

## Features

- English by default, with an **English / Русский** language selector. Your choice is saved in this browser. Switching languages preserves the current project, its text, and undo/redo history.
- Sequences, nested `IF`, `WHILE`, and `UNTIL`, condition waits, and pauses.
- `AUTO` (on/off/threshold), Infinity/Eternity/Reality with NOWAIT and RESPEC.
- Purchase studies by ID, load in-game presets 1–6, respec studies, unlock EC/Dilation, start EC/Dilation, and control the Black Hole.
- Comments, notifications, stop commands, and a block for one line of unchecked custom code.
- Code generation, parameter and block connection validation, and navigation to problematic blocks.
- Autosave in `localStorage`, JSON projects, code copying and TXT export, undo/redo.
- Three learning examples. Adjust their thresholds to your own save.

## Running locally

Requires Node.js 24 LTS.

```sh
npm ci
npm run dev
```

Open the URL printed by Vite. To test, build, and preview:

```sh
npm test
npm run build
npm run preview
```

The contents of `dist/` can be deployed to any static host. Relative paths support hosting in a GitHub Pages subdirectory. Do not open `index.html` by double-clicking it: the application uses JavaScript modules and requires HTTP(S).

## GitHub Pages

The repository includes the workflow `.github/workflows/pages.yml`.

GitHub Pages is free for public repositories. Private repositories require an eligible paid GitHub plan. Neither the application nor the workflow changes repository visibility.

1. In GitHub, open **Settings → Pages → Build and deployment → Source → GitHub Actions**.
2. Merge the changes into `main`. Each push to `main` runs the tests, builds the site, and publishes `dist/`. Pull requests only run checks.
3. If needed, run **Actions → Build and deploy to GitHub Pages → Run workflow** on `main`.
4. The published URL appears in the `deploy` job output and in Settings → Pages. The expected URL for this repository is `https://overknown.github.io/ADautomatorVP/` (available only after a successful deployment).

If Pages has not been enabled or is restricted by repository settings, the build is still checked, but publishing requires the setup above.

## Working with projects

Drag blocks from the categories into a single chain below “Script start”. Edit parameters directly in the blocks. Nest commands inside conditions and loops. Delete a block by dragging it onto the trashcan or using its context menu. Clicking a code line or an error shows the associated block.

**Save project** downloads a JSON file containing the blocks. **Open TXT / JSON** restores a JSON project or converts Automator text into blocks. **Paste code** lets you import text manually from the clipboard. You can edit TXT in the game and open it again: block positions are rebuilt. JSON remains the backup format that preserves block positions.

Autosave is specific to this site's URL and your browser. Clearing site data deletes it. Save JSON files to transfer projects between devices. If changes are detected in another tab, autosave pauses: download your copy and reload the page. A damaged import does not replace the open project; damaged autosave data is not overwritten automatically.

The workspace is limited to 500 blocks. JSON files are limited to 2 MB and 80 levels of nested conditions. Project files and contents are not sent to a server. Fonts and graphical assets are bundled; no third-party CDNs are required. This is not a PWA: reloading the site offline is not guaranteed to work.

On phones, **Blocks / Code** switches between the editor and script. **＋ Block** opens a catalog; tap a command to append it to the script. Drag blocks to nest them in conditions or loops. File actions and the language selector are available in **Project**. Tap a code line or issue to reveal its block.

## Compatibility and validation limits

Syntax was checked against the game's [automator-commands.js](https://github.com/IvarK/AntimatterDimensionsSourceCode/blob/master/src/core/automator/automator-commands.js) and [lexer.js](https://github.com/IvarK/AntimatterDimensionsSourceCode/blob/master/src/core/automator/lexer.js) on November 4, 2026.

Validation covers structure, supported command parameters, number notation, study IDs, and restrictions such as Infinity having no `RESPEC`. Large values (`1e1000`) are preserved as strings. The “Custom code” block is always marked as unchecked. Built-in blocks accept a limited subset of the syntax: for example, study purchases use a list of IDs, and comparisons use a resource and a number.

The editor **is not a simulator**: it does not check feature unlocks, preset availability, reachable thresholds, sufficient Time Theorems, or progression strategy. Final validation and execution happen in the game's Automator. Auto prestige requires the corresponding in-game unlocks.

## Source structure

- `src/blocks.ts` — blocks, categories, and conversion to a command tree.
- `src/compiler.ts` — code generation, validation, and mapping code lines to blocks.
- `src/project.ts` — JSON format, safe loading, conversion from commands to blocks, and learning examples.
- `src/parser.ts` — Automator text parsing into a command tree.
- `src/i18n.ts` — English/Russian translations and language preferences.
- `src/main.ts` — interface, language switching, local storage, and import/export.
- `tests/editor.test.ts` — generation and persistence checks without a browser.
- `tests/parser.test.ts` — TXT parsing and blocks → TXT → blocks round-trip checks.
- `tests/i18n.test.ts` — language defaults, translations, and project preservation when switching languages.

Blockly is distributed under Apache-2.0; its graphical asset license is in `public/blockly-media/LICENSE`. Manrope and IBM Plex Mono are supplied through Fontsource; their license files are saved in `public/licenses/`. This project is not an official part of Antimatter Dimensions.

## Importing Automator code

The parser shares the `Command` tree and parameter validation with the generator. It supports all commands generated by standard blocks, including nested IF/WHILE/UNTIL, `#` and `//` comments, case-insensitive commands, and Windows line endings. An opening brace may follow the condition or appear on the next line; a closing brace must be on its own line. Single-line loop bodies are not supported.

Unknown individual commands, including advanced language forms, are preserved in “Custom code” blocks and require validation in the game. This is not full syntax validation: an invalid unknown line is also preserved with a warning. Unknown braced structures, structural errors, and invalid parameters in recognized commands are rejected with a line number. An error does not replace the current project. Inline comments after commands become separate blocks; blank lines and indentation are normalized.

`src/parser.ts` converts TXT into a command tree; `commandsToProject` in `src/project.ts` builds blocks from that tree. When adding a command, update its text recognition and the blocks → TXT → blocks round-trip test. Changing the appearance of blocks does not require changing the parser.
