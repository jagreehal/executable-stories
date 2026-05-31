package es

import (
	"context"
	"fmt"
	"os"
	"reflect"
	"strings"
	"time"

	"go.opentelemetry.io/otel/attribute"
	otelTrace "go.opentelemetry.io/otel/trace"
)

// TestingT is the subset of *testing.T that the story system needs.
type TestingT interface {
	Name() string
	Failed() bool
	Skipped() bool
	Cleanup(func())
	Helper()
}

// Option configures a story during Init.
type Option func(*S)

// timerEntry tracks a running timer started by StartTimer.
type timerEntry struct {
	start     time.Time
	stepIndex *int
	stepID    string
	consumed  bool
}

// S represents a story attached to a single test.
type S struct {
	scenario         string
	steps            []StoryStep
	tags             []string
	tickets          []Ticket
	covers           []string
	meta             map[string]any
	docs             []DocEntry // story-level docs
	currentStep      *StoryStep
	seenPrimary      map[string]bool // tracks seen primary keywords for auto-and conversion
	t                TestingT
	startTime        time.Time
	sourceOrder      int
	stepCounter      int
	attachments      []RawAttachment
	traceUrlTemplate string // URL template with {traceId} placeholder for OTel trace links
	activeTimers     map[int]*timerEntry
	timerCounter     int
	otelSpans        []any
}

// WithTags adds tags to the story.
func WithTags(tags ...string) Option {
	return func(s *S) {
		s.tags = append(s.tags, tags...)
	}
}

// WithTicket adds ticket references to the story.
// Each string is normalized to a Ticket with just an ID.
func WithTicket(tickets ...string) Option {
	return func(s *S) {
		for _, t := range tickets {
			s.tickets = append(s.tickets, Ticket{ID: t})
		}
	}
}

// WithCovers declares the product-code paths/globs this story exercises.
func WithCovers(covers ...string) Option {
	return func(s *S) {
		s.covers = append(s.covers, covers...)
	}
}

// WithTicketURL adds a ticket reference with a URL to the story.
func WithTicketURL(id, url string) Option {
	return func(s *S) {
		s.tickets = append(s.tickets, Ticket{ID: id, URL: url})
	}
}

// WithMeta adds arbitrary metadata to the story.
func WithMeta(meta map[string]any) Option {
	return func(s *S) {
		if s.meta == nil {
			s.meta = make(map[string]any)
		}
		for k, v := range meta {
			s.meta[k] = v
		}
	}
}

// WithTraceUrlTemplate sets the URL template for OTel trace links.
// Uses {traceId} as placeholder. Also settable via OTEL_TRACE_URL_TEMPLATE env var.
func WithTraceUrlTemplate(template string) Option {
	return func(s *S) {
		s.traceUrlTemplate = template
	}
}

func resolveTraceUrl(template, traceId string) string {
	if template == "" {
		return ""
	}
	return strings.ReplaceAll(template, "{traceId}", traceId)
}

func bridgeOtel(s *S) {
	span := otelTrace.SpanFromContext(context.Background())
	sc := span.SpanContext()
	if !sc.TraceID().IsValid() {
		return
	}
	traceId := sc.TraceID().String()
	spanId := sc.SpanID().String()

	// OTel -> Story: capture traceId in structured meta
	if s.meta == nil {
		s.meta = make(map[string]any)
	}
	s.meta["otel"] = map[string]any{"traceId": traceId, "spanId": spanId}

	// OTel -> Story: inject human-readable doc entries
	s.docs = append(s.docs, kvEntry("Trace ID", traceId))

	template := s.traceUrlTemplate
	if template == "" {
		template = os.Getenv("OTEL_TRACE_URL_TEMPLATE")
	}
	if url := resolveTraceUrl(template, traceId); url != "" {
		s.docs = append(s.docs, linkEntry("View Trace", url))
	}

	// Story -> OTel: enrich active span with story attributes
	span.SetAttributes(attribute.String("story.scenario", s.scenario))
	if len(s.tags) > 0 {
		span.SetAttributes(attribute.StringSlice("story.tags", s.tags))
	}
	if len(s.tickets) > 0 {
		ticketIDs := make([]string, len(s.tickets))
		for i, t := range s.tickets {
			ticketIDs[i] = t.ID
		}
		span.SetAttributes(attribute.StringSlice("story.tickets", ticketIDs))
	}
}

