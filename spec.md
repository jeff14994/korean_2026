@/page1.md please based on this update main.html and make each setence has a sepeate button although in the same number


could we also have a better sound quality for the buttons? maybe we can use a different sound library or optimize the current one to improve the audio experience for users.

## Bug Fixes (2026-05-13)

### 1. Card title too dark in dark mode
- `.card-title` was hardcoded to `color: #111827` — nearly invisible on dark backgrounds
- **Fix**: Changed to `color: var(--text)` so it adapts to both light and dark themes

### 2. Google TTS audio not playing on http://127.0.0.1 (and GitHub Pages)
- **Root cause**: When served from `http://`, the browser sends a `Referer` header with Google TTS requests. Google blocks requests with a Referer from non-Google origins.
- On `file://`, no Referer is sent → audio works fine
- On `http://127.0.0.1:8000`, Referer is `http://127.0.0.1:8000/main.html` → Google returns 403
- **Fix**: Added `<meta name="referrer" content="no-referrer">` to `<head>`. This strips the Referer header from all outgoing requests, making `http://` behave identically to `file://`.
- This also fixes the same issue on GitHub Pages (`*.github.io`)
