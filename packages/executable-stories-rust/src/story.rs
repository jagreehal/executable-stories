use std::collections::{HashMap, HashSet};

use serde::Serialize;

use crate::collector;
use crate::doc_entry::DocEntry;
use crate::types::*;

/// Inline documentation for a step. Chain after a step method: `story.given("text").with_docs(vec![StepDoc::note("a note")])`.
#[derive(Clone)]
pub struct StepDoc(pub(crate) DocEntry);

impl StepDoc {
    pub fn note(text: &str) -> Self {
        StepDoc(DocEntry::note(text))
    }
    pub fn tag(names: &[&str]) -> Self {
        StepDoc(DocEntry::tag(names))
    }
    pub fn kv(label: &str, value: serde_json::Value) -> Self {
        StepDoc(DocEntry::kv(label, value))
    }
    pub fn json_doc(label: &str, value: &impl Serialize) -> Self {
        StepDoc(DocEntry::json_doc(label, value))
    }
    pub fn code(label: &str, content: &str, lang: Option<&str>) -> Self {
        StepDoc(DocEntry::code(label, content, lang))
    }
    pub fn table(label: &str, columns: &[&str], rows: &[&[&str]]) -> Self {
        StepDoc(DocEntry::table(label, columns, rows))
    }
    pub fn link(label: &str, url: &str) -> Self {
        StepDoc(DocEntry::link(label, url))
    }
    pub fn section(title: &str, markdown: &str) -> Self {
        StepDoc(DocEntry::section(title, markdown))
    }
    pub fn mermaid(code: &str, title: Option<&str>) -> Self {
        StepDoc(DocEntry::mermaid(code, title))
    }
    pub fn screenshot(path: &str, alt: Option<&str>) -> Self {
        StepDoc(DocEntry::screenshot(path, alt))
    }
    pub fn custom(type_name: &str, data: serde_json::Value) -> Self {
        StepDoc(DocEntry::custom(type_name, data))
    }
    fn apply(self, step: &mut StoryStep) {
        step.docs.get_or_insert_with(Vec::new).push(self.0);
    }
}

struct TimerEntry {
    start: std::time::Instant,
    step_index: Option<usize>,
    step_id: Option<String>,
    consumed: bool,
}

/// A BDD story builder that captures steps and emits a RawTestCase on drop.
///
/// Call `.pass()` before the story goes out of scope to mark the test as passed.
/// If `.pass()` is not called, the test case will be recorded with status `"fail"`.
pub struct Story {
    scenario: String,
    steps: Vec<StoryStep>,
    tags: Option<Vec<String>>,
    tickets: Option<Vec<String>>,
    meta: Option<serde_json::Value>,
    trace_url_template: Option<String>,
    docs: Vec<DocEntry>,
    current_step_index: Option<usize>,
    seen_primary: HashSet<String>,
    source_order: Option<u32>,
    start_time: std::time::Instant,
    passed: bool,
    step_counter: usize,
    attachments: Vec<RawAttachment>,
    active_timers: HashMap<usize, TimerEntry>,
    timer_counter: usize,
}

impl Story {
    /// Create a new story with the given scenario description.
    pub fn new(scenario: &str) -> Self {
        let mut story = Story {
            scenario: scenario.to_string(),
            steps: Vec::new(),
            tags: None,
            tickets: None,
            meta: None,
            trace_url_template: None,
            docs: Vec::new(),
            current_step_index: None,
            seen_primary: HashSet::new(),
            source_order: Some(collector::next_order()),
            start_time: std::time::Instant::now(),
            passed: false,
            step_counter: 0,
            attachments: Vec::new(),
            active_timers: HashMap::new(),
            timer_counter: 0,
        };
        story.bridge_otel();
        story
    }

    /// Set tags on the story (consumes and returns self for chaining at creation).
    pub fn with_tags(mut self, tags: &[&str]) -> Self {
        self.tags = Some(tags.iter().map(|t| t.to_string()).collect());
        self
    }

