use std::fs;
use std::path::Path;

use crate::types::RawRun;

/// Write a `RawRun` to disk as pretty-printed JSON.
///
/// Creates parent directories if they don't already exist.
///
/// # Errors
///
/// Returns an error if directory creation or file write fails.
pub fn write_raw_run(run: &RawRun, output_path: &str) -> std::io::Result<()> {
    if let Some(parent) = Path::new(output_path).parent() {
        fs::create_dir_all(parent)?;
    }
    let json = serde_json::to_string_pretty(run)?;
    fs::write(output_path, json)?;
    Ok(())
}
