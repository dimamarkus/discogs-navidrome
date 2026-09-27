# Your Library for Discogs — 0.2.1

An unofficial Chrome Manifest V3 extension that embeds playback from your own Navidrome library on Discogs release pages. Requires an HTTPS Navidrome server; native API compatibility targets Navidrome 0.64.

[Homepage](https://dimamarkus.github.io/discogs-navidrome/) · [Privacy policy](https://dimamarkus.github.io/discogs-navidrome/privacy.html) · [Support](https://github.com/dimamarkus/discogs-navidrome/issues)

The homepage and privacy links become available after GitHub Pages is enabled (see below).

## Install and test
1. Load the extension/ directory using Developer mode → Load unpacked at chrome://extensions. When updating, replace files in the existing directory and Reload.
2. Open Settings. Enter your server, grant that origin access, and sign in.
3. Test an album URL or catalog number from your library, then open a Discogs /release/ page.
4. The compact player appears above Videos where available. It collapses automatically when no match is found; its header toggles expansion while keeping playback running.

Automatic matching uses Navidrome's imported catalogNum field. The native catalog_num filter finds candidates; normalized local validation excludes incorrect suffix/edition matches. Labels/title/artist rank candidates, but catalog matching does not prove a pressing or mastering. Manual search, album selection, and remembered matches are available.

The seek slider uses full track metadata duration. Accurate native seeking is used when available; otherwise a single complete track is buffered before seeking, which can delay the first jump. Buffered audio is released on track change. Codec compatibility and transcoding depend on your server/browser. Playback stops when the page closes or reloads.

## 0.2.1 layout fix
Removed float clearing from the injected wrapper. It previously cleared Discogs’ floated main-column articles and pushed the sidebar player below the left-column content, creating a large blank space above it. The player remains immediately before Videos. This change is scoped to the extension wrapper; Discogs layout styles are not modified.

## Public-release changes
- Removed personal server and album defaults; the user selects their server.
- Only Discogs API access is pre-granted. Navidrome HTTPS origin access is requested at connection time.
- Passwords are not saved. Authentication and optional Discogs tokens use memory-backed Chrome session storage; reauthenticate after a browser restart. Server address, username and preferences remain local. Earlier persistent tokens migrate into session storage on upgrade.
- Added extension icons, privacy policy, listing copy, permission explanations, promotional graphics, and reviewer instructions.

## Publishing
See [store/START-HERE.md](store/START-HERE.md) for the dashboard fields and review checklist. Build the upload ZIP with:

```sh
python3 tools/package.py
```

Upload `dist/chrome-web-store-upload-0.2.1.zip`, which contains `manifest.json` at its root. The repository archive itself is not a store upload. Store submission and approval are separate from publishing this repository.

## Website and privacy hosting
In repository **Settings → Pages**, choose **Deploy from a branch**, branch **main**, folder **/docs**, then **Save**. Once deployment succeeds, use:

| Chrome Web Store field | URL |
| --- | --- |
| Homepage URL | https://dimamarkus.github.io/discogs-navidrome/ |
| Privacy policy URL | https://dimamarkus.github.io/discogs-navidrome/privacy.html |
| Support URL | https://github.com/dimamarkus/discogs-navidrome/issues |

The site uses plain HTML, with no build step, third-party fonts, scripts, or analytics. Edit `docs/index.html` for the homepage and `docs/privacy.html` for the hosted policy. When the extension's privacy practices change, update its bundled `extension/privacy.html` and the `store/privacy.html` copy too.

## Repository layout
- `extension/`: installable Chrome extension, version 0.2.1.
- `docs/`: public homepage and privacy policy for GitHub Pages.
- `store/`: listing copy, dashboard field guidance, review template, promotional artwork, and prior release validation notes.
- `tests/`: API, storage, playback fixtures, and browser integration scaffold.
- `tools/`: artwork generation and store ZIP packaging.

Keep real credentials and private reviewer access details out of this public repository; enter review credentials only in the store dashboard's private test instructions.

## Development and validation
Run `node --test tests/*.test.mjs` with Node 20+. The API, playback, URL-validation, and secret-storage fixtures total 25 tests. The Playwright browser integration scaffold requires Chromium. Chromium could not be downloaded in the build environment, so live browser validation is not claimed.

`python3 tools/build-artwork.py` regenerates icons/promotional graphics using Pillow. `node tests/browser.cjs` runs a local fixture in a copied extension with test-only localhost support; those permissions are not included in the public extension ZIP.

No music files, account credentials, or telemetry are bundled. This extension is not affiliated with Discogs or Navidrome.
