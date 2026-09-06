use std::path::{Path, PathBuf};
use std::sync::{Mutex, Once};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use crate::json_writer;
use crate::types::{RawCIInfo, RawRun, RawTestCase};

static COLLECTED: Mutex<Vec<RawTestCase>> = Mutex::new(Vec::new());
static FEATURES: Mutex<Vec<crate::types::RawFeature>> = Mutex::new(Vec::new());
static ORDER_SEQ: Mutex<u32> = Mutex::new(0);
/// When this test binary first recorded anything. Reports stamp their freshness
/// from the run's timestamps, so a run without them cannot say how old it is.
static STARTED_AT_MS: Mutex<Option<f64>> = Mutex::new(None);

static EXIT_HOOK: Once = Once::new();

/// How long to wait for `git rev-parse` before giving up on the commit sha.
const GIT_TIMEOUT: Duration = Duration::from_secs(5);

fn epoch_ms() -> f64 {
    SystemTime::now().duration_since(UNIX_EPOCH).map_or(0.0, |d| d.as_secs_f64() * 1000.0)
}

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
        *STARTED_AT_MS.lock().unwrap() = Some(epoch_ms());
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
        // `--skip` narrows the run, and `--ignored` runs only the tests an
        // ordinary run leaves out, so neither is a file's complete set.
        if arg == "--skip" || arg == "--ignored" {
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

/// Where the run file lands.
///
/// A relative `EXECUTABLE_STORIES_OUTPUT` is resolved against the project root
/// rather than the working directory, so the file lands where the docs say it
/// does however the test binary was started. An absolute one passes through.
fn resolve_output_path(project_root: &str) -> PathBuf {
    let declared = std::env::var("EXECUTABLE_STORIES_OUTPUT")
        .unwrap_or_else(|_| ".executable-stories/raw-run.json".to_string());
    Path::new(project_root).join(declared)
}

/// The commit this run describes.
///
/// CI exports it, and asking Git is the fallback. The call is bounded: this
/// runs as the process exits, and a Git that hangs would hold that up.
fn git_sha(project_root: &str) -> Option<String> {
    for key in ["GITHUB_SHA", "GIT_COMMIT", "CI_COMMIT_SHA"] {
        if let Ok(value) = std::env::var(key) {
            if !value.is_empty() {
                return Some(value);
            }
        }
    }

    let mut child = std::process::Command::new("git")
        .args(["rev-parse", "HEAD"])
        .current_dir(project_root)
        .stdout(std::process::Stdio::piped())
        // Nothing reads stderr, and Git writes to it whenever this is not a
        // repository.
        .stderr(std::process::Stdio::null())
        .stdin(std::process::Stdio::null())
        .spawn()
        .ok()?;

    let deadline = std::time::Instant::now() + GIT_TIMEOUT;
    loop {
        match child.try_wait() {
            Ok(Some(status)) => {
                if !status.success() {
                    return None;
                }
                break;
            }
            Ok(None) => {
                if std::time::Instant::now() >= deadline {
                    let _ = child.kill();
                    let _ = child.wait();
                    return None;
                }
                std::thread::sleep(Duration::from_millis(10));
            }
            Err(_) => return None,
        }
    }

    let mut output = String::new();
    std::io::Read::read_to_string(child.stdout.as_mut()?, &mut output).ok()?;
    let sha = output.trim().to_string();
    if sha.is_empty() { None } else { Some(sha) }
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

    let cwd = std::env::current_dir().map(|p| p.to_string_lossy().to_string()).unwrap_or_default();
    let output = resolve_output_path(&cwd);

    let run = RawRun {
        schema_version: 1,
        test_cases: cases,
        features: get_features(),
        project_root: cwd.clone(),
        started_at_ms: *STARTED_AT_MS.lock().unwrap(),
        finished_at_ms: Some(epoch_ms()),
        ci: detect_ci(),
        git_sha: git_sha(&cwd),
        package_version: Some(env!("CARGO_PKG_VERSION").to_string()),
        run_scope: Some(if is_name_filtered(&std::env::args().collect::<Vec<_>>()) {
            "filtered".to_string()
        } else {
            "full".to_string()
        }),
    };

    let output = output.to_string_lossy().to_string();
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
mod output_path_tests {
    use super::resolve_output_path;

    #[test]
    fn a_relative_override_lands_under_the_project_root() {
        temp_env("reports/raw-run.json", || {
            assert_eq!(
                resolve_output_path("/projects/app"),
                std::path::Path::new("/projects/app/reports/raw-run.json")
            );
        });
    }

    #[test]
    fn an_absolute_override_is_used_as_given() {
        temp_env("/elsewhere/raw-run.json", || {
            assert_eq!(
                resolve_output_path("/projects/app"),
                std::path::Path::new("/elsewhere/raw-run.json")
            );
        });
    }

    /// The variable is process-wide, so these two run under one lock.
    fn temp_env(value: &str, body: impl FnOnce()) {
        static LOCK: std::sync::Mutex<()> = std::sync::Mutex::new(());
        let _guard = LOCK.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
        // SAFETY: no other thread reads this variable while the lock is held.
        unsafe { std::env::set_var("EXECUTABLE_STORIES_OUTPUT", value) };
        body();
        unsafe { std::env::remove_var("EXECUTABLE_STORIES_OUTPUT") };
    }
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
    fn ignored_only_marks_the_run_filtered() {
        assert!(is_name_filtered(&args(&["bin", "--ignored"])));
    }

    #[test]
    fn including_ignored_tests_is_not_a_filter() {
        assert!(!is_name_filtered(&args(&["bin", "--include-ignored"])));
    }

    #[test]
    fn a_flags_value_is_not_mistaken_for_a_filter() {
        // `--test-threads 1` puts a bare "1" in argv that names no test.
        assert!(!is_name_filtered(&args(&["bin", "--test-threads", "1"])));
        assert!(!is_name_filtered(&args(&["bin", "--format", "terse"])));
    }
}
