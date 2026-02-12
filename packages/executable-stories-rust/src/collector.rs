use std::sync::Mutex;

use crate::json_writer;
use crate::types::*;

static COLLECTED: Mutex<Vec<RawTestCase>> = Mutex::new(Vec::new());
static ORDER_SEQ: Mutex<u32> = Mutex::new(0);

/// Record a completed test case into the global collector.
pub fn record(tc: RawTestCase) {
    COLLECTED.lock().unwrap().push(tc);
}

/// Get the next source order value and increment the sequence.
pub fn next_order() -> u32 {
    let mut seq = ORDER_SEQ.lock().unwrap();
    let val = *seq;
    *seq += 1;
    val
}

/// Get a clone of all collected test cases.
pub fn get_all() -> Vec<RawTestCase> {
    COLLECTED.lock().unwrap().clone()
}

fn detect_ci() -> Option<RawCIInfo> {
    if std::env::var("GITHUB_ACTIONS").as_deref() == Ok("true") {
        let url = match (
            std::env::var("GITHUB_SERVER_URL"),
            std::env::var("GITHUB_REPOSITORY"),
            std::env::var("GITHUB_RUN_ID"),
        ) {
            (Ok(s), Ok(r), Ok(id)) => Some(format!("{}/{}/actions/runs/{}", s, r, id)),
            _ => None,
        };
        return Some(RawCIInfo {
            name: "github".to_string(),
            build_number: std::env::var("GITHUB_RUN_NUMBER").ok(),
            url,
        });
    }
    if std::env::var("CIRCLECI").as_deref() == Ok("true") {
        return Some(RawCIInfo {
            name: "circleci".to_string(),
            build_number: std::env::var("CIRCLE_BUILD_NUM").ok(),
            url: std::env::var("CIRCLE_BUILD_URL").ok(),
        });
    }
    if std::env::var("JENKINS_URL").is_ok() {
        return Some(RawCIInfo {
            name: "jenkins".to_string(),
            build_number: std::env::var("BUILD_NUMBER").ok(),
            url: std::env::var("BUILD_URL").ok(),
        });
    }
    if std::env::var("TRAVIS").as_deref() == Ok("true") {
        return Some(RawCIInfo {
            name: "travis".to_string(),
            build_number: std::env::var("TRAVIS_BUILD_NUMBER").ok(),
            url: std::env::var("TRAVIS_BUILD_WEB_URL").ok(),
        });
    }
    if std::env::var("GITLAB_CI").as_deref() == Ok("true") {
        return Some(RawCIInfo {
            name: "gitlab".to_string(),
            build_number: std::env::var("CI_PIPELINE_IID").ok(),
            url: std::env::var("CI_PIPELINE_URL").ok(),
        });
    }
    if std::env::var("CI").as_deref() == Ok("true") {
        return Some(RawCIInfo {
            name: "ci".to_string(),
            build_number: None,
            url: None,
        });
    }
    None
}

/// Write all collected results to JSON.
///
/// The output path is determined by the `EXECUTABLE_STORIES_OUTPUT` environment variable,
/// defaulting to `.executable-stories/raw-run.json`.
///
/// Call this at the end of your test suite.
pub fn write_results() {
    let cases = get_all();
    if cases.is_empty() {
        return;
    }

    let output = std::env::var("EXECUTABLE_STORIES_OUTPUT")
        .unwrap_or_else(|_| ".executable-stories/raw-run.json".to_string());

    let cwd = std::env::current_dir()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_default();

    let run = RawRun {
        schema_version: 1,
        test_cases: cases,
        project_root: cwd,
        started_at_ms: None,
        finished_at_ms: None,
        ci: detect_ci(),
    };

    json_writer::write_raw_run(&run, &output).expect("Failed to write raw run JSON");
}

/// Reset the collector state. Useful for testing.
pub fn reset() {
    COLLECTED.lock().unwrap().clear();
    *ORDER_SEQ.lock().unwrap() = 0;
}
