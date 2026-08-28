use std::sync::{Mutex, Once};

use crate::json_writer;
use crate::types::{RawCIInfo, RawRun, RawTestCase};

static COLLECTED: Mutex<Vec<RawTestCase>> = Mutex::new(Vec::new());
static FEATURES: Mutex<Vec<crate::types::RawFeature>> = Mutex::new(Vec::new());
static ORDER_SEQ: Mutex<u32> = Mutex::new(0);

static EXIT_HOOK: Once = Once::new();

extern "C" fn write_results_at_exit() {
    // Unwinding across an FFI boundary is undefined behaviour, so swallow any
    // panic here. A failed write already printed on the way out.
    let _ = std::panic::catch_unwind(write_results);
}

/// Flush results when the process exits.
///
/// The test harness calls `std::process::exit`, which runs `atexit` handlers,
/// and it never calls a teardown function of ours. Registering from the first
/// `Story` keeps the boilerplate out of the consuming crate.
pub(crate) fn ensure_exit_hook() {
    EXIT_HOOK.call_once(|| {
        // SAFETY: `atexit` takes an `extern "C" fn()`. The handler touches only
        // process-wide statics, which outlive every atexit callback, and cannot
        // unwind past the boundary.
        unsafe {
            libc::atexit(write_results_at_exit);
        }
    });
}

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

/// Store a declaration, replacing an earlier one for the same file so a
/// re-declaration reads the way it does in source order.
pub(crate) fn record_feature(feature: crate::types::RawFeature) {
    let mut features = FEATURES.lock().unwrap();
    match features.iter_mut().find(|f| f.source_file == feature.source_file) {
        Some(existing) => *existing = feature,
        None => features.push(feature),
    }
}

/// Get a clone of all declared features.
pub(crate) fn get_features() -> Vec<crate::types::RawFeature> {
    FEATURES.lock().unwrap().clone()
}

fn detect_ci() -> Option<RawCIInfo> {
    if std::env::var("GITHUB_ACTIONS").as_deref() == Ok("true") {
        let url = match (
            std::env::var("GITHUB_SERVER_URL"),
            std::env::var("GITHUB_REPOSITORY"),
            std::env::var("GITHUB_RUN_ID"),
        ) {
            (Ok(s), Ok(r), Ok(id)) => Some(format!("{s}/{r}/actions/runs/{id}")),
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
        return Some(RawCIInfo { name: "ci".to_string(), build_number: None, url: None });
    }
    None
}

/// Write all collected results to JSON.
///
/// The output path is determined by the `EXECUTABLE_STORIES_OUTPUT` environment variable,
/// defaulting to `.executable-stories/raw-run.json`.
///
/// Called automatically when the test binary exits. Call it directly only to
/// control when the file lands.
///
/// libtest flags that consume the argument after them. Their value is a bare
/// word in argv that names no test, so it must not be read as a filter.
const VALUE_TAKING_FLAGS: &[&str] =
    &["--test-threads", "--logfile", "--format", "--color", "--skip", "-Z", "--shuffle-seed"];

/// Whether the run was narrowed by test name, so the tests reported for each
/// source file are not that file's complete set.
///
/// `cargo test <filter>` reaches the test binary as a positional argument, and
/// `--skip` narrows a run just as much, so both count. Everything else in argv
/// is a flag or a flag's value.
fn is_name_filtered(args: &[String]) -> bool {
    let mut rest = args.iter().skip(1); // argv[0] is the binary
    while let Some(arg) = rest.next() {
        if arg == "--skip" {
            return true;
        }
        if VALUE_TAKING_FLAGS.contains(&arg.as_str()) {
            rest.next(); // consume the value so it is not read as a filter
            continue;
        }
        if arg == "--" || arg.starts_with('-') {
            continue;
        }
        return true;
    }
    false
}

/// # Panics
///
/// Panics if writing the JSON file fails (e.g. permission or I/O error).
#[allow(clippy::missing_panics_doc)]
pub fn write_results() {
    let cases = get_all();
    if cases.is_empty() {
        return;
    }

    let output = std::env::var("EXECUTABLE_STORIES_OUTPUT")
        .unwrap_or_else(|_| ".executable-stories/raw-run.json".to_string());

    let cwd = std::env::current_dir().map(|p| p.to_string_lossy().to_string()).unwrap_or_default();

    let run = RawRun {
        schema_version: 1,
        test_cases: cases,
        features: get_features(),
        project_root: cwd,
        started_at_ms: None,
        finished_at_ms: None,
        ci: detect_ci(),
        run_scope: Some(
            if is_name_filtered(&std::env::args().collect::<Vec<_>>()) {
                "filtered".to_string()
            } else {
                "full".to_string()
            },
        ),
    };

    json_writer::write_raw_run(&run, &output).expect("Failed to write raw run JSON");
    print_next_step(&output);
}

/// Tell the user how to turn the run JSON into a report.
///
/// The JS adapters render reports in-process, so their users never need to know
/// the CLI exists. Rust hands off to the CLI instead, so without this the run
/// ends with a file and no indication of what to do with it. stderr keeps piped
/// output clean; `EXECUTABLE_STORIES_QUIET` silences it in CI.
fn print_next_step(output_path: &str) {
    if std::env::var_os("EXECUTABLE_STORIES_QUIET").is_some() {
        return;
    }
    eprintln!("\nexecutable-stories: wrote {output_path}");
    eprintln!("  next: executable-stories format {output_path} --format html");
}

/// Reset the collector state. Useful for testing.
#[allow(dead_code)]
pub fn reset() {
    COLLECTED.lock().unwrap().clear();
    FEATURES.lock().unwrap().clear();
    *ORDER_SEQ.lock().unwrap() = 0;
}

#[cfg(test)]
mod name_filter_tests {
    use super::is_name_filtered;

    fn args(list: &[&str]) -> Vec<String> {
        list.iter().map(|s| (*s).to_string()).collect()
    }

    #[test]
    fn plain_run_is_not_filtered() {
        assert!(!is_name_filtered(&args(&["target/debug/deps/story-abc123"])));
    }

    #[test]
    fn positional_filter_marks_the_run_filtered() {
        // `cargo test refuses` reaches the binary as a positional argument.
        assert!(is_name_filtered(&args(&["bin", "refuses"])));
    }

    #[test]
    fn skip_flag_marks_the_run_filtered() {
        assert!(is_name_filtered(&args(&["bin", "--skip", "slow"])));
    }

    #[test]
    fn libtest_flags_alone_are_not_a_filter() {
        assert!(!is_name_filtered(&args(&["bin", "--nocapture", "--exact"])));
    }

    #[test]
    fn a_flags_value_is_not_mistaken_for_a_filter() {
        // `--test-threads 1` puts a bare "1" in argv that names no test.
        assert!(!is_name_filtered(&args(&["bin", "--test-threads", "1"])));
        assert!(!is_name_filtered(&args(&["bin", "--format", "terse"])));
    }
}
