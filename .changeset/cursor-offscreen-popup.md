---
'executable-stories-showcase': patch
'executable-stories-playwright': patch
---

`showCursor` no longer flies off the top of the screen when a menu or popover opens. Radix focuses a popup before positioning it, parked off-screen; the cursor now reads the focused element's box two frames later and ignores one outside the viewport.

`featureVideo`'s focus points get the same fix, so a video's camera no longer aims above the page when a menu opens.