    /// Set tickets on the story (consumes and returns self for chaining at creation).
    pub fn with_tickets(mut self, tickets: &[&str]) -> Self {
        self.tickets = Some(tickets.iter().map(|t| t.to_string()).collect());
        self
    }

    /// Set the URL template for OTel trace links (uses {traceId} placeholder).
    /// Also settable via OTEL_TRACE_URL_TEMPLATE env var.
    pub fn with_trace_url_template(mut self, template: &str) -> Self {
        self.trace_url_template = Some(template.to_string());
        self
    }

    /// OTel bridge: detect active span, flow data bidirectionally.
    /// This is a no-op when the `otel` feature is not enabled.
    fn bridge_otel(&mut self) {
        #[cfg(feature = "otel")]
        {
            use opentelemetry::trace::TraceContextExt;
            let cx = opentelemetry::Context::current();
            let span_ref = cx.span();
            let span_ctx = span_ref.span_context();

            if !span_ctx.trace_id().to_string().chars().any(|c| c != '0') {
                return;
            }

            let trace_id = span_ctx.trace_id().to_string();
            let span_id = span_ctx.span_id().to_string();

            // OTel -> Story: capture traceId in structured meta
            self.meta = Some(serde_json::json!({
                "otel": { "traceId": &trace_id, "spanId": &span_id }
            }));

            // OTel -> Story: inject human-readable doc entries
            self.docs.push(DocEntry::kv("Trace ID", serde_json::json!(trace_id.clone())));

            let template = self.trace_url_template.clone()
                .or_else(|| std::env::var("OTEL_TRACE_URL_TEMPLATE").ok());
            if let Some(tmpl) = template {
                let url = tmpl.replace("{traceId}", &trace_id);
                self.docs.push(DocEntry::link("View Trace", &url));
            }

            // Story -> OTel: enrich active span with story attributes
            use opentelemetry::trace::Span;
            let span = cx.span();
            span.set_attribute(opentelemetry::KeyValue::new("story.scenario", self.scenario.clone()));
            if let Some(ref tags) = self.tags {
                span.set_attribute(opentelemetry::KeyValue::new("story.tags", format!("{:?}", tags)));
            }
            if let Some(ref tickets) = self.tickets {
                span.set_attribute(opentelemetry::KeyValue::new("story.tickets", format!("{:?}", tickets)));
            }
        }
    }

    // --- BDD step methods ---

    fn add_step(&mut self, keyword: &str, text: &str) -> &mut Self {
        // Auto-And: repeated primary keywords render as "And"
        let effective = match keyword {
            "Given" | "When" | "Then" => {
                if !self.seen_primary.insert(keyword.to_string()) {
                    "And"
                } else {
                    keyword
                }
            }
            _ => keyword,
        };
        let id = format!("step-{}", self.step_counter);
        self.step_counter += 1;
        self.steps.push(StoryStep {
            keyword: effective.to_string(),
            text: text.to_string(),
            id: Some(id),
            mode: None,
            wrapped: None,
            duration_ms: None,
            docs: None,
        });
        self.current_step_index = Some(self.steps.len() - 1);
        self
    }

    /// Add a Given step.
    pub fn given(&mut self, text: &str) -> &mut Self {
        self.add_step("Given", text)
    }

    /// Add a When step.
    pub fn when(&mut self, text: &str) -> &mut Self {
        self.add_step("When", text)
    }

    /// Add a Then step.
    pub fn then(&mut self, text: &str) -> &mut Self {
        self.add_step("Then", text)
    }

    /// Add an And step.
    pub fn and(&mut self, text: &str) -> &mut Self {
        self.add_step("And", text)
    }

    /// Add a But step.
    pub fn but(&mut self, text: &str) -> &mut Self {
        self.add_step("But", text)
    }

    // --- AAA pattern aliases ---

