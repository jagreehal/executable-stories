package es

// RawRun is the top-level output matching the executable-stories JSON schema.
type RawRun struct {
	SchemaVersion  int            `json:"schemaVersion"`
	TestCases      []RawTestCase  `json:"testCases"`
	ProjectRoot    string         `json:"projectRoot"`
	StartedAtMs    *float64       `json:"startedAtMs,omitempty"`
	FinishedAtMs   *float64       `json:"finishedAtMs,omitempty"`
	PackageVersion string         `json:"packageVersion,omitempty"`
	GitSha         string         `json:"gitSha,omitempty"`
	CI             *RawCIInfo     `json:"ci,omitempty"`
	Meta           map[string]any `json:"meta,omitempty"`
}

// RawTestCase represents a single test case in the run.
type RawTestCase struct {
	ExternalID  string           `json:"externalId,omitempty"`
	Title       string           `json:"title,omitempty"`
	TitlePath   []string         `json:"titlePath,omitempty"`
	Story       *StoryMeta       `json:"story,omitempty"`
	SourceFile  string           `json:"sourceFile,omitempty"`
	Status      string           `json:"status"`
	DurationMs  *float64         `json:"durationMs,omitempty"`
	Error       *RawError        `json:"error,omitempty"`
	Meta        map[string]any   `json:"meta,omitempty"`
	Retry       int              `json:"retry"`
	Retries     int              `json:"retries"`
	Attachments []RawAttachment  `json:"attachments,omitempty"`
	StepEvents  []RawStepEvent   `json:"stepEvents,omitempty"`
}

// StoryMeta contains the BDD story information for a test case.
type StoryMeta struct {
	Scenario    string         `json:"scenario"`
	Steps       []StoryStep    `json:"steps"`
	Tags        []string       `json:"tags,omitempty"`
	Tickets     []string       `json:"tickets,omitempty"`
	Meta        map[string]any `json:"meta,omitempty"`
	SuitePath   []string       `json:"suitePath,omitempty"`
	Docs        []DocEntry     `json:"docs,omitempty"`
	SourceOrder *int           `json:"sourceOrder,omitempty"`
}

// StoryStep represents a single BDD step (Given/When/Then/And/But).
type StoryStep struct {
	ID         string     `json:"id,omitempty"`
	Keyword    string     `json:"keyword"`
	Text       string     `json:"text"`
	Mode       string     `json:"mode,omitempty"`
	Wrapped    bool       `json:"wrapped,omitempty"`
	Docs       []DocEntry `json:"docs,omitempty"`
	DurationMs *float64   `json:"durationMs,omitempty"`
}

// DocEntry is a discriminated union via the "kind" field.
// Different kinds have different fields (note, tag, kv, code, table, link, section, mermaid, screenshot, custom).
type DocEntry map[string]any

// RawError holds error information for a failed test.
type RawError struct {
	Message string `json:"message,omitempty"`
	Stack   string `json:"stack,omitempty"`
}

// RawCIInfo holds CI environment information.
type RawCIInfo struct {
	Name        string `json:"name"`
	URL         string `json:"url,omitempty"`
	BuildNumber string `json:"buildNumber,omitempty"`
}

// RawAttachment represents a file or inline attachment on a test case or step.
type RawAttachment struct {
	Name       string  `json:"name"`
	MediaType  string  `json:"mediaType"`
	Path       *string `json:"path,omitempty"`
	Body       *string `json:"body,omitempty"`
	Encoding   *string `json:"encoding,omitempty"`
	Charset    *string `json:"charset,omitempty"`
	FileName   *string `json:"fileName,omitempty"`
	ByteLength *int    `json:"byteLength,omitempty"`
	StepIndex  *int    `json:"stepIndex,omitempty"`
	StepID     *string `json:"stepId,omitempty"`
}

// RawStepEvent holds timing and status information for a single step execution.
type RawStepEvent struct {
	Index      *int     `json:"index,omitempty"`
	Title      string   `json:"title,omitempty"`
	Status     string   `json:"status,omitempty"`
	DurationMs *float64 `json:"durationMs,omitempty"`
}
