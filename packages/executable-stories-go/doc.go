package es

import (
	"encoding/json"
	"fmt"
)

// noteEntry creates a DocEntry of kind "note".
func noteEntry(text string) DocEntry {
	return DocEntry{
		"kind":  "note",
		"text":  text,
		"phase": "runtime",
	}
}

// tagEntry creates a DocEntry of kind "tag".
func tagEntry(names ...string) DocEntry {
	return DocEntry{
		"kind":  "tag",
		"names": names,
		"phase": "runtime",
	}
}

// kvEntry creates a DocEntry of kind "kv".
func kvEntry(label string, value any) DocEntry {
	return DocEntry{
		"kind":  "kv",
		"label": label,
		"value": value,
		"phase": "runtime",
	}
}

// codeEntry creates a DocEntry of kind "code".
func codeEntry(label, content, lang string) DocEntry {
	return DocEntry{
		"kind":    "code",
		"label":   label,
		"content": content,
		"lang":    lang,
		"phase":   "runtime",
	}
}

// tableEntry creates a DocEntry of kind "table".
func tableEntry(label string, columns []string, rows [][]string) DocEntry {
	return DocEntry{
		"kind":    "table",
		"label":   label,
		"columns": columns,
		"rows":    rows,
		"phase":   "runtime",
	}
}

// linkEntry creates a DocEntry of kind "link".
func linkEntry(label, url string) DocEntry {
	return DocEntry{
		"kind":  "link",
		"label": label,
		"url":   url,
		"phase": "runtime",
	}
}

// sectionEntry creates a DocEntry of kind "section".
func sectionEntry(title, markdown string) DocEntry {
	return DocEntry{
		"kind":     "section",
		"title":    title,
		"markdown": markdown,
		"phase":    "runtime",
	}
}

// mermaidEntry creates a DocEntry of kind "mermaid".
func mermaidEntry(code string, title string) DocEntry {
	entry := DocEntry{
		"kind":  "mermaid",
		"code":  code,
		"phase": "runtime",
	}
	if title != "" {
		entry["title"] = title
	}
	return entry
}

// screenshotEntry creates a DocEntry of kind "screenshot".
func screenshotEntry(path, alt string) DocEntry {
	entry := DocEntry{
		"kind":  "screenshot",
		"path":  path,
		"phase": "runtime",
	}
	if alt != "" {
		entry["alt"] = alt
	}
	return entry
}

// customEntry creates a DocEntry of kind "custom".
func customEntry(typeName string, data any) DocEntry {
	return DocEntry{
		"kind":  "custom",
		"type":  typeName,
		"data":  data,
		"phase": "runtime",
	}
}

// jsonEntry creates a code DocEntry with lang=json by marshaling the value.
func jsonEntry(label string, value any) DocEntry {
	b, err := json.MarshalIndent(value, "", "  ")
	if err != nil {
		b = []byte(fmt.Sprintf("%v", value))
	}
	return codeEntry(label, string(b), "json")
}
