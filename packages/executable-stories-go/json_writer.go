package es

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
)

// printNextStep tells the user how to turn the run JSON into a report.
//
// The JS adapters render reports in-process at the end of the run, so their
// users never have to know the CLI exists. Go hands off to the CLI instead, so
// without this the run ends with a file and no indication of what to do with
// it. Written to stderr so it never pollutes piped output; set
// EXECUTABLE_STORIES_QUIET to silence it in CI.
func printNextStep(outputPath string) {
	if os.Getenv("EXECUTABLE_STORIES_QUIET") != "" {
		return
	}
	fmt.Fprintf(os.Stderr, "\nexecutable-stories: wrote %s\n", outputPath)
	fmt.Fprintf(os.Stderr, "  next: executable-stories format %s --format html\n", outputPath)
}

// writeRawRun marshals the RawRun to JSON and writes it to the given file path.
// Parent directories are created automatically.
//
// The write goes to a temp file in the same directory and is renamed into
// place, so a reader watching the path sees either the previous report or the
// new one, never a half-written document. A failed run leaves the last good
// report where it was.
func writeRawRun(run RawRun, outputPath string) error {
	dir := filepath.Dir(outputPath)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return err
	}

	data, err := json.MarshalIndent(run, "", "  ")
	if err != nil {
		return err
	}

	tmp, err := os.CreateTemp(dir, ".raw-run-*.json")
	if err != nil {
		return err
	}
	// Removing a name that rename already consumed fails harmlessly; this is
	// only here to clear the temp file on the paths that do not get that far.
	defer func() { _ = os.Remove(tmp.Name()) }()

	if _, err := tmp.Write(data); err != nil {
		_ = tmp.Close()
		return err
	}
	if err := tmp.Close(); err != nil {
		return err
	}
	if err := os.Chmod(tmp.Name(), 0o644); err != nil {
		return err
	}
	return os.Rename(tmp.Name(), outputPath)
}
