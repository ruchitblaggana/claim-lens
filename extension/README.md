# ClaimLens — Read beyond the claim

A browser extension for capturing claims from any webpage, organizing supporting and contradicting evidence, and building traceable investigations. Local-first, private by design — no account, no backend, no AI service, no analytics.

**Creator:** Ruchit Blaggana, Delhi Public School, Vasant Kunj, New Delhi

---

## What ClaimLens does

ClaimLens helps you critically examine claims you encounter online by:

1. **Capturing claims** — select text on any webpage and save it with source URL, page title, timestamp, and surrounding context.
2. **Organizing evidence** — attach sources as supporting, contradicting, contextual, or unclear. Record source-quality assessments for each.
3. **Comparing perspectives** — see supporting and contradicting evidence grouped separately. No simplistic "truth percentage" — you make the assessment.
4. **Building investigations** — group multiple claims into a research investigation with linked evidence, notes, open questions, and a conclusion.
5. **Tracking conclusions** — record your assessment with traceable links to the evidence behind it. Update your status as your understanding evolves.

## How the extension works

- **Toolbar capture:** Click the ClaimLens icon while text is selected to save it as a claim.
- **Right-click context menu:** Select text, right-click, and choose "Save selection to ClaimLens."
- **Keyboard shortcut:** `Alt+Shift+C` captures the current selection. `Alt+Shift+L` opens the workspace.
- **Popup:** Quick access to capture, search recent claims, and open the full workspace.
- **Workspace:** Full investigation library with claim details, evidence management, source assessments, investigations, notes, search, filters, import/export, and a developer section.
- **Reading companion:** See which claims you've saved from the page you're currently browsing.
- **Options page:** Configure capture behavior, default evidence classification, export/import, data deletion, and privacy information.

## Supported browsers

- Google Chrome (Manifest V3)
- Microsoft Edge (Manifest V3)

## Installation — Google Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the built extension directory: `extension/dist/claimlens/` (run `node extension/tools/build.js` first) or `extension/` directly
5. Pin the extension if desired
6. Navigate to a normal webpage, select a sentence, and click the ClaimLens icon to test capture

## Installation — Microsoft Edge

1. Open `edge://extensions`
2. Enable **Developer mode** (toggle in the left sidebar)
3. Click **Load unpacked**
4. Select the built extension directory: `extension/dist/claimlens/` or `extension/` directly
5. Test the capture workflow on a normal webpage

> **Note:** This is a locally installed developer extension, not a published store extension. It has not been submitted to the Chrome Web Store or Microsoft Edge Add-ons store.

## How to use toolbar capture

1. Open any normal webpage (not a browser-internal page like `chrome://extensions`)
2. Select a sentence or passage with your mouse
3. Click the ClaimLens toolbar icon
4. The popup will show the current page and capture the selection
5. Click "Capture selected text" to save it
6. The claim is saved with its source URL, page title, timestamp, and surrounding context

## How to use the right-click context menu

1. Select text on any webpage
2. Right-click to open the browser's native context menu
3. Choose **"Save selection to ClaimLens"**
4. The claim is saved immediately with source metadata
5. The toolbar badge briefly highlights to confirm the save

## How to organize evidence

1. Open the **workspace** (popup → "Workspace" or `Alt+Shift+L`)
2. Click any claim to open its investigation workspace
3. In the **Evidence** section, click "Add evidence"
4. Fill in the evidence title, URL, publisher, relationship (supports/contradicts/context/challenges/unclear), source type, excerpt, and limitations
5. Optionally complete the **source quality assessment** (primary vs secondary, author identified, publication date, references, expertise, conflicts of interest, methodology, corroboration)
6. Save — the evidence appears grouped by relationship
7. Edit or delete evidence at any time

## How to export and import data

### Export
- **Full backup:** Workspace → "Import / Export" → "Export all data" — downloads a JSON file with all claims, evidence, investigations, notes, and associations
- **Single claim report:** Open a claim → "Export report" — downloads a JSON file for that claim and its evidence
- **Investigation export:** Open an investigation → "Export" — downloads a JSON file for the investigation and its linked claims/evidence
- **Settings page:** Options page → "Your data" → "Export all data (JSON)"

### Import
- Workspace → "Import / Export" → choose a JSON file — preview the records, then confirm
- Options page → "Import backup…" — preview and confirm
- Existing records with the same ID are skipped (no silent overwrites)
- Malformed files are rejected safely with an error message

## How to reset local data

1. Open the options page (popup → "Settings" or Chrome extension settings → "Extension options")
2. Scroll to **Danger zone**
3. Click "Delete all data"
4. Confirm — this permanently removes all claims, evidence, investigations, notes, and associations from IndexedDB

