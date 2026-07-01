# Lyric Studio — PRD

## Original Problem Statement
Create a new page which allows me to upload my album art and then a lrc file (time synced lyrics), then based on that create a horizontal 1920×1080 lyric play just like Apple Music. The album art is used to make a moving gradient making it extremely aesthetic. The lyrics move based on the LRC file. If the first lyric doesn't start at 0:00, an intro shows the album art with artist and song name; the moment the first lyric arrives the intro fades out and the Apple Music–style synced lyric plays. Lyrics are full-width (text-6xl → text-8xl) in Helvetica, active line bolded, with dimmer bolded lyrics above and below.

## User Choices
- Persistence: Session-only (no MongoDB)
- Metadata: Manual artist / song input fields
- Audio: User uploads MP3/audio (WAV works too); LRC handles sync
- Export: Live in-browser playback only
- Gradient: Animated mesh blobs derived from album art colors

## Architecture
- Pure frontend React app (no backend endpoints used).
- Routes: `/` → UploadPage, `/play` → PlayerPage.
- Session state held in `AppRoutes` (App.js) via `useState`; passed via props.
- Files handled via `URL.createObjectURL` (audio + image) and `File.text()` (LRC).

## Implementation (Feb 2026)
- `pages/UploadPage.jsx` — Glass form with artist/song inputs + 3 file tiles (audio, album art, LRC). Uses `sonner` for toasts and hidden file inputs triggered by tile buttons.
- `pages/PlayerPage.jsx` — 1920×1080 canvas (aspect-video) with:
  - Animated mesh gradient background (colors extracted from album art).
  - Intro screen (album art + artist + song) shown until first LRC timestamp.
  - Karaoke lyric scroller with active line at text-8xl bold, near lines dimmed at text-6xl, far lines faded and blurred. Auto-scroll centers active line.
  - Bottom hover controls: back, play/pause, current/total time, seek bar, fullscreen.
- `lib/lrcParser.js` — Parses LRC (handles 1–3 digit ms formats + multi-timestamp lines).
- `lib/colorExtractor.js` — Canvas-based dominant color extraction (buckets vivid colors).
- `components/MeshGradient.jsx` — 5 blurred blobs with distinct drift keyframes + grain + vignette.
- `App.css` — Helvetica utility, no-scrollbar, lyric-mask fade, 5 blob-drift keyframes, grain SVG.
- `design_guidelines.json` — Design source (Archetype 5 dark cinematic).

## What's Implemented
- ✅ Upload flow with validation (all 5 fields required, toast errors).
- ✅ 1920×1080 player canvas with mesh gradient sourced from album art.
- ✅ Intro screen with fade-out crossfade when first lyric hits.
- ✅ Apple Music–style karaoke lyrics (active bold text-8xl, dimmer surrounding lines).
- ✅ Auto-scroll to keep active lyric centered.
- ✅ Play/pause, seek bar, fullscreen button, back button.
- ✅ Passed testing subagent (100% frontend).

## Backlog / Next
- P1: Word-by-word (Enhanced LRC A2 tags) highlighting inside the active line.
- P1: Record/export the 1920×1080 canvas to MP4 for social sharing.
- P2: Presets for gradient intensity, grain amount, blob speed.
- P2: Small library so users can drop-in multiple songs in one session.
- P2: Drag-and-drop file support on the upload tiles.

## Test Credentials
None (no auth in this app).

## Key Files
- `/app/frontend/src/App.js`
- `/app/frontend/src/pages/UploadPage.jsx`
- `/app/frontend/src/pages/PlayerPage.jsx`
- `/app/frontend/src/lib/lrcParser.js`
- `/app/frontend/src/lib/colorExtractor.js`
- `/app/frontend/src/components/MeshGradient.jsx`
- `/app/frontend/src/App.css`
