# Privacy practices — text to enter in the dashboard

## Single purpose
Let users listen to their own Navidrome music library from Discogs release pages by matching catalog numbers and displaying an embedded player.

## storage justification
Store playback preferences, server address and username, remembered release-to-album matches, and per-release collapse choices locally. Authentication tokens and any optional Discogs API token are stored in chrome.storage.session, which is memory-backed and cleared when the browser session ends. The extension does not save the password.

## Host permission justification
Access to discogs.com and www.discogs.com identifies the current release and inserts the player beside its Videos section. Access to api.discogs.com retrieves release metadata, including catalog numbers and labels, to match music in the user's library. Optional HTTPS host access supports user-hosted Navidrome servers at arbitrary domains. When the user enters a server and clicks Connect, the extension requests access only to that server's origin for login, library searches, artwork, and audio streaming. It does not inject scripts on other websites, access general browsing history, or request access to all HTTPS sites at once.

## Privacy policy URL
After enabling GitHub Pages and confirming the page loads, enter:
https://dimamarkus.github.io/discogs-navidrome/privacy.html

## Remote code
Choose: No, I am not using remote code.
All executable JavaScript is included in the extension package. Remote responses are metadata JSON, artwork, and audio; they are not executed as code.

## Data categories
Disclose handling even when data is stored only locally or sent only to user-selected services. Suggested categories for this build:

- Personally identifiable information: Navidrome username and user-entered server address.
- Authentication information: password used for login, session authentication tokens, optional Discogs token.
- Web history: the current Discogs release URL/ID needed for matching, plus remembered release IDs. The extension does not access general browsing history.
- User activity: playback/search actions and saved matching/collapse preferences used only to provide the player; no analytics or behavioral tracking.
- Website content: release metadata, catalog/album/track metadata, artwork, and audio.

No payment/financial data, health data, personal communications, or precise location is requested. Network recipients necessarily receive connection information such as IP addresses; see the policy.

## Data-use certifications
For this build, certify only statements that remain true:
- User data is not sold or transferred for unrelated purposes.
- Data is used only to provide the extension's stated music-matching and playback purpose.
- Data is not used for lending or creditworthiness decisions.

Do not select “no user data handled.” Login and local-only processing still count as handling data under Chrome Web Store policy.

## Official references (checked September 26, 2026)
https://developer.chrome.com/docs/webstore/cws-dashboard-privacy
https://developer.chrome.com/docs/webstore/program-policies/user-data-faq
https://developer.chrome.com/docs/webstore/prepare
https://developer.chrome.com/docs/webstore/images
