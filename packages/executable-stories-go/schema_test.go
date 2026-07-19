package es_test

import (
	"encoding/json"
	"testing"

	es "github.com/jagreehal/executable-stories/packages/executable-stories-go"
)

// The $schema pointer lets editors validate the run file as it is written, and
// `executable-stories doctor` reports whether it is present. It must serialize
// under the literal "$schema" key.
func TestRawRunEmitsSchemaPointer(t *testing.T) {
	run := es.RawRun{
		Schema:        es.SchemaURL,
		SchemaVersion: 1,
		TestCases:     []es.RawTestCase{},
		ProjectRoot:   "/tmp",
	}

	data, err := json.Marshal(run)
	if err != nil {
		t.Fatalf("marshal failed: %v", err)
	}

	var decoded map[string]any
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("unmarshal failed: %v", err)
	}

	if got := decoded["$schema"]; got != es.SchemaURL {
		t.Errorf("$schema = %v, want %v", got, es.SchemaURL)
	}
	if _, present := decoded["schema"]; present {
		t.Error(`serialized under "schema"; want the literal "$schema" key only`)
	}
	if got := decoded["schemaVersion"]; got != float64(1) {
		t.Errorf("schemaVersion = %v, want 1", got)
	}
}

// An empty Schema must be omitted rather than written as "", which would fail
// the schema's string/format expectations for anyone validating against it.
func TestRawRunOmitsEmptySchemaPointer(t *testing.T) {
	run := es.RawRun{SchemaVersion: 1, TestCases: []es.RawTestCase{}, ProjectRoot: "/tmp"}

	data, err := json.Marshal(run)
	if err != nil {
		t.Fatalf("marshal failed: %v", err)
	}

	var decoded map[string]any
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("unmarshal failed: %v", err)
	}

	if _, present := decoded["$schema"]; present {
		t.Error("$schema present for an empty pointer; want it omitted")
	}
}
