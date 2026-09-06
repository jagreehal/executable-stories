use serde::Serialize;
use std::collections::HashMap;

/// A flexible document entry that serializes as a flat JSON object.
///
/// Each entry has a `"phase": "runtime"` field set automatically.
#[derive(Clone)]
pub struct DocEntry(HashMap<String, serde_json::Value>);

impl Serialize for DocEntry {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        self.0.serialize(serializer)
    }
}

impl DocEntry {
    fn base() -> HashMap<String, serde_json::Value> {
        let mut map = HashMap::new();
        map.insert("phase".to_string(), serde_json::Value::String("runtime".to_string()));
        map
    }

    /// A simple text note.
    #[must_use]
    pub fn note(text: &str) -> Self {
        let mut map = Self::base();
        map.insert("kind".to_string(), serde_json::Value::String("note".to_string()));
        map.insert("text".to_string(), serde_json::Value::String(text.to_string()));
        DocEntry(map)
    }

    /// Tag annotation with one or more tag names.
    #[must_use]
    pub fn tag(names: &[&str]) -> Self {
        let mut map = Self::base();
        map.insert("kind".to_string(), serde_json::Value::String("tag".to_string()));
        let values: Vec<serde_json::Value> =
            names.iter().map(|n| serde_json::Value::String((*n).to_string())).collect();
        map.insert("names".to_string(), serde_json::Value::Array(values));
        DocEntry(map)
    }

    /// A key-value pair.
    #[must_use]
    pub fn kv(label: &str, value: serde_json::Value) -> Self {
        let mut map = Self::base();
        map.insert("kind".to_string(), serde_json::Value::String("kv".to_string()));
        map.insert("label".to_string(), serde_json::Value::String(label.to_string()));
        map.insert("value".to_string(), value);
        DocEntry(map)
    }

    /// A code block with optional language.
    #[must_use]
    pub fn code(label: &str, content: &str, lang: Option<&str>) -> Self {
        let mut map = Self::base();
        map.insert("kind".to_string(), serde_json::Value::String("code".to_string()));
        map.insert("label".to_string(), serde_json::Value::String(label.to_string()));
        map.insert("content".to_string(), serde_json::Value::String(content.to_string()));
        if let Some(l) = lang {
            map.insert("lang".to_string(), serde_json::Value::String(l.to_string()));
        }
        DocEntry(map)
    }

    /// A JSON document rendered as a code block with lang=json.
    pub fn json_doc(label: &str, value: &impl Serialize) -> Self {
        let json_str = serde_json::to_string_pretty(value).unwrap_or_default();
        Self::code(label, &json_str, Some("json"))
    }

    /// A table with columns and rows.
    #[must_use]
    pub fn table(label: &str, columns: &[&str], rows: &[&[&str]]) -> Self {
        let mut map = Self::base();
        map.insert("kind".to_string(), serde_json::Value::String("table".to_string()));
        map.insert("label".to_string(), serde_json::Value::String(label.to_string()));

        let col_values: Vec<serde_json::Value> =
            columns.iter().map(|c| serde_json::Value::String((*c).to_string())).collect();
        map.insert("columns".to_string(), serde_json::Value::Array(col_values));

        let row_values: Vec<serde_json::Value> = rows
            .iter()
            .map(|row| {
                let cells: Vec<serde_json::Value> =
                    row.iter().map(|c| serde_json::Value::String((*c).to_string())).collect();
                serde_json::Value::Array(cells)
            })
            .collect();
        map.insert("rows".to_string(), serde_json::Value::Array(row_values));
        DocEntry(map)
    }

    /// A hyperlink.
    #[must_use]
    pub fn link(label: &str, url: &str) -> Self {
        let mut map = Self::base();
        map.insert("kind".to_string(), serde_json::Value::String("link".to_string()));
        map.insert("label".to_string(), serde_json::Value::String(label.to_string()));
        map.insert("url".to_string(), serde_json::Value::String(url.to_string()));
        DocEntry(map)
    }

    /// A markdown section.
    #[must_use]
    pub fn section(title: &str, markdown: &str) -> Self {
        let mut map = Self::base();
        map.insert("kind".to_string(), serde_json::Value::String("section".to_string()));
        map.insert("title".to_string(), serde_json::Value::String(title.to_string()));
        map.insert("markdown".to_string(), serde_json::Value::String(markdown.to_string()));
        DocEntry(map)
    }