    /// Add an Arrange step (alias for Given).
    pub fn arrange(&mut self, text: &str) -> &mut Self {
        self.add_step("Given", text)
    }

    /// Add an Act step (alias for When).
    pub fn act(&mut self, text: &str) -> &mut Self {
        self.add_step("When", text)
    }

    /// Add an Assert step (alias for Then). Uses assert_that because assert! is a macro.
    pub fn assert_that(&mut self, text: &str) -> &mut Self {
        self.add_step("Then", text)
    }

    // --- Additional aliases ---

    /// Add a Setup step (alias for Given).
    pub fn setup(&mut self, text: &str) -> &mut Self {
        self.add_step("Given", text)
    }

    /// Add a Context step (alias for Given).
    pub fn context(&mut self, text: &str) -> &mut Self {
        self.add_step("Given", text)
    }

    /// Add an Execute step (alias for When).
    pub fn execute(&mut self, text: &str) -> &mut Self {
        self.add_step("When", text)
    }

    /// Add an Action step (alias for When).
    pub fn action(&mut self, text: &str) -> &mut Self {
        self.add_step("When", text)
    }

    /// Add a Verify step (alias for Then).
    pub fn verify(&mut self, text: &str) -> &mut Self {
        self.add_step("Then", text)
    }

    /// Attach inline documentation entries to the most recently added step.
    pub fn with_docs(&mut self, docs: Vec<StepDoc>) -> &mut Self {
        if let Some(idx) = self.current_step_index {
            let step = &mut self.steps[idx];
            for doc in docs {
                doc.apply(step);
            }
        }
        self
    }

    // --- Step timing ---

    /// Start a high-resolution timer tied to the current step. Returns a token to pass to end_timer().
    pub fn start_timer(&mut self) -> usize {
        let token = self.timer_counter;
        self.timer_counter += 1;
        let entry = TimerEntry {
            start: std::time::Instant::now(),
            step_index: self.current_step_index,
            step_id: self.current_step_id(),
            consumed: false,
        };
        self.active_timers.insert(token, entry);
        token
    }

    /// Stop the timer and record duration_ms on the step that was active when start_timer() was called. Double-end is a no-op.
    pub fn end_timer(&mut self, token: usize) {
        let entry = match self.active_timers.get_mut(&token) {
            Some(e) if !e.consumed => e,
            _ => return,
        };
        entry.consumed = true;
        let duration_ms = entry.start.elapsed().as_secs_f64() * 1000.0;
        let step_index = entry.step_index;
        let step_id = entry.step_id.clone();

        if let Some(idx) = step_index {
            if let Some(step) = self.steps.get_mut(idx) {
                step.duration_ms = Some(duration_ms);
            }
        } else if let Some(id) = step_id {
            if let Some(step) = self.steps.iter_mut().find(|s| s.id.as_deref() == Some(id.as_str())) {
                step.duration_ms = Some(duration_ms);
            }
        }
    }

    // --- Wrapped step execution ---

    /// Wrap a closure as a BDD step with automatic timing.
    /// Creates a step marked as `wrapped=true`, executes the body,
    /// records `duration_ms`, and re-panics if the body panicked.
    pub fn fn_step<F, T>(&mut self, keyword: &str, text: &str, body: F) -> T
    where
        F: FnOnce() -> T,
    {
        self.add_step(keyword, text);
        let idx = self.steps.len() - 1;
        self.steps[idx].wrapped = Some(true);

        let start = std::time::Instant::now();
        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(body));
        self.steps[idx].duration_ms = Some(start.elapsed().as_secs_f64() * 1000.0);