// Init creates a new story for the given test.
// It records the start time, assigns a source order, and registers a cleanup
// function to capture the test result and record the test case to the global collector.
func Init(t TestingT, scenario string, opts ...Option) *S {
	t.Helper()

	s := &S{
		scenario:     scenario,
		t:            t,
		startTime:    time.Now(),
		sourceOrder:  nextOrder(),
		seenPrimary:  make(map[string]bool),
		activeTimers: make(map[int]*timerEntry),
	}

	for _, opt := range opts {
		opt(s)
	}

	// OTel bridge: detect active span, flow data bidirectionally
	bridgeOtel(s)

	t.Cleanup(func() {
		duration := float64(time.Since(s.startTime).Milliseconds())

		status := "pass"
		if t.Failed() {
			status = "fail"
		} else if t.Skipped() {
			status = "skip"
		}

		order := s.sourceOrder
		story := &StoryMeta{
			Scenario:    s.scenario,
			Steps:       s.steps,
			Tags:        s.tags,
			Tickets:     s.tickets,
			Covers:      s.covers,
			Meta:        s.meta,
			Docs:        s.docs,
			SourceOrder: &order,
			OtelSpans:   s.otelSpans,
		}

		tc := RawTestCase{
			Title:       t.Name(),
			TitlePath:   strings.Split(t.Name(), "/"),
			Story:       story,
			Status:      status,
			DurationMs:  &duration,
			Retry:       0,
			Retries:     0,
			Attachments: s.attachments,
		}

		record(tc)
	})

	return s
}

// addStep creates a new step and sets it as the current step.
// If a primary keyword (Given/When/Then) repeats consecutively, it is
// auto-converted to "And" while the tracker keeps the original keyword.
func (s *S) addStep(keyword, text string) *S {
	effective := keyword
	switch keyword {
	case "Given", "When", "Then":
		if s.seenPrimary[keyword] {
			effective = "And"
		} else {
			s.seenPrimary[keyword] = true
		}
	}

	step := StoryStep{
		ID:      fmt.Sprintf("step-%d", s.stepCounter),
		Keyword: effective,
		Text:    text,
	}
	s.stepCounter++
	s.steps = append(s.steps, step)
	s.currentStep = &s.steps[len(s.steps)-1]
	return s
}

// Given adds a "Given" step to the story.
func (s *S) Given(text string) *S {
	return s.addStep("Given", text)
}

// When adds a "When" step to the story.
func (s *S) When(text string) *S {
	return s.addStep("When", text)
}

// Then adds a "Then" step to the story.
func (s *S) Then(text string) *S {
	return s.addStep("Then", text)
}

// And adds an "And" step to the story.
func (s *S) And(text string) *S {
	return s.addStep("And", text)
}

// But adds a "But" step to the story.
func (s *S) But(text string) *S {
	return s.addStep("But", text)
}

// StartTimer begins a high-resolution timer tied to the current step.
// Returns a token to pass to EndTimer.
func (s *S) StartTimer() int {
	token := s.timerCounter
	s.timerCounter++

	entry := &timerEntry{
		start: time.Now(),
	}
	if s.currentStep != nil {
		idx := len(s.steps) - 1
		entry.stepIndex = &idx
		entry.stepID = s.currentStep.ID
	}
	s.activeTimers[token] = entry
	return token
}

// EndTimer stops the timer identified by token and records DurationMs
// on the step that was active when StartTimer was called.
// Double-end is a no-op.
func (s *S) EndTimer(token int) {
	entry, ok := s.activeTimers[token]
	if !ok || entry.consumed {
		return
	}
	entry.consumed = true
	durationMs := float64(time.Since(entry.start).Milliseconds())

	// Try to find the step by index first, then by ID
	if entry.stepIndex != nil && *entry.stepIndex < len(s.steps) {
		s.steps[*entry.stepIndex].DurationMs = &durationMs
	} else if entry.stepID != "" {
		for i := range s.steps {
			if s.steps[i].ID == entry.stepID {
				s.steps[i].DurationMs = &durationMs
				break
			}
		}
	}
}

// Fn wraps a function body as a step with timing capture.
// The body is executed immediately and duration is recorded on the step.
// The step is marked as Wrapped=true to distinguish it from text-only markers.
// If the body panics, duration is still recorded and the panic propagates.
func (s *S) Fn(keyword, text string, body func()) *S {
	s.addStep(keyword, text)
	s.currentStep.Wrapped = true

	start := time.Now()
	defer func() {
		d := float64(time.Since(start).Milliseconds())
		s.currentStep.DurationMs = &d
	}()

	body()
	return s
}

// Expect is shorthand for Fn("Then", text, body).
func (s *S) Expect(text string, body func()) *S {
	return s.Fn("Then", text, body)
}

// addDoc appends a DocEntry to the current step if one exists,
// otherwise it appends to the story-level docs.
func (s *S) addDoc(entry DocEntry) {
	if children, ok := entry["children"].([]DocEntry); ok && len(children) > 0 {
		childPtrs := make(map[uintptr]struct{}, len(children))
		for _, child := range children {
			childPtrs[reflect.ValueOf(child).Pointer()] = struct{}{}
		}
		filterDocs := func(docs []DocEntry) []DocEntry {
			filtered := docs[:0]
			for _, doc := range docs {
				if _, exists := childPtrs[reflect.ValueOf(doc).Pointer()]; !exists {
					filtered = append(filtered, doc)
				}
			}
			return filtered
		}
		s.docs = filterDocs(s.docs)
		for i := range s.steps {
			s.steps[i].Docs = filterDocs(s.steps[i].Docs)
		}
	}
	if s.currentStep != nil {
		s.currentStep.Docs = append(s.currentStep.Docs, entry)
	} else {
		s.docs = append(s.docs, entry)
	}
}