    /// A mermaid diagram.
    #[must_use]
    pub fn mermaid(code: &str, title: Option<&str>) -> Self {
        let mut map = Self::base();
        map.insert("kind".to_string(), serde_json::Value::String("mermaid".to_string()));
        map.insert("code".to_string(), serde_json::Value::String(code.to_string()));
        if let Some(t) = title {
            map.insert("title".to_string(), serde_json::Value::String(t.to_string()));
        }
        DocEntry(map)
    }

    /// A screenshot reference.
    #[must_use]
    pub fn screenshot(path: &str, alt: Option<&str>) -> Self {
        let mut map = Self::base();
        map.insert("kind".to_string(), serde_json::Value::String("screenshot".to_string()));
        map.insert("path".to_string(), serde_json::Value::String(path.to_string()));
        if let Some(a) = alt {
            map.insert("alt".to_string(), serde_json::Value::String(a.to_string()));
        }
        DocEntry(map)
    }

    /// A video, played inline in HTML reports. `poster` is the still shown
    /// before playback.
    #[must_use]
    pub fn video(path: &str, caption: Option<&str>, poster: Option<&str>) -> Self {
        let mut map = Self::base();
        map.insert("kind".to_string(), serde_json::Value::String("video".to_string()));
        map.insert("path".to_string(), serde_json::Value::String(path.to_string()));
        if let Some(c) = caption {
            map.insert("caption".to_string(), serde_json::Value::String(c.to_string()));
        }
        if let Some(p) = poster {
            map.insert("poster".to_string(), serde_json::Value::String(p.to_string()));
        }
        DocEntry(map)
    }

    /// Embedded HTML rendered inside an always-sandboxed iframe.
    ///
    /// # Panics
    /// Panics unless exactly one of `path`, `url`, or `content` is set.
    #[must_use]
    pub fn html(opts: HtmlOptions) -> Self {
        let count = u8::from(opts.path.is_some())
            + u8::from(opts.url.is_some())
            + u8::from(opts.content.is_some());
        assert!(count == 1, "DocEntry::html requires exactly one of path, url, or content");
        let mut map = Self::base();
        map.insert("kind".to_string(), serde_json::Value::String("html".to_string()));
        if let Some(p) = opts.path {
            map.insert("path".to_string(), serde_json::Value::String(p.to_string()));
        }
        if let Some(u) = opts.url {
            map.insert("url".to_string(), serde_json::Value::String(u.to_string()));
        }
        if let Some(c) = opts.content {
            map.insert("content".to_string(), serde_json::Value::String(c.to_string()));
        }
        if let Some(t) = opts.title {
            map.insert("title".to_string(), serde_json::Value::String(t.to_string()));
        }
        if let Some(h) = opts.height {
            map.insert("height".to_string(), h);
        }
        DocEntry(map)
    }

    /// A state snapshot captured at a step (data storyboard frame).
    ///
    /// `value` is a JSON-serializable snapshot of "what the world looks like"
    /// at this step; consecutive states with the same label are diffed by the
    /// report renderer. `None` (or an empty label) omits the label field
    /// (anonymous state lane).
    #[must_use]
    pub fn state(label: Option<&str>, value: serde_json::Value) -> Self {
        let mut map = Self::base();
        map.insert("kind".to_string(), serde_json::Value::String("state".to_string()));
        if let Some(l) = label.filter(|l| !l.is_empty()) {
            map.insert("label".to_string(), serde_json::Value::String(l.to_string()));
        }
        map.insert("value".to_string(), value);
        DocEntry(map)
    }

    /// A custom doc entry with arbitrary type and data.
    #[must_use]
    pub fn custom(type_name: &str, data: serde_json::Value) -> Self {
        let mut map = Self::base();
        map.insert("kind".to_string(), serde_json::Value::String("custom".to_string()));
        map.insert("type".to_string(), serde_json::Value::String(type_name.to_string()));
        map.insert("data".to_string(), data);
        DocEntry(map)
    }

