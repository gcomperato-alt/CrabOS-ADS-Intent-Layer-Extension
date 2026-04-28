# CrabOS Intent Layer v05 🦀

Universal ADS-style hover scanner, now with a stronger old-web / German music-page reader.

## What changed in v05

- Bottom-right crab click now always opens the main readout when clicked.
- Added stronger full-page text collection using `main`, `article`, `[role=main]`, `#content`, `.content`, `.news`, `.review`, `.box`, `.teaser`, and `body`.
- Added visible-link harvesting for old sites where the useful page map lives mostly in links.
- Added German / laut.de-style detection for music journalism, album reviews, charts, artist pages, comments, and concert navigation.
- Added a small self-read path for canornot-style local AI prompt pages.
- Kept the universal hover scanner from v04.

## Files

This folder is flat. Chrome/Edge should see:

- `manifest.json`
- `content.js`
- `style.css`
- `popup.html`
- `popup.js`
- `popup.css`
- `README.md`

## Install

1. Unzip.
2. Open `chrome://extensions` or `edge://extensions`.
3. Enable Developer mode.
4. Remove or disable older CrabOS versions.
5. Click **Load unpacked**.
6. Select this folder directly: `CrabOS_v05_GERMAN_OLD_WEB_PATCH_LOAD_THIS_FOLDER`.

The folder you select must directly contain `manifest.json`.

## Notes

- No ad blocking.
- No paywall bypassing.
- No playback tampering.
- Reads visible page text only.
