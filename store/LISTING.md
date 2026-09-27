# Chrome Web Store listing — v0.2.1

## Name
Your Library for Discogs

## Short description (also in manifest)
Play your Navidrome collection inside Discogs release pages, matched by catalog number.

## Full description
Listen to your own music collection while browsing Discogs.

Your Library for Discogs adds a compact player to release pages and looks for matching albums on your Navidrome server using catalog-number tags. When a match is found, browse its tracks and play audio directly from your server.

Features
• Compact player in the right sidebar above Videos, when that section is available.
• Automatic matching by catalog number, with label and album details to help choose among editions.
• Track list, play/pause, previous/next, volume, and an elapsed/full-duration seek bar.
• Collapsible player that keeps playing while collapsed; unmatched releases start collapsed.
• Manual catalog search, direct Navidrome album selection, and remembered matches.
• MP3 streaming up to 320 kbps or original-file playback when supported by your browser.

Requirements
You need your own HTTPS-accessible Navidrome server, account, and music library. This version targets Navidrome 0.64's native API. Automatic matching uses the imported catalog-number field; a catalog number shown only in raw tags may need to be mapped and scanned by Navidrome. This extension does not provide a music subscription or access to another person's library, and it does not connect to Plex.

Getting started
1. Enter your Navidrome server address in Settings.
2. Grant access to that server and sign in.
3. Open or reload a Discogs release page.
4. Choose a track to listen. If no match appears, expand the player to search or paste an album URL.

Privacy
The extension has no analytics, advertising, or developer-operated collection endpoint. It sends release lookups to the Discogs API and music requests to the Navidrome server you choose. Authentication tokens are kept in Chrome's session memory; sign in again after restarting Chrome. Settings and remembered matches are stored locally in your Chrome profile.

Please note
Catalog matches do not guarantee the same pressing or mastering. Master-release and marketplace pages are not supported. Leaving or refreshing a release page stops playback. If direct seeking is unavailable, the first seek may need to finish buffering the track before jumping. Original-file codec compatibility depends on your browser.

Unofficial extension. Not affiliated with or endorsed by Discogs or Navidrome.

## Suggested dashboard choices
Language: English
Category: choose the closest music/entertainment category currently offered.
Visibility: Unlisted for initial testing; Public after live validation.
Price: Free (no payment system is implemented).
Support contact: the verified publisher email in your dashboard.
Privacy policy URL: publish the included privacy.html on a public HTTPS page and paste its URL. The bundled chrome-extension:// URL is not a public policy URL.