        match result {
            Ok(val) => val,
            Err(panic) => std::panic::resume_unwind(panic),
        }
    }

    /// Shorthand for `fn_step("Then", text, body)`.
    pub fn expect_step<F, T>(&mut self, text: &str, body: F) -> T
    where
        F: FnOnce() -> T,
    {
        self.fn_step("Then", text, body)
    }

    // --- Doc attachment methods ---

    /// Attach a doc entry either to the current step or to the story-level docs.
    fn attach_doc(&mut self, entry: DocEntry) -> &mut Self {
        if let Some(idx) = self.current_step_index {
            let step = &mut self.steps[idx];
            let docs = step.docs.get_or_insert_with(Vec::new);
            docs.push(entry);
        } else {
            self.docs.push(entry);
        }
        self
    }

    /// Attach a text note to the current step or story.
    pub fn note(&mut self, text: &str) -> &mut Self {
        self.attach_doc(DocEntry::note(text))
    }

    /// Attach tag annotations to the current step or story.
    pub fn tag(&mut self, names: &[&str]) -> &mut Self {
        self.attach_doc(DocEntry::tag(names))
    }

    /// Attach a key-value pair to the current step or story.
    pub fn kv(&mut self, label: &str, value: serde_json::Value) -> &mut Self {
        self.attach_doc(DocEntry::kv(label, value))
    }

    /// Attach a JSON document (serialized as code with lang=json) to the current step or story.
    pub fn json(&mut self, label: &str, value: &impl Serialize) -> &mut Self {
        self.attach_doc(DocEntry::json_doc(label, value))
    }

    /// Attach a code block to the current step or story.
    pub fn code(&mut self, label: &str, content: &str, lang: Option<&str>) -> &mut Self {
        self.attach_doc(DocEntry::code(label, content, lang))
    }

    /// Attach a table to the current step or story.
    pub fn table(&mut self, label: &str, columns: &[&str], rows: &[&[&str]]) -> &mut Self {
        self.attach_doc(DocEntry::table(label, columns, rows))
    }

    /// Attach a link to the current step or story.
    pub fn link(&mut self, label: &str, url: &str) -> &mut Self {
        self.attach_doc(DocEntry::link(label, url))
    }

    /// Attach a markdown section to the current step or story.
    pub fn section(&mut self, title: &str, markdown: &str) -> &mut Self {
        self.attach_doc(DocEntry::section(title, markdown))
    }

    /// Attach a mermaid diagram to the current step or story.
    pub fn mermaid(&mut self, code: &str, title: Option<&str>) -> &mut Self {
        self.attach_doc(DocEntry::mermaid(code, title))
    }

    /// Attach a screenshot reference to the current step or story.
    pub fn screenshot(&mut self, path: &str, alt: Option<&str>) -> &mut Self {
        self.attach_doc(DocEntry::screenshot(path, alt))
    }

    /// Attach a custom doc entry to the current step or story.
    pub fn custom(&mut self, type_name: &str, data: serde_json::Value) -> &mut Self {
        self.attach_doc(DocEntry::custom(type_name, data))
    }

    // --- Attachment methods ---

    /// Return the ID of the current (last) step, if any.
    fn current_step_id(&self) -> Option<String> {
        self.steps.last().and_then(|s| s.id.clone())
    }

    /// Attach a file-based attachment to the story.
    pub fn attach(&mut self, name: &str, media_type: &str, path: &str) -> &mut Self {
        let mut a = RawAttachment {
            name: name.to_string(),
            media_type: media_type.to_string(),
            path: if path.is_empty() { None } else { Some(path.to_string()) },
            body: None,
            encoding: None,
            charset: None,
            file_name: None,
            byte_length: None,
            step_index: None,
            step_id: None,
        };
        if let Some(ref current) = self.current_step_id() {
            a.step_index = Some(self.steps.len().saturating_sub(1));
            a.step_id = Some(current.clone());
        }
        self.attachments.push(a);
        self
    }

    /// Attach an inline (body-based) attachment to the story.
    pub fn attach_inline(&mut self, name: &str, media_type: &str, body: &str, encoding: &str) -> &mut Self {
        let mut a = RawAttachment {
            name: name.to_string(),
            media_type: media_type.to_string(),
            path: None,
            body: Some(body.to_string()),
            encoding: Some(encoding.to_string()),
            charset: None,
            file_name: None,
            byte_length: None,
            step_index: None,
            step_id: None,
        };
        if let Some(ref current) = self.current_step_id() {
            a.step_index = Some(self.steps.len().saturating_sub(1));
            a.step_id = Some(current.clone());
        }
        self.attachments.push(a);
        self
    }

    /// Mark the story as passed. Must be called before the story goes out of scope.
    pub fn pass(&mut self) {
        self.passed = true;
    }
}

