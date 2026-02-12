# Executable Stories — Schema & Cross-Language Guide

Executable Stories turns test results from **any** language or framework into rich HTML, Markdown, JUnit XML, and Cucumber JSON reports. You produce a JSON file conforming to the [RawRun schema](raw-run.schema.json), then feed it to the `executable-stories` CLI.

> **The files in `examples/*.json` are RawRun JSON examples** — they are _not_ JUnit XML, pytest JSON, or any other native framework format. They show what the CLI expects as **input**.

---

## Installation

### Standalone binary (recommended for non-JS projects)

The CLI is compiled to a standalone binary via `bun build --compile` — **zero runtime dependencies**. Download the `executable-stories` binary for your platform from the [releases page](https://github.com/nicholasgriffintn/executable-stories/releases) and put it on your `PATH`.

```bash
# Example: Linux x64
chmod +x executable-stories
sudo mv executable-stories /usr/local/bin/
```

### npm (for JS/TS projects)

```bash
npm install -g executable-stories-formatters
# or locally
npm install --save-dev executable-stories-formatters
```

### Dev mode (for contributors)

```bash
pnpm install
pnpm build
node packages/executable-stories-formatters/dist/cli.js --help
```

---

## Quickstart

Create a minimal JSON file (`run.json`):

```json
{
  "schemaVersion": 1,
  "projectRoot": "/path/to/project",
  "testCases": [
    { "title": "Login succeeds", "status": "pass" },
    { "title": "Login fails with wrong password", "status": "fail" },
    { "title": "Registration disabled", "status": "skip" }
  ]
}
```

Generate an HTML report:

```bash
executable-stories format run.json --format html --output-dir reports
```

That's it. The `--synthesize-stories` flag (on by default) will create story metadata for test cases that don't have explicit BDD steps.

See [`examples/minimal.json`](examples/minimal.json) for the full minimal example.

---

## Schema Reference

The full schema is in [`raw-run.schema.json`](raw-run.schema.json). Here are the key types:

### RawRun (top level)

| Field            | Type            | Required | Description                                                  |
| ---------------- | --------------- | -------- | ------------------------------------------------------------ |
| `schemaVersion`  | `1`             | Yes      | Must be `1`                                                  |
| `testCases`      | `RawTestCase[]` | Yes      | All test cases from the run                                  |
| `projectRoot`    | `string`        | Yes      | Absolute path to project root (for resolving relative paths) |
| `startedAtMs`    | `number`        | No       | Run start time (Unix epoch ms)                               |
| `finishedAtMs`   | `number`        | No       | Run finish time (Unix epoch ms)                              |
| `packageVersion` | `string`        | No       | Version of the package under test                            |
| `gitSha`         | `string`        | No       | Git commit SHA                                               |
| `ci`             | `RawCIInfo`     | No       | CI environment info (`name`, `url`, `buildNumber`)           |
| `meta`           | `object`        | No       | Arbitrary metadata (escape hatch)                            |

### RawTestCase

| Field         | Type                   | Required | Description                                         |
| ------------- | ---------------------- | -------- | --------------------------------------------------- |
| `status`      | `RawStatus`            | Yes      | Test result status (see below)                      |
| `title`       | `string`               | No       | Human-readable test name                            |
| `externalId`  | `string`               | No       | Framework's native test ID                          |
| `titlePath`   | `string[]`             | No       | Suite/describe path down to the test name           |
| `sourceFile`  | `string`               | No       | Path to source file (relative to `projectRoot`)     |
| `sourceLine`  | `integer`              | No       | Line number (1-based)                               |
| `durationMs`  | `number`               | No       | Duration in **milliseconds**                        |
| `error`       | `{ message?, stack? }` | No       | Error info for failures                             |
| `story`       | `StoryMeta`            | No       | BDD story metadata (scenario, steps, tags, tickets) |
| `attachments` | `RawAttachment[]`      | No       | Screenshots, logs, artifacts                        |
| `meta`        | `object`               | No       | Arbitrary metadata                                  |
| `retry`       | `integer`              | No       | Retry attempt number (0-based)                      |
| `retries`     | `integer`              | No       | Total retries configured                            |
| `projectName` | `string`               | No       | Project name (e.g. Playwright project)              |
| `stepEvents`  | `RawStepEvent[]`       | No       | Step-level execution events                         |

### RawStatus

```
pass | fail | skip | todo | pending | timeout | interrupted | unknown
```

Emitters/converters should output these RawStatus values. Canonicalization normalizes them to `passed | failed | skipped | pending`:

| RawStatus     | Canonical |
| ------------- | --------- |
| `pass`        | `passed`  |
| `fail`        | `failed`  |
| `skip`        | `skipped` |
| `todo`        | `pending` |
| `pending`     | `pending` |
| `timeout`     | `failed`  |
| `interrupted` | `failed`  |
| `unknown`     | `skipped` |

### StoryMeta (BDD metadata)

| Field         | Type          | Required | Description                                |
| ------------- | ------------- | -------- | ------------------------------------------ |
| `scenario`    | `string`      | Yes      | Scenario title                             |
| `steps`       | `StoryStep[]` | No       | BDD steps (`keyword` + `text`)             |
| `tags`        | `string[]`    | No       | Tags for filtering (`smoke`, `auth`, etc.) |
| `tickets`     | `string[]`    | No       | Ticket references (`AUTH-101`, `SEC-42`)   |
| `suitePath`   | `string[]`    | No       | Parent suite names for grouping            |
| `docs`        | `DocEntry[]`  | No       | Story-level documentation                  |
| `meta`        | `object`      | No       | User-defined metadata                      |
| `sourceOrder` | `integer`     | No       | Source-order for stable sorting            |

### StoryStep

| Field     | Type                                                    | Required | Description                    |
| --------- | ------------------------------------------------------- | -------- | ------------------------------ |
| `keyword` | `Given \| When \| Then \| And \| But`                   | Yes      | BDD keyword (case-insensitive) |
| `text`    | `string`                                                | Yes      | Step description               |
| `mode`    | `normal \| skip \| only \| todo \| fails \| concurrent` | No       | Execution mode                 |
| `docs`    | `DocEntry[]`                                            | No       | Step-level documentation       |

### DocEntry kinds

`note`, `tag`, `kv`, `code`, `table`, `link`, `section`, `mermaid`, `screenshot`, `custom` — see [raw-run.schema.json](raw-run.schema.json) for full details on each kind.

---

## CLI Reference

```
executable-stories — Generate reports from test results JSON.

USAGE
  executable-stories format <file> [options]
  executable-stories format --stdin [options]
  executable-stories validate <file>
  executable-stories validate --stdin

SUBCOMMANDS
  format     Read raw test results and generate reports
  validate   Validate a JSON file against the schema (no output generated)
```

### Options

| Flag                         | Default        | Description                                                   |
| ---------------------------- | -------------- | ------------------------------------------------------------- |
| `--format <formats>`         | `html`         | Comma-separated: `html`, `markdown`, `junit`, `cucumber-json` |
| `--input-type <type>`        | `raw`          | Input type: `raw` or `canonical`                              |
| `--output-dir <dir>`         | `reports`      | Output directory                                              |
| `--output-name <name>`       | `test-results` | Base filename                                                 |
| `--synthesize-stories`       | on             | Synthesize story metadata for plain test results              |
| `--no-synthesize-stories`    |                | Disable story synthesis (strict mode)                         |
| `--html-title <title>`           | `Test Results` | HTML report title                                             |
| `--html-no-syntax-highlighting`  |                | Disable syntax highlighting in HTML (enabled by default)     |
| `--html-no-mermaid`              |                | Disable Mermaid diagrams in HTML (enabled by default)         |
| `--html-no-markdown`             |                | Disable markdown parsing in HTML (enabled by default)          |
| `--stdin`                        |                | Read JSON from stdin instead of file                          |
| `--json-summary`             | off            | Print machine-parsable JSON summary                           |
| `--emit-canonical <path>`    |                | Write canonical JSON to given path                            |
| `--help`                     |                | Show help message                                             |

### Exit Codes

| Code | Meaning                      |
| ---- | ---------------------------- |
| `0`  | Success                      |
| `1`  | Schema validation failure    |
| `2`  | Canonical validation failure |
| `3`  | Formatter/generation failure |
| `4`  | Bad arguments / usage error  |

### Examples

```bash
# Validate a JSON file
executable-stories validate run.json

# Generate HTML + Markdown reports
executable-stories format run.json --format html,markdown --output-dir reports

# Pipe from stdin
cat run.json | executable-stories format --stdin --format html

# Generate HTML with custom title (syntax highlighting, Mermaid, Markdown are on by default)
executable-stories format run.json --format html --html-title "Sprint 42 Results"

# Export canonical JSON for debugging
executable-stories format run.json --emit-canonical canonical.json
```

---

## Framework Guides

Each guide below shows the **converter** approach: run your tests with native tooling, convert the output to RawRun JSON, then feed it to `executable-stories`.

### Duration normalization

RawRun expects durations in **milliseconds** (`durationMs`). Most frameworks report seconds — multiply by 1000.

### Status mapping

| Framework native         | RawStatus |
| ------------------------ | --------- |
| JUnit: `SUCCESSFUL`      | `pass`    |
| JUnit: `FAILED`          | `fail`    |
| JUnit: `ABORTED`         | `skip`    |
| pytest: `passed`         | `pass`    |
| pytest: `failed`         | `fail`    |
| pytest: `skipped`        | `skip`    |
| pytest: `xfailed`        | `pending` |
| Go: `pass`               | `pass`    |
| Go: `fail`               | `fail`    |
| Go: `skip`               | `skip`    |
| xUnit: `Pass`            | `pass`    |
| xUnit: `Fail`            | `fail`    |
| xUnit: `Skip` / `NotRun` | `skip`    |
| Rust: `ok`               | `pass`    |
| Rust: `FAILED`           | `fail`    |
| Rust: `ignored`          | `skip`    |

---

### JUnit 5 (Java)

**Today**: Run tests with Maven/Gradle, parse Surefire XML, convert to RawRun JSON.

```bash
# 1. Run tests (produces target/surefire-reports/*.xml)
mvn test

# 2. Convert Surefire XML → RawRun JSON
python3 convert_surefire.py target/surefire-reports/ > run.json

# 3. Generate reports
executable-stories format run.json --format html --output-dir reports
```

Converter sketch (`convert_surefire.py`):

```python
#!/usr/bin/env python3
"""Convert Maven Surefire XML reports to RawRun JSON."""
import json, sys, os, xml.etree.ElementTree as ET

STATUS_MAP = {"SUCCESSFUL": "pass", "FAILED": "fail", "ABORTED": "skip"}

def convert(reports_dir):
    test_cases = []
    for fname in sorted(os.listdir(reports_dir)):
        if not fname.startswith("TEST-") or not fname.endswith(".xml"):
            continue
        tree = ET.parse(os.path.join(reports_dir, fname))
        for tc in tree.findall(".//testcase"):
            status = "pass"
            error = None
            if tc.find("failure") is not None:
                status = "fail"
                f = tc.find("failure")
                error = {"message": f.get("message", ""), "stack": f.text or ""}
            elif tc.find("skipped") is not None:
                status = "skip"
            # Surefire reports time in seconds (decimal)
            duration_s = float(tc.get("time", "0"))
            test_cases.append({
                "title": tc.get("name"),
                "status": status,
                "durationMs": round(duration_s * 1000),
                "sourceFile": tc.get("classname", "").replace(".", "/") + ".java",
                **({"error": error} if error else {}),
                "meta": {
                    "framework": "junit5",
                    "frameworkCaseId": f"{tc.get('classname')}.{tc.get('name')}"
                }
            })
    return {
        "schemaVersion": 1,
        "projectRoot": os.getcwd(),
        "meta": {"framework": "junit5"},
        "testCases": test_cases
    }

if __name__ == "__main__":
    print(json.dumps(convert(sys.argv[1]), indent=2))
```

See [`examples/junit5.json`](examples/junit5.json) for sample output.

**Later**: A thin `executable-stories-junit5` adapter library with `@Story`, `@Given`, `@When`, `@Then` annotations is planned.

---

### pytest (Python)

**Today**: Use `pytest-json-report` to capture results, then convert to RawRun JSON.

```bash
# 1. Run tests with JSON report
pip install pytest-json-report
pytest --json-report --json-report-file=.report.json

# 2. Convert → RawRun JSON
python3 convert_pytest.py .report.json > run.json

# 3. Generate reports
executable-stories format run.json --format html --output-dir reports
```

Converter sketch (`convert_pytest.py`):

```python
#!/usr/bin/env python3
"""Convert pytest-json-report output to RawRun JSON."""
import json, sys, os

STATUS_MAP = {"passed": "pass", "failed": "fail", "skipped": "skip", "xfailed": "pending"}

def convert(report_path):
    with open(report_path) as f:
        report = json.load(f)
    test_cases = []
    for t in report.get("tests", []):
        status = STATUS_MAP.get(t.get("outcome", ""), "unknown")
        error = None
        if status == "fail" and "longrepr" in t.get("call", {}):
            call = t["call"]
            error = {"message": call.get("longrepr", "")[:200], "stack": call.get("longrepr", "")}
        # pytest reports duration in seconds (float)
        duration_s = t.get("duration", 0)
        nodeid = t.get("nodeid", "")
        parts = nodeid.split("::")
        source_file = parts[0] if parts else ""
        test_cases.append({
            "externalId": nodeid,
            "title": parts[-1] if parts else nodeid,
            "status": status,
            "durationMs": round(duration_s * 1000),
            "sourceFile": source_file,
            **({"error": error} if error else {}),
            "meta": {
                "framework": "pytest",
                "frameworkCaseId": nodeid
            }
        })
    return {
        "schemaVersion": 1,
        "projectRoot": os.getcwd(),
        "meta": {"framework": "pytest"},
        "testCases": test_cases
    }

if __name__ == "__main__":
    print(json.dumps(convert(sys.argv[1]), indent=2))
```

See [`examples/pytest.json`](examples/pytest.json) for sample output.

**Later**: A `executable-stories-pytest` plugin with `@story`, `@given`, `@when`, `@then` decorators is planned.

---

### Go

**Today**: Run tests with `go test -json`, parse the JSON stream, convert to RawRun JSON.

```bash
# 1. Run tests with JSON output
go test -json ./... > test-output.jsonl

# 2. Convert → RawRun JSON
python3 convert_gotest.py test-output.jsonl > run.json

# 3. Generate reports
executable-stories format run.json --format html --output-dir reports
```

Converter sketch (`convert_gotest.py`):

```python
#!/usr/bin/env python3
"""Convert `go test -json` output to RawRun JSON."""
import json, sys, os

STATUS_MAP = {"pass": "pass", "fail": "fail", "skip": "skip"}

def convert(jsonl_path):
    tests = {}  # key: (package, test_name)
    with open(jsonl_path) as f:
        for line in f:
            event = json.loads(line)
            action = event.get("Action")
            pkg = event.get("Package", "")
            test = event.get("Test")
            if not test:
                continue
            key = (pkg, test)
            if key not in tests:
                tests[key] = {"package": pkg, "test": test}
            if action in STATUS_MAP:
                tests[key]["status"] = STATUS_MAP[action]
                # Go reports elapsed in seconds (float64)
                elapsed = event.get("Elapsed", 0)
                tests[key]["durationMs"] = round(elapsed * 1000)
            elif action == "output":
                tests[key].setdefault("output", []).append(event.get("Output", ""))

    test_cases = []
    for (pkg, test_name), data in tests.items():
        status = data.get("status", "unknown")
        error = None
        if status == "fail":
            output = "".join(data.get("output", []))
            error = {"message": output[:200], "stack": output}
        test_cases.append({
            "externalId": f"{pkg}.{test_name}",
            "title": test_name,
            "titlePath": [pkg, test_name],
            "status": status,
            "durationMs": data.get("durationMs", 0),
            **({"error": error} if error else {}),
            "meta": {
                "framework": "go",
                "frameworkCaseId": f"{pkg}.{test_name}"
            }
        })
    return {
        "schemaVersion": 1,
        "projectRoot": os.getcwd(),
        "meta": {"framework": "go"},
        "testCases": test_cases
    }

if __name__ == "__main__":
    print(json.dumps(convert(sys.argv[1]), indent=2))
```

See [`examples/go.json`](examples/go.json) for sample output.

**Later**: A `executable-stories-go` helper package with `Story()`, `Given()`, `When()`, `Then()` helpers is planned.

---

### xUnit / .NET

**Today**: Run tests with `dotnet test`, export TRX, convert to RawRun JSON.

```bash
# 1. Run tests with TRX output
dotnet test --logger "trx;LogFileName=results.trx"

# 2. Convert TRX → RawRun JSON
python3 convert_trx.py TestResults/results.trx > run.json

# 3. Generate reports
executable-stories format run.json --format html --output-dir reports
```

Converter sketch (`convert_trx.py`):

```python
#!/usr/bin/env python3
"""Convert .NET TRX (Visual Studio Test Results) to RawRun JSON."""
import json, sys, os, xml.etree.ElementTree as ET

NS = {"t": "http://microsoft.com/schemas/VisualStudio/TeamTest/2010"}
STATUS_MAP = {"Passed": "pass", "Failed": "fail", "NotExecuted": "skip", "Skipped": "skip"}

def convert(trx_path):
    tree = ET.parse(trx_path)
    root = tree.getroot()
    test_cases = []
    for result in root.findall(".//t:UnitTestResult", NS):
        outcome = result.get("outcome", "NotExecuted")
        status = STATUS_MAP.get(outcome, "unknown")
        error = None
        err_el = result.find(".//t:ErrorInfo", NS)
        if err_el is not None:
            msg_el = err_el.find("t:Message", NS)
            stack_el = err_el.find("t:StackTrace", NS)
            error = {
                "message": msg_el.text if msg_el is not None else "",
                "stack": stack_el.text if stack_el is not None else ""
            }
        # TRX duration is HH:MM:SS.fffffff — convert to ms
        duration_str = result.get("duration", "0:00:00")
        parts = duration_str.split(":")
        duration_ms = round(
            (int(parts[0]) * 3600 + int(parts[1]) * 60 + float(parts[2])) * 1000
        )
        full_name = result.get("testName", "")
        test_cases.append({
            "externalId": full_name,
            "title": full_name.split(".")[-1] if "." in full_name else full_name,
            "status": status,
            "durationMs": duration_ms,
            **({"error": error} if error else {}),
            "meta": {
                "framework": "xunit",
                "frameworkCaseId": full_name
            }
        })
    return {
        "schemaVersion": 1,
        "projectRoot": os.getcwd(),
        "meta": {"framework": "xunit"},
        "testCases": test_cases
    }

if __name__ == "__main__":
    print(json.dumps(convert(sys.argv[1]), indent=2))
```

See [`examples/dotnet.json`](examples/dotnet.json) for sample output.

**Later**: An `executable-stories-xunit` package with `[Story]`, `[Given]`, `[When]`, `[Then]` attributes is planned.

---

### Rust

**Today**: Use `cargo-nextest` with JSON output (recommended), then convert to RawRun JSON.

```bash
# 1. Run tests with nextest JSON output
cargo install cargo-nextest
cargo nextest run --message-format json > test-output.jsonl

# 2. Convert → RawRun JSON
python3 convert_nextest.py test-output.jsonl > run.json

# 3. Generate reports
executable-stories format run.json --format html --output-dir reports
```

> **Note**: `cargo test -Z unstable-options --format json` works on nightly but is unstable. `cargo-nextest` is the recommended stable path.

Converter sketch (`convert_nextest.py`):

```python
#!/usr/bin/env python3
"""Convert cargo-nextest JSON output to RawRun JSON."""
import json, sys, os

STATUS_MAP = {"ok": "pass", "FAILED": "fail", "ignored": "skip"}

def convert(jsonl_path):
    test_cases = []
    with open(jsonl_path) as f:
        for line in f:
            event = json.loads(line)
            if event.get("type") != "test" or event.get("event") not in ("ok", "failed", "ignored"):
                continue
            name = event.get("name", "")
            status_key = event.get("event", "")
            status = {"ok": "pass", "failed": "fail", "ignored": "skip"}.get(status_key, "unknown")
            error = None
            if status == "fail" and "stdout" in event:
                error = {"message": event["stdout"][:200], "stack": event["stdout"]}
            # nextest reports exec_time in seconds (float)
            duration_s = event.get("exec_time", 0)
            test_cases.append({
                "externalId": name,
                "title": name.split("::")[-1] if "::" in name else name,
                "titlePath": name.split("::"),
                "status": status,
                "durationMs": round(duration_s * 1000),
                **({"error": error} if error else {}),
                "meta": {
                    "framework": "rust",
                    "frameworkCaseId": name
                }
            })
    return {
        "schemaVersion": 1,
        "projectRoot": os.getcwd(),
        "meta": {"framework": "rust"},
        "testCases": test_cases
    }

if __name__ == "__main__":
    print(json.dumps(convert(sys.argv[1]), indent=2))
```

See [`examples/rust.json`](examples/rust.json) for sample output.

**Later**: A `executable-stories-rest` proc-macro crate with `#[story]`, `#[given]`, `#[when]`, `#[then]` attributes is planned.

---

## Progressive Enrichment

You don't have to use all schema features at once. Start simple and add detail over time:

### Level 1: Just statuses

```json
{
  "schemaVersion": 1,
  "projectRoot": "/app",
  "testCases": [{ "title": "Login works", "status": "pass", "durationMs": 342 }]
}
```

Use `--synthesize-stories` (default) to auto-generate story metadata.

### Level 2: Add BDD steps

```json
{
  "schemaVersion": 1,
  "projectRoot": "/app",
  "testCases": [
    {
      "title": "Login works",
      "status": "pass",
      "durationMs": 342,
      "story": {
        "scenario": "Successful login with valid credentials",
        "steps": [
          { "keyword": "Given", "text": "a registered user" },
          { "keyword": "When", "text": "the user logs in" },
          { "keyword": "Then", "text": "a JWT token is returned" }
        ],
        "tags": ["auth", "smoke"]
      }
    }
  ]
}
```

### Level 3: Docs, tags, tickets, attachments

Add rich documentation (code blocks, tables, Mermaid diagrams), ticket references for traceability, and test attachments. See [`examples/full.json`](examples/full.json) for a comprehensive example.