// Note attaches a note doc entry and returns it.
func (s *S) Note(text string, children ...DocEntry) DocEntry {
	entry := noteEntry(text, children...)
	s.addDoc(entry)
	return entry
}

// Tag attaches a tag doc entry and returns it.
func (s *S) Tag(names ...string) DocEntry {
	entry := tagEntry(names)
	s.addDoc(entry)
	return entry
}

// Kv attaches a key-value doc entry and returns it.
func (s *S) Kv(label string, value any, children ...DocEntry) DocEntry {
	entry := kvEntry(label, value, children...)
	s.addDoc(entry)
	return entry
}

// JSON attaches a code doc entry with lang=json by marshaling the value and returns it.
func (s *S) JSON(label string, value any, children ...DocEntry) DocEntry {
	entry := jsonEntry(label, value, children...)
	s.addDoc(entry)
	return entry
}

// Code attaches a code doc entry and returns it.
// The lang parameter is optional (first value used if provided).
// Children can be passed after lang.
func (s *S) Code(label, content string, langAndChildren ...any) DocEntry {
	l := ""
	var children []DocEntry
	for _, v := range langAndChildren {
		switch val := v.(type) {
		case string:
			l = val
		case DocEntry:
			children = append(children, val)
		}
	}
	entry := codeEntry(label, content, l, children...)
	s.addDoc(entry)
	return entry
}

// Table attaches a table doc entry and returns it.
func (s *S) Table(label string, columns []string, rows [][]string, children ...DocEntry) DocEntry {
	entry := tableEntry(label, columns, rows, children...)
	s.addDoc(entry)
	return entry
}

// Link attaches a link doc entry and returns it.
func (s *S) Link(label, url string, children ...DocEntry) DocEntry {
	entry := linkEntry(label, url, children...)
	s.addDoc(entry)
	return entry
}

// Section attaches a section doc entry and returns it.
func (s *S) Section(title, markdown string, children ...DocEntry) DocEntry {
	entry := sectionEntry(title, markdown, children...)
	s.addDoc(entry)
	return entry
}

// Mermaid attaches a mermaid doc entry and returns it.
// The title parameter is optional (first value used if provided).
// Children can be passed after title.
func (s *S) Mermaid(code string, titleAndChildren ...any) DocEntry {
	t := ""
	var children []DocEntry
	for _, v := range titleAndChildren {
		switch val := v.(type) {
		case string:
			t = val
		case DocEntry:
			children = append(children, val)
		}
	}
	entry := mermaidEntry(code, t, children...)
	s.addDoc(entry)
	return entry
}

// Screenshot attaches a screenshot doc entry and returns it.
// The alt parameter is optional (first value used if provided).
// Children can be passed after alt.
func (s *S) Screenshot(path string, altAndChildren ...any) DocEntry {
	a := ""
	var children []DocEntry
	for _, v := range altAndChildren {
		switch val := v.(type) {
		case string:
			a = val
		case DocEntry:
			children = append(children, val)
		}
	}
	entry := screenshotEntry(path, a, children...)
	s.addDoc(entry)
	return entry
}

// Custom attaches a custom doc entry with the given type name and data and returns it.
func (s *S) Custom(typeName string, data any, children ...DocEntry) DocEntry {
	entry := customEntry(typeName, data, children...)
	s.addDoc(entry)
	return entry
}

// Attach adds a file or inline attachment to the current step or test case level.
func (s *S) Attach(name, mediaType string, path string) *S {
	a := RawAttachment{
		Name:      name,
		MediaType: mediaType,
	}
	if path != "" {
		a.Path = &path
	}
	if s.currentStep != nil {
		idx := len(s.steps) - 1
		a.StepIndex = &idx
		a.StepID = &s.currentStep.ID
	}
	s.attachments = append(s.attachments, a)
	return s
}

// AttachInline adds inline content as an attachment.
func (s *S) AttachInline(name, mediaType, body, encoding string) *S {
	a := RawAttachment{
		Name:      name,
		MediaType: mediaType,
		Body:      &body,
		Encoding:  &encoding,
	}
	if s.currentStep != nil {
		idx := len(s.steps) - 1
		a.StepIndex = &idx
		a.StepID = &s.currentStep.ID
	}
	s.attachments = append(s.attachments, a)
	return s
}

// AttachSpans attaches OTel spans to the story for trace waterfall rendering in HTML reports.
// Accepts any slice of span-like objects (structurally compatible with autotel's SerializedSpan).
func (s *S) AttachSpans(spans []any) *S {
	s.otelSpans = spans
	return s
}