impl Drop for Story {
    fn drop(&mut self) {
        let status = if self.passed { "pass" } else { "fail" };
        let duration = self.start_time.elapsed().as_secs_f64() * 1000.0;

        let step_events: Vec<RawStepEvent> = self
            .steps
            .iter()
            .enumerate()
            .filter_map(|(i, step)| {
                step.duration_ms.map(|d| RawStepEvent {
                    index: Some(i),
                    title: Some(step.text.clone()),
                    status: None,
                    duration_ms: Some(d),
                })
            })
            .collect();

        let tc = RawTestCase {
            status: status.to_string(),
            title: Some(self.scenario.clone()),
            story: Some(StoryMeta {
                scenario: self.scenario.clone(),
                steps: self.steps.clone(),
                tags: self.tags.clone(),
                tickets: self.tickets.clone(),
                meta: self.meta.clone(),
                docs: if self.docs.is_empty() {
                    None
                } else {
                    Some(self.docs.clone())
                },
                source_order: self.source_order,
            }),
            duration_ms: Some(duration),
            retry: 0,
            retries: 0,
            attachments: if self.attachments.is_empty() { None } else { Some(self.attachments.clone()) },
            step_events: if step_events.is_empty() { None } else { Some(step_events) },
            ..Default::default()
        };
        collector::record(tc);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::thread;
    use std::time::Duration;

    #[test]
    fn auto_and_on_repeated_primary_keyword() {
        let mut story = Story::new("auto-and across story");
        story.given("first given");
        story.when("a when in between");
        story.given("second given");

        assert_eq!(story.steps[0].keyword, "Given");
        assert_eq!(story.steps[1].keyword, "When");
        assert_eq!(story.steps[2].keyword, "And");
    }

    #[test]
    fn aaa_aliases_produce_correct_keywords() {
        let mut story = Story::new("AAA story");
        story.arrange("precondition");
        story.act("action");
        story.assert_that("outcome");

        assert_eq!(story.steps[0].keyword, "Given");
        assert_eq!(story.steps[1].keyword, "When");
        assert_eq!(story.steps[2].keyword, "Then");
    }

    #[test]
    fn extra_aliases_produce_correct_keywords() {
        let mut story = Story::new("Extra aliases");
        story.setup("setup");
        story.context("context");
        story.execute("execute");
        story.action("action");
        story.verify("verify");

        assert_eq!(story.steps[0].keyword, "Given");
        assert_eq!(story.steps[1].keyword, "And");
        assert_eq!(story.steps[2].keyword, "When");
        assert_eq!(story.steps[3].keyword, "And");
        assert_eq!(story.steps[4].keyword, "Then");
    }

    #[test]
    fn with_docs_attaches_to_step() {
        let mut story = Story::new("With docs");
        story
            .given("a step")
            .with_docs(vec![StepDoc::note("a note"), StepDoc::tag(&["smoke"])]);

        assert_eq!(story.steps.len(), 1);
        let docs = story.steps[0].docs.as_ref().unwrap();
        assert_eq!(docs.len(), 2);
        let note = serde_json::to_value(&docs[0]).unwrap();
        assert_eq!(note["kind"], "note");
        assert_eq!(note["text"], "a note");
        let tag = serde_json::to_value(&docs[1]).unwrap();
        assert_eq!(tag["kind"], "tag");
    }

    #[test]
    fn step_timing() {
        let mut story = Story::new("Timed step");
        story.given("slow step");
        let token = story.start_timer();
        thread::sleep(Duration::from_millis(15));
        story.end_timer(token);
        story.pass();

        assert_eq!(story.steps.len(), 1);
        let d = story.steps[0].duration_ms.unwrap();
        assert!(d >= 10.0, "duration_ms should be >= 10, got {}", d);
    }

    #[test]
    fn double_end_timer_is_noop() {
        let mut story = Story::new("Double end");
        story.given("step");
        let token = story.start_timer();
        story.end_timer(token);
        story.end_timer(token); // no-op
        story.pass();

        assert_eq!(story.steps.len(), 1);
        assert!(story.steps[0].duration_ms.is_some());
    }

    #[test]
    fn fn_step_creates_wrapped_step() {
        let mut story = Story::new("fn_step test");
        let mut called = false;
        story.fn_step("Given", "a wrapped precondition", || {
            called = true;
        });
        story.pass();

        assert!(called);
        assert_eq!(story.steps.len(), 1);
        assert_eq!(story.steps[0].keyword, "Given");
        assert_eq!(story.steps[0].text, "a wrapped precondition");
        assert_eq!(story.steps[0].wrapped, Some(true));
        assert!(story.steps[0].duration_ms.is_some());
    }

    #[test]
    fn fn_step_records_duration() {
        let mut story = Story::new("fn_step duration");
        story.fn_step("When", "I wait briefly", || {
            thread::sleep(Duration::from_millis(15));
        });
        story.pass();

        let d = story.steps[0].duration_ms.unwrap();
        assert!(d >= 10.0, "duration_ms should be >= 10, got {}", d);
    }

    #[test]
    fn fn_step_returns_result() {
        let mut story = Story::new("fn_step return");
        let result = story.fn_step("When", "I compute", || 42);
        story.pass();

        assert_eq!(result, 42);
    }

    #[test]
    #[should_panic(expected = "boom")]
    fn fn_step_propagates_panics() {
        let mut story = Story::new("fn_step panic");
        story.fn_step("Then", "it panics", || {
            panic!("boom");
        });
        story.pass();
    }

    #[test]
    fn fn_step_auto_and_conversion() {
        let mut story = Story::new("fn_step auto-and");
        story.given("a text-only step");
        story.fn_step("Given", "a wrapped step", || {});
        story.pass();

        assert_eq!(story.steps[0].keyword, "Given");
        assert_eq!(story.steps[1].keyword, "And");
        assert_eq!(story.steps[1].wrapped, Some(true));
    }

    #[test]
    fn fn_step_integration_with_markers() {
        let mut story = Story::new("fn_step + markers");
        story.given("a text-only precondition");
        story.fn_step("When", "I perform action", || {});
        story.then("a text-only assertion");
        story.fn_step("Then", "the wrapped assertion", || {});
        story.pass();

        assert_eq!(story.steps.len(), 4);
        assert_eq!(story.steps[0].wrapped, None);
        assert_eq!(story.steps[1].wrapped, Some(true));
        assert_eq!(story.steps[2].wrapped, None);
        assert_eq!(story.steps[3].wrapped, Some(true));
    }

    #[test]
    fn expect_step_creates_wrapped_then_step() {
        let mut story = Story::new("expect_step test");
        let mut called = false;
        story.expect_step("the result is correct", || {
            called = true;
        });
        story.pass();

        assert!(called);
        assert_eq!(story.steps[0].keyword, "Then");
        assert_eq!(story.steps[0].text, "the result is correct");
        assert_eq!(story.steps[0].wrapped, Some(true));
        assert!(story.steps[0].duration_ms.is_some());
    }

    #[test]
    fn expect_step_returns_result() {
        let mut story = Story::new("expect_step return");
        let result = story.expect_step("check value", || true);
        story.pass();

        assert!(result);
    }
}
