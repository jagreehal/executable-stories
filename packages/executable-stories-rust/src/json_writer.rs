use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};

use serde::Serialize;

use crate::types::{RawRun, SCHEMA_URL};

/// Tags a `RawRun` with the `$schema` pointer at write time. Keeping `$schema`
/// out of the public `RawRun` struct means adding it never breaks a consumer's
/// struct literal. `flatten` emits it as the first key, ahead of the run's own
/// fields, so editors pick it up as they open the file.
#[derive(Serialize)]
struct SchemaTagged<'a> {
    #[serde(rename = "$schema")]
    schema: &'static str,
    #[serde(flatten)]
    run: &'a RawRun,
}

/// Distinguishes concurrent writes within one process. Named for the process
/// alone, two threads writing different destinations share one scratch file.
static TEMP_SEQUENCE: AtomicU64 = AtomicU64::new(0);

/// How many names to try before giving up on finding a free one.
const TEMP_ATTEMPTS: u32 = 32;

/// Create a scratch file next to the destination that no other write holds.
///
/// `create_new` fails rather than truncating when the name is taken, so a name
/// already in use — by another thread, another process, or a crashed run that
/// left one behind — is retried instead of silently shared.
fn create_temp_file(parent: &Path) -> std::io::Result<(fs::File, PathBuf)> {
    let pid = std::process::id();
    for _ in 0..TEMP_ATTEMPTS {
        let sequence = TEMP_SEQUENCE.fetch_add(1, Ordering::Relaxed);
        let path = parent.join(format!(".raw-run-{pid}-{sequence}.json"));
        match fs::OpenOptions::new().write(true).create_new(true).open(&path) {
            Ok(file) => return Ok((file, path)),
            Err(err) if err.kind() != std::io::ErrorKind::AlreadyExists => return Err(err),
            // The name is taken; try the next one.
            Err(_) => {}
        }
    }
    Err(std::io::Error::new(
        std::io::ErrorKind::AlreadyExists,
        format!("no free scratch file in {} after {TEMP_ATTEMPTS} attempts", parent.display()),
    ))
}

/// Write a `RawRun` to disk as pretty-printed JSON, with the `$schema` pointer.
///
/// Creates parent directories if they don't already exist. The file appears
/// whole: it goes to a scratch file of its own and is renamed over the
/// destination, so a reader never sees a half-written run and a failed write
/// leaves the previous file intact.
///
/// # Errors
///
/// Returns an error if directory creation or file write fails.
pub fn write_raw_run(run: &RawRun, output_path: &str) -> std::io::Result<()> {
    let destination = Path::new(output_path);
    let parent =
        destination.parent().filter(|p| !p.as_os_str().is_empty()).unwrap_or(Path::new("."));
    fs::create_dir_all(parent)?;

    let json = serde_json::to_string_pretty(&SchemaTagged { schema: SCHEMA_URL, run })?;
    let (mut file, temp) = create_temp_file(parent)?;

    // Closed before the rename: Windows will not rename a file that is open.
    let written = file.write_all(json.as_bytes()).and_then(|()| file.flush());
    drop(file);

    let result = written.and_then(|()| fs::rename(&temp, destination));
    if result.is_err() {
        let _ = fs::remove_file(&temp);
    }
    result
}

#[cfg(test)]
mod write_tests {
    use super::write_raw_run;
    use crate::types::{RawRun, RawTestCase};

    fn run_titled(title: &str) -> RawRun {
        RawRun {
            schema_version: 1,
            test_cases: vec![RawTestCase {
                status: "pass".to_string(),
                title: Some(title.to_string()),
                source_file: Some("tests/a.rs".to_string()),
                ..Default::default()
            }],
            features: Vec::new(),
            project_root: "/tmp/project".to_string(),
            started_at_ms: Some(1.0),
            finished_at_ms: Some(2.0),
            ci: None,
            git_sha: None,
            package_version: None,
            run_scope: Some("full".to_string()),
        }
    }

    #[test]
    fn concurrent_writes_do_not_tread_on_each_other() {
        // Every writer shares the destination's directory, so a scratch file
        // named only for the process would be the same file for all of them.
        let dir = std::env::temp_dir().join(format!("es-rust-concurrent-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();

        let writers: Vec<_> = (0..16)
            .map(|n| {
                let output = dir.join(format!("raw-run-{n}.json"));
                std::thread::spawn(move || {
                    write_raw_run(&run_titled(&format!("scenario {n}")), output.to_str().unwrap())
                        .map(|()| n)
                })
            })
            .collect();

        for writer in writers {
            let n = writer.join().unwrap().expect("write failed");
            let written: serde_json::Value = serde_json::from_str(
                &std::fs::read_to_string(dir.join(format!("raw-run-{n}.json"))).unwrap(),
            )
            .unwrap();
            assert_eq!(written["testCases"][0]["title"], format!("scenario {n}"));
        }

        // Every scratch file is renamed or cleaned up, so only the outputs remain.
        let leftovers: Vec<_> = std::fs::read_dir(&dir)
            .unwrap()
            .filter_map(Result::ok)
            .filter(|e| e.file_name().to_string_lossy().starts_with(".raw-run-"))
            .collect();
        assert!(leftovers.is_empty(), "{} scratch files left behind", leftovers.len());
    }

    #[test]
    fn the_file_is_renamed_into_place() {
        let dir = std::env::temp_dir().join(format!("es-rust-write-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        let output = dir.join("raw-run.json");

        write_raw_run(
            &RawRun {
                schema_version: 1,
                test_cases: vec![RawTestCase {
                    status: "pass".to_string(),
                    source_file: Some("tests/a.rs".to_string()),
                    ..Default::default()
                }],
                features: Vec::new(),
                project_root: "/tmp/project".to_string(),
                started_at_ms: Some(1.0),
                finished_at_ms: Some(2.0),
                ci: None,
                git_sha: None,
                package_version: None,
                run_scope: Some("full".to_string()),
            },
            output.to_str().unwrap(),
        )
        .unwrap();

        let written: serde_json::Value =
            serde_json::from_str(&std::fs::read_to_string(&output).unwrap()).unwrap();
        assert_eq!(written["schemaVersion"], 1);
        // Renamed into place, so nothing is left alongside it.
        let leftovers: Vec<_> = std::fs::read_dir(&dir)
            .unwrap()
            .filter_map(Result::ok)
            .filter(|e| e.file_name().to_string_lossy().starts_with(".raw-run-"))
            .collect();
        assert!(leftovers.is_empty(), "temporary file left behind");
    }
}
