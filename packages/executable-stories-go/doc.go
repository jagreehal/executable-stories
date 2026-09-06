package es

import (
	"encoding/json"
	"fmt"
	"os"
)

// warn reports a non-fatal problem. A package variable so tests can observe it.
var warn = func(format string, args ...any) {
	fmt.Fprintf(os.Stderr, format, args...)
}

// applyChildren attaches children to a DocEntry if any are provided.
func applyChildren(entry DocEntry, children []DocEntry) DocEntry {
	if len(children) > 0 {
		entry["children"] = children
	}
	return entry
}

// noteEntry creates a DocEntry of kind "note".
func noteEntry(text string, children ...DocEntry) DocEntry {
	return applyChildren(DocEntry{
		"kind":  "note",
		"text":  text,
		"phase": "runtime",
	}, children)
}

// NoteEntry creates a DocEntry of kind "note" without pushing it to a story.
// Use this to build children for other doc entries.
func NoteEntry(text string, children ...DocEntry) DocEntry {
	return noteEntry(text, children...)
}

// tagEntry creates a DocEntry of kind "tag".
func tagEntry(names []string, children ...DocEntry) DocEntry {
	return applyChildren(DocEntry{
		"kind":  "tag",
		"names": names,
		"phase": "runtime",
	}, children)
}

// TagEntry creates a DocEntry of kind "tag" without pushing it to a story.
func TagEntry(names ...string) DocEntry {
	return tagEntry(names)
}

// kvEntry creates a DocEntry of kind "kv".
func kvEntry(label string, value any, children ...DocEntry) DocEntry {
	return applyChildren(DocEntry{
		"kind":  "kv",
		"label": label,
		"value": value,
		"phase": "runtime",
	}, children)
}

// KvEntry creates a DocEntry of kind "kv" without pushing it to a story.
func KvEntry(label string, value any, children ...DocEntry) DocEntry {
	return kvEntry(label, value, children...)
}

// codeEntry creates a DocEntry of kind "code".
func codeEntry(label, content, lang string, children ...DocEntry) DocEntry {
	return applyChildren(DocEntry{
		"kind":    "code",
		"label":   label,
		"content": content,
		"lang":    lang,
		"phase":   "runtime",
	}, children)
}

// CodeEntry creates a DocEntry of kind "code" without pushing it to a story.
func CodeEntry(label, content, lang string, children ...DocEntry) DocEntry {
	return codeEntry(label, content, lang, children...)
}

// tableEntry creates a DocEntry of kind "table".
func tableEntry(label string, columns []string, rows [][]string, children ...DocEntry) DocEntry {
	return applyChildren(DocEntry{
		"kind":    "table",
		"label":   label,
		"columns": columns,
		"rows":    rows,
		"phase":   "runtime",
	}, children)
}

// TableEntry creates a DocEntry of kind "table" without pushing it to a story.
func TableEntry(label string, columns []string, rows [][]string, children ...DocEntry) DocEntry {
	return tableEntry(label, columns, rows, children...)
}

// linkEntry creates a DocEntry of kind "link".
func linkEntry(label, url string, children ...DocEntry) DocEntry {
	return applyChildren(DocEntry{
		"kind":  "link",
		"label": label,
		"url":   url,
		"phase": "runtime",
	}, children)
}

// LinkEntry creates a DocEntry of kind "link" without pushing it to a story.
func LinkEntry(label, url string, children ...DocEntry) DocEntry {
	return linkEntry(label, url, children...)
}

// sectionEntry creates a DocEntry of kind "section".
func sectionEntry(title, markdown string, children ...DocEntry) DocEntry {
	return applyChildren(DocEntry{
		"kind":     "section",
		"title":    title,
		"markdown": markdown,
		"phase":    "runtime",
	}, children)
}

// SectionEntry creates a DocEntry of kind "section" without pushing it to a story.
func SectionEntry(title, markdown string, children ...DocEntry) DocEntry {
	return sectionEntry(title, markdown, children...)
}

// mermaidEntry creates a DocEntry of kind "mermaid".
func mermaidEntry(code string, title string, children ...DocEntry) DocEntry {
	entry := DocEntry{
		"kind":  "mermaid",
		"code":  code,
		"phase": "runtime",
	}
	if title != "" {
		entry["title"] = title
	}
	return applyChildren(entry, children)
}

// MermaidEntry creates a DocEntry of kind "mermaid" without pushing it to a story.
func MermaidEntry(code string, title string, children ...DocEntry) DocEntry {
	return mermaidEntry(code, title, children...)
}

// screenshotEntry creates a DocEntry of kind "screenshot".
func screenshotEntry(path, alt string, children ...DocEntry) DocEntry {
	entry := DocEntry{
		"kind":  "screenshot",
		"path":  path,
		"phase": "runtime",
	}
	if alt != "" {
		entry["alt"] = alt
	}
	return applyChildren(entry, children)
}

// ScreenshotEntry creates a DocEntry of kind "screenshot" without pushing it to a story.
func ScreenshotEntry(path, alt string, children ...DocEntry) DocEntry {
	return screenshotEntry(path, alt, children...)
}

// HtmlOptions configures an embedded-HTML doc entry. Exactly one of Path, URL,
// or Content must be set. The HTML is rendered inside an always-sandboxed iframe.
type HtmlOptions struct {
	// Path is a local HTML file (inlined into the report by default).
	Path string
	// URL is a remote document rendered via iframe src.
	URL string
	// Content is inline HTML rendered via iframe srcdoc.
	Content string
	// Title is shown in the embed's chrome bar.
	Title string
	// Height sets the iframe height: an int → px, a string passed through (e.g. "60vh"). Default 400px.
	Height any
}

