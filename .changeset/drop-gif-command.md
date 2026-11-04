---
'executable-stories-core': minor
'executable-stories-formatters': major
'executable-stories-showcase-cli': minor
---

Remove the `gif` command and `writeGifs`: use `video`, and convert an MP4 with gifski or any video-to-GIF tool. `video` and showcase `record` now install ffmpeg with the npm package on macOS, Windows and Linux, and `FFMPEG_PATH` overrides it.
