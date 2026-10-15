# executable-stories-remotion

## 0.1.0

### Minor Changes

- 8a25254: New package `executable-stories-remotion`. `<StoryVideo>` renders a passed scenario as a Remotion video: one scene per storyboard frame, step text as captions, `story.state()` changes animated. `<RecordingVideo>` cuts showcase recordings into one captioned video that zooms to each click. `executable-stories-showcase record` now writes `<name>.video.json` beside each video with its size, length, description and clicks, iframe clicks included.
