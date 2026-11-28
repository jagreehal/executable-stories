---
'executable-stories-core': minor
'executable-stories-react': minor
---

Durations under a millisecond read in microseconds: an in-process span shows "26 µs" instead of "0 ms". When spans in a trace share a start time, the trace waterfall says that OpenTelemetry records start times to the millisecond, so spans that began in the same millisecond start together.
