package es

import (
	"encoding/json"
	"fmt"
)

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
		b = []byte(fmt.Sprintf("%v", value))
	}
	return codeEntry(label, string(b), "json", children...)
}

// JSONEntry creates a code DocEntry with lang=json without pushing it to a story.
func JSONEntry(label string, value any, children ...DocEntry) DocEntry {
	return jsonEntry(label, value, children...)
}
