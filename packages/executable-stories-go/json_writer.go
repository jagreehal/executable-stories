package es

import (
	"encoding/json"
	"os"
	"path/filepath"
)

// writeRawRun marshals the RawRun to JSON and writes it to the given file path.
// Parent directories are created automatically.
func writeRawRun(run RawRun, outputPath string) error {
	dir := filepath.Dir(outputPath)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return err
	}

	data, err := json.MarshalIndent(run, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(outputPath, data, 0o644)
}
