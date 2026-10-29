use serde::{Deserialize, Serialize};

use crate::doc_entry::DocEntry;

/// A ticket or issue a scenario relates to, with an optional link.
#[derive(Debug, Clone, Serialize)]
pub struct Ticket {
    /// The ticket identifier, such as `JIRA-123`.
    pub id: String,
    /// A link to the ticket.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,
}

/// Published raw-run schema, emitted as `$schema` so editors validate the
/// output file as the adapter writes it. `executable-stories doctor` also
/// reports its presence.
pub const SCHEMA_URL: &str = "https://executable-stories.dev/schemas/raw-run.schema.json";

/// One run of the test binary: every scenario it recorded, written as raw run JSON.
#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct RawRun {
    /// Raw run schema version. Always 1.
    pub schema_version: u32,
    /// Every test case the run recorded.
    pub test_cases: Vec<RawTestCase>,
    /// Feature declarations, keyed to their source files.
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub features: Vec<RawFeature>,
    /// Absolute path of the project root. Relative attachment paths resolve against it.
    pub project_root: String,
    /// When the run started, in Unix epoch milliseconds.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub started_at_ms: Option<f64>,
    /// When the run finished, in Unix epoch milliseconds.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub finished_at_ms: Option<f64>,
    /// The CI build the run came from, when it ran in CI.
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

/// What a file's scenarios are for, declared with [`crate::Feature`].
///
/// Scenarios say what the system does. A declaration says why the feature
/// exists and who it serves, so a reader meets the intent before the examples.
#[derive(Serialize, Clone, Default, Debug)]
#[serde(rename_all = "camelCase")]
pub struct RawFeature {
    /// The source file the declaration was made in. A declaration without one is dropped.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub source_file: Option<String>,
    /// The heading readers see for the feature.
    pub title: String,
    /// How to introduce the feature: `ability`, `business-need`, or absent for a plain feature.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub kind: Option<String>,
    /// Markdown explaining why the feature exists and who it serves.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub narrative: Option<String>,
    /// Tags applied to every scenario in the file.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tags: Option<Vec<String>>,
    /// Terms the feature defines.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub glossary: Option<Vec<RawGlossaryTerm>>,
}

/// One entry in a feature's glossary.
#[derive(Serialize, Clone, Default, Debug)]
#[serde(rename_all = "camelCase")]
pub struct RawGlossaryTerm {
    /// The term the scenarios use.
    pub term: String,
    /// What the term means.
    pub definition: String,
}

/// One test as it ran: its status, its story and anything it attached.
#[derive(Serialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct RawTestCase {
    /// How the test ended: `pass`, `fail`, `skip`, `todo` and so on.
    pub status: String,
    /// The test framework's own identifier for the test.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub external_id: Option<String>,
    /// The test's name.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
    /// The scenario the test recorded, if it recorded one.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub story: Option<StoryMeta>,
    /// Test file the scenario was written in. The report groups by it, and a
    /// feature declaration keys on the same path.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub source_file: Option<String>,
    /// How long the test took, in milliseconds.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub duration_ms: Option<f64>,
    /// Why the test failed, if it did.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<RawError>,
    /// Which attempt this was, from 0.
    pub retry: i32,
    /// How many retries the test was allowed.
    pub retries: i32,
    /// Files and inline bodies attached to the test.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub attachments: Option<Vec<RawAttachment>>,
    /// Timing and status for each step.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub step_events: Option<Vec<RawStepEvent>>,
}

/// A scenario: its title, steps and the docs attached to it.
#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct StoryMeta {
    /// The scenario's title.
    pub scenario: String,
    /// The scenario's steps, in order.
    pub steps: Vec<StoryStep>,
    /// Tags for filtering and grouping, such as `smoke`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tags: Option<Vec<String>>,
    /// Tickets or issues the scenario relates to.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tickets: Option<Vec<Ticket>>,
    /// Product code paths or globs the scenario exercises, relative to the project root.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub covers: Option<Vec<String>>,
    /// Your own metadata for the scenario.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub meta: Option<serde_json::Value>,
    /// Docs attached to the scenario rather than to one step.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub docs: Option<Vec<DocEntry>>,
    /// The order the scenario was defined in, for stable sorting.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub source_order: Option<u32>,
    /// OpenTelemetry spans captured for the scenario, rendered as a trace waterfall.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub otel_spans: Option<Vec<serde_json::Value>>,
    /// When the scenario started (epoch ms): `Story::new`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub started_at_ms: Option<f64>,
}

/// One Given/When/Then step of a scenario.
#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct StoryStep {
    /// The step keyword as it renders: `Given`, `When`, `Then`, `And` or `But`.
    pub keyword: String,
    /// What the step says.
    pub text: String,
    /// The step's identifier within the scenario, such as `step-0`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub id: Option<String>,
    /// How the step renders: `skip`, `only`, `todo`, `fails` or `concurrent`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mode: Option<String>,
    /// Whether the step wraps a function body (`fn_step` or `expect_step`).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub wrapped: Option<bool>,
    /// How long the step took, in milliseconds.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub duration_ms: Option<f64>,
    /// Docs attached to this step.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub docs: Option<Vec<DocEntry>>,
    /// Assertions attributable to this step.
    ///
    /// Rust has no assertion counter, so this is set only when the author wraps
    /// a claim in `expect_step`/`fn_step("Then", ..)`. `None` means unobserved,
    /// which is not the same as zero.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub assertions: Option<u32>,
    /// When the step started (epoch ms): the step call, or a wrapped body's start.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub started_at_ms: Option<f64>,
}

/// Why a test failed.
#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct RawError {
    /// The failure message.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    /// Where the failure happened.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stack: Option<String>,
}

/// A file or inline body attached to a test, such as a screenshot or log.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RawAttachment {
    /// A readable name for the attachment.
    pub name: String,
    /// The MIME type, such as `image/png`.
    pub media_type: String,
    /// The file's path, relative to the project root or absolute.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub path: Option<String>,
    /// Inline content: base64 for binary data, or text.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub body: Option<String>,
    /// How an inline body is encoded: `BASE64` or `IDENTITY`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub encoding: Option<String>,
    /// The character set of an `IDENTITY` text body. Defaults to utf-8.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub charset: Option<String>,
    /// The artifact's file name, when it differs from `name`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub file_name: Option<String>,
    /// The size in bytes, used to decide whether to embed or link it.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub byte_length: Option<usize>,
    /// The index of the step the attachment belongs to. Absent means the whole test.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub step_index: Option<usize>,
    /// The id of the step the attachment belongs to. Preferred over `step_index`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub step_id: Option<String>,
}

/// Timing and status for one step, as the test reported it.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RawStepEvent {
    /// The step's index, from 0.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub index: Option<usize>,
    /// What the step says.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
    /// How the step ended.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,
    /// How long the step took, in milliseconds.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub duration_ms: Option<f64>,
}

/// The CI build a run came from.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RawCIInfo {
    /// The CI provider, such as `GitHub Actions`.
    pub name: String,
    /// A link to the CI build.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,
    /// The CI build number or run id.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub build_number: Option<String>,
}