> Export a backup before deleting if you want to preserve your data.

## Permissions requested and why

| Permission | Why it's needed |
|-----------|----------------|
| `storage` | Save extension settings in `chrome.storage.local` |
| `contextMenus` | Create the "Save selection to ClaimLens" right-click menu item |
| `activeTab` | Access the current tab's URL, title, and selected text when the user clicks the extension icon |
| `scripting` | Inject a script to read the current text selection on the active page (required because popup focus prevents direct selection access in some browsers) |

No `host_permissions` are requested. The extension does not access any website unless you explicitly initiate a capture on that page.

## Current technical limitations

- **Restricted pages:** Browser-internal pages (`chrome://`, `edge://`, `about:`), the Chrome Web Store, and Edge Add-ons pages cannot be accessed by extension scripts. The extension shows a clear message when you try to capture from these pages.
- **Page highlighting:** Re-highlighting captured passages on revisited pages is a setting, but text matching may fail if the webpage has changed. The saved claim is always preserved regardless.
- **Keyboard shortcut conflicts:** The default `Alt+Shift+C` may conflict with other extensions. You can change it in Chrome's extension shortcut settings (`chrome://extensions/shortcuts`).
- **No sync:** Data is stored locally in each browser profile. Use export/import to transfer between profiles or machines.
- **No mobile support:** Browser extensions are not supported on mobile Chrome/Edge.
- **Service worker lifecycle:** Manifest V3 service workers may stop after inactivity. ClaimLens persists all data to IndexedDB, so captures survive service-worker and browser restarts. Context-menu and keyboard handlers are re-registered on startup.

## Privacy

- No analytics, telemetry, or tracking
- No account or login required
- No remote database, no AI service
- No automatic upload of captured text
- No background scraping of webpages
- No automatic reading of passwords, form inputs, or private fields
- All data is stored in IndexedDB on your device
- Deleting a claim also deletes its evidence, page associations, and attached notes

## Development

### Project structure

```
extension/
├── manifest.json          # Manifest V3 manifest
├── background.js           # Service worker (context menu, capture, commands)
├── content.js              # Content script (toast, companion, selection context)
├── popup.html / popup.js   # Toolbar popup (quick capture, recent claims)
├── workspace.html          # Full investigation workspace page
├── workspace.css           # Workspace styles
├── workspace.js            # Workspace app (library, detail, evidence, etc.)
├── options.html / options.js  # Settings page
├── styles.css              # Shared design system
├── util.js                 # Pure shared logic (IDs, validation, search, etc.)
├── db.js                   # IndexedDB storage layer
├── icons/                  # PNG toolbar icons (16/32/48/128px)
├── tools/
│   ├── make-icons.js       # Icon generator (run once)
│   └── build.js            # Build + zip script
└── test/
    └── util.test.js        # Unit tests (node --test)
```

### Running tests

```bash
node --test extension/test/util.test.js
```

### Building the extension

```bash
node extension/tools/build.js
```

Output: `extension/dist/claimlens/` (loadable unpacked) and `extension/dist/claimlens-v1.0.0.zip`.

### Generating icons

```bash
node extension/tools/make-icons.js
```

### Manual browser acceptance tests

Real-browser automated testing was not performed in the build environment. To verify manually:

1. **Fresh install:** Load `extension/` or `extension/dist/claimlens/` in Chrome or Edge developer mode. Confirm the toolbar icon appears and the popup opens.
2. **Capture:** Open a normal HTTPS webpage, select a sentence, click the toolbar icon, and capture. Verify the exact text is saved.
3. **Context menu:** Select text, right-click "Save selection to ClaimLens." Verify the claim appears in the library.
4. **Persistence:** Close the popup, reopen it, open the workspace. Confirm the claim is still there.
5. **Browser restart:** Restart the browser, reopen the workspace. Confirm data persists.
6. **Evidence:** Open a claim, add supporting and contradicting evidence, edit notes, reopen. Confirm persistence.
7. **Investigation:** Create an investigation, link claims, save a conclusion, reopen. Confirm links are correct.
8. **Page association:** Save a claim from a page, reopen that page, open the reading companion. Confirm association.
9. **Import/export:** Export, import into a fresh profile, verify data. Test malformed input rejection.
10. **Restricted pages:** Open `chrome://extensions`, try to capture. Confirm graceful error message.
11. **Service worker:** Wait for the service worker to stop (chrome://extensions → inspect), then use the context menu again. Confirm it works.
12. **Privacy:** Inspect the manifest — confirm no `host_permissions`, no analytics, no remote URLs.
