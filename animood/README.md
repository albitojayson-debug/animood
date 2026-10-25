# AniMood — Anime Wallpaper Gallery

A Pinterest-inspired aesthetic wallpaper gallery built with HTML, CSS, JavaScript, and Bootstrap 5.

## Run locally
1. Extract the ZIP.
2. Open `animood/index.html` in a browser, or use VS Code's Live Server extension.
3. An internet connection is needed for Bootstrap, Bootstrap Icons, Google Fonts, and the demo image URLs.

## Features
- Responsive Pinterest-style masonry gallery
- Search and category filters
- Save/unsave wallpapers
- Dark/light theme toggle
- Upload local images (stored in browser localStorage)
- Wallpaper detail modal and download link

## Important notes
- Demo images are atmospheric photography placeholders, not actual anime screenshots/art. Replace image URLs in `js/app.js` with images you own or have permission to use.
- Saved IDs, theme, and uploaded images are stored in the current browser only. Clearing browser data removes them.
- Browser storage is limited. This demo accepts images up to 1.5 MB each and keeps up to 8 uploaded images.
- For a real public website with accounts and shared uploads, add a backend and cloud storage.