    /// Add children to this doc entry.
    #[must_use]
    pub fn with_children(mut self, children: Vec<DocEntry>) -> Self {
        if !children.is_empty() {
            // An entry is already a JSON object, so hand it over as one rather
            // than serializing it back through a fallible conversion.
            let child_values: Vec<serde_json::Value> = children
                .into_iter()
                .map(|c| serde_json::Value::Object(c.0.into_iter().collect()))
                .collect();
            self.0.insert("children".to_string(), serde_json::Value::Array(child_values));
        }
        self
    }
}

/// Options for an embedded-HTML doc entry ([`DocEntry::html`]).
///
/// Exactly one of `path`, `url`, or `content` must be `Some`. Build with
/// [`HtmlOptions::default`] and set the fields you need.
#[derive(Default)]
pub struct HtmlOptions<'a> {
    /// Local HTML file path (inlined into the report by default).
    pub path: Option<&'a str>,
    /// Remote URL rendered via iframe src.
    pub url: Option<&'a str>,
    /// Inline HTML content rendered via iframe srcdoc.
    pub content: Option<&'a str>,
    /// Title shown in the embed's chrome bar.
    pub title: Option<&'a str>,
    /// Iframe height: a JSON number → px, a JSON string passed through (e.g. "60vh"). Default 400px.
    pub height: Option<serde_json::Value>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn note_serializes_correctly() {
        let entry = DocEntry::note("hello");
        let json = serde_json::to_value(&entry).unwrap();
        assert_eq!(json["kind"], "note");
        assert_eq!(json["text"], "hello");
        assert_eq!(json["phase"], "runtime");
    }

    #[test]
    fn tag_serializes_correctly() {
        let entry = DocEntry::tag(&["smoke", "fast"]);
        let json = serde_json::to_value(&entry).unwrap();
        assert_eq!(json["kind"], "tag");
        assert_eq!(json["names"], serde_json::json!(["smoke", "fast"]));
        assert_eq!(json["phase"], "runtime");
    }

    #[test]
    fn kv_serializes_correctly() {
        let entry = DocEntry::kv("count", serde_json::json!(42));
        let json = serde_json::to_value(&entry).unwrap();
        assert_eq!(json["kind"], "kv");
        assert_eq!(json["label"], "count");
        assert_eq!(json["value"], 42);
    }

    #[test]
    fn code_serializes_correctly() {
        let entry = DocEntry::code("snippet", "fn main() {}", Some("rust"));
        let json = serde_json::to_value(&entry).unwrap();
        assert_eq!(json["kind"], "code");
        assert_eq!(json["label"], "snippet");
        assert_eq!(json["content"], "fn main() {}");
        assert_eq!(json["lang"], "rust");
    }

    #[test]
    fn json_doc_serializes_as_code_with_json_lang() {
        let data = serde_json::json!({"key": "value"});
        let entry = DocEntry::json_doc("payload", &data);
        let json = serde_json::to_value(&entry).unwrap();
        assert_eq!(json["kind"], "code");
        assert_eq!(json["lang"], "json");
    }

    #[test]
    fn table_serializes_correctly() {
        let entry = DocEntry::table("results", &["name", "score"], &[&["Alice", "100"]]);
        let json = serde_json::to_value(&entry).unwrap();
        assert_eq!(json["kind"], "table");
        assert_eq!(json["columns"], serde_json::json!(["name", "score"]));
        assert_eq!(json["rows"], serde_json::json!([["Alice", "100"]]));
    }

    #[test]
    fn link_serializes_correctly() {
        let entry = DocEntry::link("docs", "https://example.com");
        let json = serde_json::to_value(&entry).unwrap();
        assert_eq!(json["kind"], "link");
        assert_eq!(json["url"], "https://example.com");
    }

    #[test]
    fn section_serializes_correctly() {
        let entry = DocEntry::section("Details", "## Heading\nBody text");
        let json = serde_json::to_value(&entry).unwrap();
        assert_eq!(json["kind"], "section");
        assert_eq!(json["title"], "Details");
        assert_eq!(json["markdown"], "## Heading\nBody text");
    }

    #[test]
    fn mermaid_serializes_correctly() {
        let entry = DocEntry::mermaid("graph TD; A-->B;", Some("Flow"));
        let json = serde_json::to_value(&entry).unwrap();
        assert_eq!(json["kind"], "mermaid");
        assert_eq!(json["code"], "graph TD; A-->B;");
        assert_eq!(json["title"], "Flow");
    }

    #[test]
    fn screenshot_serializes_correctly() {
        let entry = DocEntry::screenshot("/tmp/shot.png", Some("Login page"));
        let json = serde_json::to_value(&entry).unwrap();
        assert_eq!(json["kind"], "screenshot");
        assert_eq!(json["path"], "/tmp/shot.png");
        assert_eq!(json["alt"], "Login page");
    }

    #[test]
    fn video_has_path_caption_and_poster() {
        let json = serde_json::to_value(DocEntry::video(
            "artifacts/run.webm",
            Some("Full checkout run"),
            Some("artifacts/run.jpg"),
        ))
        .unwrap();
        assert_eq!(json["kind"], "video");
        assert_eq!(json["path"], "artifacts/run.webm");
        assert_eq!(json["caption"], "Full checkout run");
        assert_eq!(json["poster"], "artifacts/run.jpg");
        assert_eq!(json["phase"], "runtime");
    }

    #[test]
    fn video_omits_what_was_not_given() {
        let json = serde_json::to_value(DocEntry::video("run.webm", None, None)).unwrap();
        assert_eq!(json["path"], "run.webm");
        assert!(json.get("caption").is_none());
        assert!(json.get("poster").is_none());
    }

    #[test]
    fn html_serializes_correctly() {
        let entry = DocEntry::html(HtmlOptions {
            path: Some("./coverage/index.html"),
            title: Some("Coverage"),
            height: Some(serde_json::json!(600)),
            ..Default::default()
        });
        let json = serde_json::to_value(&entry).unwrap();
        assert_eq!(json["kind"], "html");
        assert_eq!(json["path"], "./coverage/index.html");
        assert_eq!(json["title"], "Coverage");
        assert_eq!(json["height"], 600);
        assert!(json.get("url").is_none());
        assert!(json.get("content").is_none());
    }

    #[test]
    fn html_accepts_string_height_and_content() {
        let entry = DocEntry::html(HtmlOptions {
            content: Some("<h1>Hi</h1>"),
            height: Some(serde_json::json!("60vh")),
            ..Default::default()
        });
        let json = serde_json::to_value(&entry).unwrap();
        assert_eq!(json["content"], "<h1>Hi</h1>");
        assert_eq!(json["height"], "60vh");
    }

    #[test]
    #[should_panic(expected = "exactly one")]
    fn html_panics_without_a_source() {
        let _ = DocEntry::html(HtmlOptions { title: Some("x"), ..Default::default() });
    }

    #[test]
    #[should_panic(expected = "exactly one")]
    fn html_panics_with_two_sources() {
        let _ = DocEntry::html(HtmlOptions {
            path: Some("a.html"),
            url: Some("https://x.test"),
            ..Default::default()
        });
    }

    #[test]
    fn state_serializes_correctly() {
        let value = serde_json::json!({
            "items": [{"sku": "A1", "qty": 2}],
            "total": 9.99
        });
        let entry = DocEntry::state(Some("Basket"), value.clone());
        let json = serde_json::to_value(&entry).unwrap();
        assert_eq!(json["kind"], "state");
        assert_eq!(json["label"], "Basket");
        assert_eq!(json["phase"], "runtime");
        // Arbitrary nested JSON round-trips untouched
        assert_eq!(json["value"], value);
    }

    #[test]
    fn state_without_label_omits_field() {
        let entry = DocEntry::state(None, serde_json::json!([1, 2, 3]));
        let json = serde_json::to_value(&entry).unwrap();
        assert_eq!(json["kind"], "state");
        assert!(json.get("label").is_none());
        assert_eq!(json["value"], serde_json::json!([1, 2, 3]));
    }

    #[test]
    fn state_with_empty_label_omits_field() {
        let entry = DocEntry::state(Some(""), serde_json::json!({"ok": true}));
        let json = serde_json::to_value(&entry).unwrap();
        assert!(json.get("label").is_none());
    }

    #[test]
    fn custom_serializes_correctly() {
        let entry = DocEntry::custom("metrics", serde_json::json!({"latency_ms": 42}));
        let json = serde_json::to_value(&entry).unwrap();
        assert_eq!(json["kind"], "custom");
        assert_eq!(json["type"], "metrics");
        assert_eq!(json["data"]["latency_ms"], 42);
    }
}
