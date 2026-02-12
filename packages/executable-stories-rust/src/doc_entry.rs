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
    pub fn note(text: &str) -> Self {
        let mut map = Self::base();
        map.insert("kind".to_string(), serde_json::Value::String("note".to_string()));
        map.insert("text".to_string(), serde_json::Value::String(text.to_string()));
        DocEntry(map)
    }

    /// Tag annotation with one or more tag names.
    pub fn tag(names: &[&str]) -> Self {
        let mut map = Self::base();
        map.insert("kind".to_string(), serde_json::Value::String("tag".to_string()));
        let values: Vec<serde_json::Value> = names
            .iter()
            .map(|n| serde_json::Value::String(n.to_string()))
            .collect();
        map.insert("names".to_string(), serde_json::Value::Array(values));
        DocEntry(map)
    }

    /// A key-value pair.
    pub fn kv(label: &str, value: serde_json::Value) -> Self {
        let mut map = Self::base();
        map.insert("kind".to_string(), serde_json::Value::String("kv".to_string()));
        map.insert("label".to_string(), serde_json::Value::String(label.to_string()));
        map.insert("value".to_string(), value);
        DocEntry(map)
    }

    /// A code block with optional language.
    pub fn code(label: &str, content: &str, lang: Option<&str>) -> Self {
        let mut map = Self::base();
        map.insert("kind".to_string(), serde_json::Value::String("code".to_string()));
        map.insert("label".to_string(), serde_json::Value::String(label.to_string()));
        map.insert(
            "content".to_string(),
            serde_json::Value::String(content.to_string()),
        );
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
    pub fn table(label: &str, columns: &[&str], rows: &[&[&str]]) -> Self {
        let mut map = Self::base();
        map.insert("kind".to_string(), serde_json::Value::String("table".to_string()));
        map.insert("label".to_string(), serde_json::Value::String(label.to_string()));

        let col_values: Vec<serde_json::Value> = columns
            .iter()
            .map(|c| serde_json::Value::String(c.to_string()))
            .collect();
        map.insert("columns".to_string(), serde_json::Value::Array(col_values));

        let row_values: Vec<serde_json::Value> = rows
            .iter()
            .map(|row| {
                let cells: Vec<serde_json::Value> = row
                    .iter()
                    .map(|c| serde_json::Value::String(c.to_string()))
                    .collect();
                serde_json::Value::Array(cells)
            })
            .collect();
        map.insert("rows".to_string(), serde_json::Value::Array(row_values));
        DocEntry(map)
    }

    /// A hyperlink.
    pub fn link(label: &str, url: &str) -> Self {
        let mut map = Self::base();
        map.insert("kind".to_string(), serde_json::Value::String("link".to_string()));
        map.insert("label".to_string(), serde_json::Value::String(label.to_string()));
        map.insert("url".to_string(), serde_json::Value::String(url.to_string()));
        DocEntry(map)
    }

    /// A markdown section.
    pub fn section(title: &str, markdown: &str) -> Self {
        let mut map = Self::base();
        map.insert("kind".to_string(), serde_json::Value::String("section".to_string()));
        map.insert("title".to_string(), serde_json::Value::String(title.to_string()));
        map.insert(
            "markdown".to_string(),
            serde_json::Value::String(markdown.to_string()),
        );
        DocEntry(map)
    }

    /// A mermaid diagram.
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
    pub fn screenshot(path: &str, alt: Option<&str>) -> Self {
        let mut map = Self::base();
        map.insert(
            "kind".to_string(),
            serde_json::Value::String("screenshot".to_string()),
        );
        map.insert("path".to_string(), serde_json::Value::String(path.to_string()));
        if let Some(a) = alt {
            map.insert("alt".to_string(), serde_json::Value::String(a.to_string()));
        }
        DocEntry(map)
    }

    /// A custom doc entry with arbitrary type and data.
    pub fn custom(type_name: &str, data: serde_json::Value) -> Self {
        let mut map = Self::base();
        map.insert(
            "kind".to_string(),
            serde_json::Value::String("custom".to_string()),
        );
        map.insert(
            "type".to_string(),
            serde_json::Value::String(type_name.to_string()),
        );
        map.insert("data".to_string(), data);
        DocEntry(map)
    }
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
    fn custom_serializes_correctly() {
        let entry = DocEntry::custom("metrics", serde_json::json!({"latency_ms": 42}));
        let json = serde_json::to_value(&entry).unwrap();
        assert_eq!(json["kind"], "custom");
        assert_eq!(json["type"], "metrics");
        assert_eq!(json["data"]["latency_ms"], 42);
    }
}
