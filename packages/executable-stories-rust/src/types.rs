use serde::{Deserialize, Serialize};

use crate::doc_entry::DocEntry;

#[derive(Debug, Clone, Serialize)]
pub struct Ticket {
    pub id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,
}

/// Published raw-run schema, emitted as `$schema` so editors validate the
/// output file as the adapter writes it. `executable-stories doctor` also
/// reports its presence.
pub const SCHEMA_URL: &str = "https://executable-stories.dev/schemas/raw-run.schema.json";

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct RawRun {
    pub schema_version: u32,
    pub test_cases: Vec<RawTestCase>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub features: Vec<RawFeature>,
    pub project_root: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub started_at_ms: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub finished_at_ms: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ci: Option<RawCIInfo>,
    /// The commit this run describes, so a report states which code it
    /// documents. Read from CI's environment first, `git rev-parse` otherwise.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub git_sha: Option<String>,
    /// Version of this adapter, so a report states what produced it.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub package_version: Option<String>,
    /// How much of each source file this run covered: `"full"` when the test
    /// binary's arguments were inspected and narrowed nothing, `"filtered"`
    /// when they did. Only `"full"` lets a consumer retire a scenario it no
    /// longer reports.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub run_scope: Option<String>,
}

/// What a file's scenarios are for, declared with [`crate::feature`].
///
/// Scenarios say what the system does. A declaration says why the feature
/// exists and who it serves, so a reader meets the intent before the examples.
#[derive(Serialize, Clone, Default, Debug)]
#[serde(rename_all = "camelCase")]
pub struct RawFeature {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub source_file: Option<String>,
    pub title: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub kind: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub narrative: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tags: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub glossary: Option<Vec<RawGlossaryTerm>>,
}

/// One entry in a feature's glossary.
#[derive(Serialize, Clone, Default, Debug)]
#[serde(rename_all = "camelCase")]
pub struct RawGlossaryTerm {
    pub term: String,
    pub definition: String,
}

#[derive(Serialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct RawTestCase {
    pub status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub external_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub story: Option<StoryMeta>,
    /// Test file the scenario was written in. The report groups by it, and a
    /// feature declaration keys on the same path.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub source_file: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub duration_ms: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<RawError>,
    pub retry: i32,
    pub retries: i32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub attachments: Option<Vec<RawAttachment>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub step_events: Option<Vec<RawStepEvent>>,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct StoryMeta {
    pub scenario: String,
    pub steps: Vec<StoryStep>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tags: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tickets: Option<Vec<Ticket>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub covers: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub meta: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub docs: Option<Vec<DocEntry>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub source_order: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub otel_spans: Option<Vec<serde_json::Value>>,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct StoryStep {
    pub keyword: String,
    pub text: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mode: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub wrapped: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub duration_ms: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub docs: Option<Vec<DocEntry>>,
    /// Assertions attributable to this step.
    ///
    /// Rust has no assertion counter, so this is set only when the author wraps
    /// a claim in `expect_step`/`fn_step("Then", ..)`. `None` means unobserved,
    /// which is not the same as zero.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub assertions: Option<u32>,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct RawError {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stack: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RawAttachment {
    pub name: String,
    pub media_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub body: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub encoding: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub charset: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub file_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub byte_length: Option<usize>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub step_index: Option<usize>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub step_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RawStepEvent {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub index: Option<usize>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub duration_ms: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RawCIInfo {
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub build_number: Option<String>,
}
