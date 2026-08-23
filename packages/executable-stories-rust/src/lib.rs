#![warn(clippy::all, clippy::pedantic)]

mod collector;
mod doc_entry;
mod json_writer;
mod story;
mod types;

pub use collector::write_results;

/// Declare what a file's scenarios are for, ahead of the examples.
///
/// Scenarios say what the system does. A declaration says why the feature
/// exists and who it serves, so a reader meets the intent before the examples.
///
/// Reach for [`declare_feature!`] rather than calling this directly: Rust has
/// no portable way to run code before a test binary's tests, so the macro
/// wraps the declaration in a `#[test]` of its own.
///
/// ```
/// use executable_stories::Feature;
///
/// Feature::new("Anyone can do arithmetic without a calculator app")
///     .ability()
///     .narrative("Switching apps for a quick sum loses your place.")
///     .term("operand", "One of the two numbers an operation is applied to.")
///     .declare(file!());
/// ```
pub struct Feature {
    title: String,
    kind: Option<String>,
    narrative: Option<String>,
    tags: Option<Vec<String>>,
    glossary: Vec<GlossaryTerm>,
}

pub use types::RawGlossaryTerm as GlossaryTerm;

impl Feature {
    /// Start a declaration with the heading readers will see.
    #[must_use]
    pub fn new(title: &str) -> Self {
        Feature {
            title: title.to_string(),
            kind: None,
            narrative: None,
            tags: None,
            glossary: Vec::new(),
        }
    }

    /// Frame the feature as something a person can now do.
    #[must_use]
    pub fn ability(mut self) -> Self {
        self.kind = Some("ability".to_string());
        self
    }

    /// Frame the feature as a cross-cutting concern nobody asks for by name,
    /// such as security or performance.
    #[must_use]
    pub fn business_need(mut self) -> Self {
        self.kind = Some("business-need".to_string());
        self
    }

    /// Explain, in markdown, why the feature exists and who it serves.
    #[must_use]
    pub fn narrative(mut self, narrative: &str) -> Self {
        self.narrative = Some(narrative.to_string());
        self
    }

    /// Apply tags to every scenario in the file.
    #[must_use]
    pub fn tags(mut self, tags: &[&str]) -> Self {
        self.tags = Some(tags.iter().map(|t| (*t).to_string()).collect());
        self
    }

    /// Define a term the scenarios use.
    #[must_use]
    pub fn term(mut self, term: &str, definition: &str) -> Self {
        self.glossary.push(GlossaryTerm {
            term: term.to_string(),
            definition: definition.to_string(),
        });
        self
    }

    /// Record the declaration against a source file. Pass `file!()`.
    pub fn declare(self, source_file: &str) {
        collector::record_feature(types::RawFeature {
            source_file: Some(source_file.to_string()),
            title: self.title,
            kind: self.kind,
            narrative: self.narrative,
            tags: self.tags,
            glossary: if self.glossary.is_empty() { None } else { Some(self.glossary) },
        });
    }
}

pub use doc_entry::{DocEntry, HtmlOptions};
pub use json_writer::write_raw_run as write_raw_run_to_path;
pub use story::{StepDoc, Story};
pub use types::*;

/// Declare a feature for the current test file.
///
/// Rust runs nothing before a test binary's tests, so the declaration goes in a
/// `#[test]` of its own. Put this at module scope, once per file:
///
/// ```
/// use executable_stories::{declare_feature, Feature};
///
/// declare_feature!(
///     Feature::new("Anyone can do arithmetic without a calculator app")
///         .ability()
///         .narrative("Switching apps for a quick sum loses your place.")
/// );
/// ```
///
/// Filtering tests (`cargo test add`) skips the generated test along with
/// everything else it excludes, so that run's report carries no narrative.
#[macro_export]
macro_rules! declare_feature {
    ($feature:expr $(,)?) => {
        #[test]
        fn declares_the_feature_for_this_file() {
            $feature.declare(file!());
        }
    };
}

#[cfg(test)]
mod source_file_tests {
    use crate::Story;

    /// A scenario must record the test file it was written in — the same path
    /// `declare_feature!` writes through `file!()`. The report groups by that
    /// path, so without it every scenario lands under "unknown" and its
    /// file's feature declaration reaches nothing. This test lives outside
    /// story.rs on purpose: if `#[track_caller]` were dropped, the recorded
    /// file would be story.rs and this assertion would catch it.
    #[test]
    fn story_records_the_calling_file() {
        let story = Story::new("a scenario declared in lib.rs");
        let file = story.source_file.clone().expect("source file recorded");
        assert!(file.ends_with("lib.rs"), "recorded {file}, want this file");
    }
}
