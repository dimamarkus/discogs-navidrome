# Review access — complete before submitting

The extension requires a Navidrome 0.64-compatible account and a music library. It has no bundled music service or shared public login. Do not submit this template unchanged: configure a review account and fill the fields below in the dashboard's private Test instructions tab.

## Details to provide privately to Google reviewers
HTTPS Navidrome server URL: [review server]
Username: [dedicated non-admin account]
Password: [review-account password]
Matching Discogs release URL: [actual /release/ URL]
Matching catalog number: [imported catalogNum value]
Navidrome album URL: [album URL visible to the review account]

Use a dedicated non-admin account with access only to a small review library. Use audio you are authorized to share, such as your own released music or appropriately licensed audio. Confirm the Discogs entry and catalog metadata correspond to the library item. Keep review access working throughout review. Do not supply your main administrator credentials or put credentials in the ZIP, listing, screenshots, or public policy.

## Reviewer steps
1. Install the extension and open Settings using its toolbar button.
2. Enter the supplied HTTPS server URL. Click Connect and allow access to that origin. Sign in with the dedicated account.
3. Paste the Navidrome album URL into Check your connection. Click Test album, then Open test player. Play a track and check pause, volume, forward/backward seeking, and next/previous.
4. Open the supplied matching Discogs release URL. The extension adds a player above Videos in the right sidebar when present. Confirm the catalog match and track list. Click a track to play.
5. Collapse the player with its header: audio should continue and the small play/pause control should work. Expand it again.
6. Open a release absent from the review library: a collapsed “No match” row should appear. Expand it and use the supplied catalog number or album URL to select the review album manually. Remember the match, reload, and verify it is retained. Remove it afterward.
7. Disconnect and reload player tabs. The player should ask for a new connection. A full Chrome restart clears authentication, while non-secret preferences and remembered matches normally remain.

## Network/behavior notes
- External requests are only release metadata from api.discogs.com and auth/metadata/artwork/audio from the chosen Navidrome server.
- MP3 transcoding must work on the review server. First seeking in an unseekable progressive stream may buffer the whole track; a visible message explains the wait.
- Master and marketplace pages are deliberately excluded. A catalog match is not a guarantee of the same mastering or pressing.
- No remote executable code, analytics, payment flow, or ads are present.
