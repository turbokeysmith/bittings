# Website pictures and videos (getbittings.com)

Everything here runs the REAL app against the stand-in cloud (`tools/qa/rebuild-fake-cloud.js`) with a mock business,
**Ironwood Lock & Key**, made-up staff, customers and numbers. Never use the shop's own data for the website.

| Script | Makes |
|---|---|
| `feat-shots.js [pc\|tab\|phone]` | feature-page pictures → `cand2/f-<slug>-<pc\|tab\|phone>.webp` → copy to `site/assets/` |
| `vid-shots.js [pc\|phone]` | the story frames for the two videos → `vid/*.png` |
| `tts.ps1` | narration WAVs from `vid-script.json` (Windows built-in voice "Microsoft Mark", offline) → `vid/audio/` |
| `vid-render.js [pc\|phone]` | records each video in headless Chrome (canvas + narration) → `vid/out/<pc\|phone>.mp4`, poster JPG, WebVTT captions |
| `site-check.js` | loads every site page on PC + phone: pictures, links, no sideways scroll |

Chrome's own MP4 has a broken length/index (browsers show ~3 s). ALWAYS convert with ffmpeg before publishing:
`npm i ffmpeg-static` (in a scratch folder), then
`ffmpeg -i pc.mp4 -c:v libx264 -preset slow -crf 25 -profile:v main -pix_fmt yuv420p -r 30 -c:a aac -b:a 96k -movflags +faststart job-at-the-counter.mp4`
→ `site/assets/video/`. Check frames with `ffmpeg -i X.mp4 -vf "fps=1/10,scale=480:-1,tile=3x3" -frames:v 1 tile.jpg`
(seeking a video inside headless Chrome does not work — it always shows the last scene).
Scripts write next to themselves; run them from a scratch copy if you don't want the outputs in the repo.
