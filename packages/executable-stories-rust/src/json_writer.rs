use std::fs;
use std::path::Path;

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

/// Write a `RawRun` to disk as pretty-printed JSON, with the `$schema` pointer.
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
    let json = serde_json::to_string_pretty(&SchemaTagged { schema: SCHEMA_URL, run })?;
    fs::write(output_path, json)?;
    Ok(())
}
