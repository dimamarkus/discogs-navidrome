# Publish Your Library for Discogs 0.2.1

## Repository and website
Run `python3 tools/package.py` from the repository root to create the store upload in `dist/`. In GitHub Settings → Pages choose **Deploy from a branch**, **main**, **/docs**, then **Save**. The ready-to-publish homepage and policy are in `docs/`.

| Dashboard field | Value after Pages deployment |
| --- | --- |
| Homepage URL | https://dimamarkus.github.io/discogs-navidrome/ |
| Privacy policy URL | https://dimamarkus.github.io/discogs-navidrome/privacy.html |
| Support URL | https://github.com/dimamarkus/discogs-navidrome/issues |

## Files
- `chrome-web-store-upload-0.2.1.zip`: the actual store upload. Its root contains manifest.json. Upload it as-is; do not upload the enclosing release kit ZIP.
- `extension/`: installable source for local testing.
- `store/LISTING.md`: listing text.
- `store/PRIVACY-FIELDS.md`: purpose, permission explanations, and disclosure guidance.
- `store/privacy.html`: complete static privacy page, ready to host on your HTTPS website. It identifies the publisher as dmi3000, as shown in your dashboard. Adjust this if you change the publisher name. Contact is the public publisher email on the store listing.
- `store/REVIEWER-INSTRUCTIONS.md`: review procedure and required private test-account details.
- `store/assets/`: 128px icon, required 440×280 promo, optional 1400×560 marquee. Source artwork generation is in tools/.

## Finish before requesting review
1. Test the public build on your actual HTTPS server and Discogs release pages. Confirm empty/default setup, permission prompt, login, matching, playback, seeking, manual matches, and collapse. The unit fixtures passed; live browser/server verification has not been completed in this environment.
2. Capture at least one real 1280×800 or 640×400 screenshot in Chrome showing the updated extension on a release page. A second screenshot can show settings with blank credentials. Exclude private tokens, passwords, and reviewer credentials. No fabricated screenshot is included.
3. Enable GitHub Pages as described above. Verify the privacy page opens without login; enter its URL in the privacy field.
4. Configure review access and fill the private Test instructions fields. A review server/account has not been created by this package.
5. In the Chrome Web Store dashboard open the existing draft (or choose New item for a first submission), upload chrome-web-store-upload-0.2.1.zip, and fill the listing/privacy/distribution/test tabs using these documents.
6. Choose Unlisted for an initial release if desired. Unlisted installs are available to anyone with the store link. This still needs review.
7. Submit for review after the above checks. Review approval and timing are controlled by Google.

## Updating your unpacked installation
Replace the contents of the same existing extension folder with extension/ from this kit, then Reload in chrome://extensions and refresh Discogs tabs. Existing persistent tokens are migrated into session memory; you may need to sign in again. New installations start with no server configured.

A separately installed Web Store build can have a different extension ID and separate storage. Disable the unpacked copy before testing a store-installed copy to avoid duplicate players; connect the store build separately.

## Screenshot capture
Use Chrome DevTools' device toolbar in Responsive mode, set the viewport to 1280×800 at 100% browser zoom, and capture a viewport screenshot of the live page. Show the player expanded near Videos with a selected track and timeline. Use a second real screenshot for the collapsed state if useful. Keep file dimensions within the store requirements. The included promotional graphics are branding assets, not screenshots.

## Known limits
Navidrome native API compatibility targets 0.64; native APIs may change. Plex is not supported. HTTPS is required, including for local servers in the public build. Closing/reloading a Discogs page stops audio. First seeking may download a full track. Login is per Chrome session. No claim of Chrome Web Store approval is made.