// htmlEntry creates a DocEntry of kind "html", panicking unless exactly one of
// Path/URL/Content is set (matching the throw semantics of the JS adapters).
func htmlEntry(opts HtmlOptions, children ...DocEntry) DocEntry {
	sources := 0
	if opts.Path != "" {
		sources++
	}
	if opts.URL != "" {
		sources++
	}
	if opts.Content != "" {
		sources++
	}
	if sources != 1 {
		panic("story.Html requires exactly one of Path, URL, or Content")
	}
	entry := DocEntry{
		"kind":  "html",
		"phase": "runtime",
	}
	if opts.Path != "" {
		entry["path"] = opts.Path
	}
	if opts.URL != "" {
		entry["url"] = opts.URL
	}
	if opts.Content != "" {
		entry["content"] = opts.Content
	}
	if opts.Title != "" {
		entry["title"] = opts.Title
	}
	if opts.Height != nil {
		entry["height"] = opts.Height
	}
	return applyChildren(entry, children)
}

// HtmlEntry creates a DocEntry of kind "html" without pushing it to a story.
func HtmlEntry(opts HtmlOptions, children ...DocEntry) DocEntry {
	return htmlEntry(opts, children...)
}

// stateEntry creates a DocEntry of kind "state". An empty label is omitted
// (anonymous state lane); diffing is done by the TS core at render time.
func stateEntry(label string, value any, children ...DocEntry) DocEntry {
	warnIfLargeState(label, value)
	entry := DocEntry{
		"kind":  "state",
		"value": value,
		"phase": "runtime",
	}
	if label != "" {
		entry["label"] = label
	}
	return applyChildren(entry, children)
}

// stateWarnBytes is where a snapshot stops being a storyboard frame and starts
// being a data dump. Matches the vitest adapter.
const stateWarnBytes = 100_000

// warnIfLargeState says so when a snapshot is big enough to bloat the report.
// Non-fatal, and silent on a value json cannot size.
func warnIfLargeState(label string, value any) {
	b, err := json.Marshal(value)
	if err != nil || len(b) <= stateWarnBytes {
		return
	}
	if label == "" {
		label = "state"
	}
	warn("[executable-stories] state %q is %dKB — consider capturing a projection of the entity instead of the whole thing\n",
		label, len(b)/1024)
}

// StateEntry creates a DocEntry of kind "state" without pushing it to a story.
func StateEntry(label string, value any, children ...DocEntry) DocEntry {
	return stateEntry(label, value, children...)
}

// VideoOptions are the optional parts of a video doc entry.
type VideoOptions struct {
	// Caption is shown beneath the player.
	Caption string
	// Poster is the still shown before playback starts.
	Poster string
}

// videoEntry creates a DocEntry of kind "video".
func videoEntry(path string, opts VideoOptions, children ...DocEntry) DocEntry {
	entry := DocEntry{
		"kind":  "video",
		"path":  path,
		"phase": "runtime",
	}
	if opts.Caption != "" {
		entry["caption"] = opts.Caption
	}
	if opts.Poster != "" {
		entry["poster"] = opts.Poster
	}
	return applyChildren(entry, children)
}

// VideoEntry creates a DocEntry of kind "video" without pushing it to a story.
func VideoEntry(path string, opts VideoOptions, children ...DocEntry) DocEntry {
	return videoEntry(path, opts, children...)
}

// customEntry creates a DocEntry of kind "custom".
func customEntry(typeName string, data any, children ...DocEntry) DocEntry {
	return applyChildren(DocEntry{
		"kind":  "custom",
		"type":  typeName,
		"data":  data,
		"phase": "runtime",
	}, children)
}

// CustomEntry creates a DocEntry of kind "custom" without pushing it to a story.
func CustomEntry(typeName string, data any, children ...DocEntry) DocEntry {
	return customEntry(typeName, data, children...)
}

// jsonEntry creates a code DocEntry with lang=json by marshaling the value.
func jsonEntry(label string, value any, children ...DocEntry) DocEntry {
	b, err := json.MarshalIndent(value, "", "  ")
	if err != nil {
		warn("[executable-stories] json %q could not be serialized (%v); recorded as text\n", label, err)
		b = []byte(fmt.Sprintf("%v", value))
	}
	return codeEntry(label, string(b), "json", children...)
}

// valueKeys are the doc-entry fields that carry a caller's own value, and so
// are the fields that can hold something json cannot write.
var valueKeys = []string{"value", "data"}

// sanitizeEntry keeps one unserializable value from costing the whole report.
// The run is marshalled as a single document, so a channel in one kv entry
// used to fail the write and lose every scenario in the suite.
func sanitizeEntry(entry DocEntry) {
	if _, err := json.Marshal(entry); err == nil {
		return
	}
	for _, key := range valueKeys {
		value, ok := entry[key]
		if !ok {
			continue
		}
		_, err := json.Marshal(value)
		if err == nil {
			continue
		}
		warn("[executable-stories] %v %q could not be serialized (%v); recorded as text\n",
			entry["kind"], entry["label"], err)
		// The type is the useful half: it names what could not be written.
		entry[key] = fmt.Sprintf("%v (%T)", value, value)
	}
}

// JSONEntry creates a code DocEntry with lang=json without pushing it to a story.
func JSONEntry(label string, value any, children ...DocEntry) DocEntry {
	return jsonEntry(label, value, children...)
}
