// Package es writes BDD-style stories from ordinary Go tests, and emits them
// as the raw run JSON that the executable-stories CLI turns into reports.
//
// A story is attached to a test with [Init] and described with the step
// methods. The test itself is unchanged — the steps narrate what it already
// does, and the story is recorded whether the test passes or fails:
//
//	func TestMain(m *testing.M) { es.RunAndReport(m) }
//
//	func TestAddition(t *testing.T) {
//		s := es.Init(t, "adds two numbers", es.WithTags("math"))
//
//		s.Given("two numbers 2 and 3")
//		a, b := 2, 3
//
//		s.When("I add them")
//		got := a + b
//
//		s.Then("the result is 5")
//		s.Check(got == 5, "expected 5, got %d", got)
//	}
//
// The TestMain is required: without [RunAndReport] the suite runs, collects
// every story and writes nothing. Init says so on stderr when it is missing.
//
// A story belongs to the test goroutine that created it. Two goroutines
// sharing one story is a data race; give each test its own, which is what
// [Init] does anyway.
package es

import (
	"context"
	"fmt"
	"os"
	"reflect"
	"runtime"
	"strings"
	"sync/atomic"
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
	sourceFile       string
	stepCounter      int
	attachments      []RawAttachment
	traceUrlTemplate string // URL template with {traceId} placeholder for OTel trace links
	activeTimers     map[int]*timerEntry
	timerCounter     int
	otelSpans        []any
	ctx              context.Context
	assertions       int
	// pendingIdx is the marker step awaiting its assertion count, held as an
	// index because appending a step reallocates the slice and any pointer
	// into it goes stale. -1 means none is open.
	pendingIdx  int
	pendingFrom int
}

// elapsedMs is milliseconds with sub-millisecond resolution. Truncating to
// whole milliseconds reports every fast step as 0.
func elapsedMs(start time.Time) float64 {
	return float64(time.Since(start).Microseconds()) / 1000
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

// WithContext hands the story the context carrying the active OTel span, so
// the trace ID reaches the report and the story's tags reach the span.
//
// Required for the bridge: Go keeps the active span in the context, and the
// story has no other way to reach the one the test is running under.
func WithContext(ctx context.Context) Option {
	return func(s *S) {
		s.ctx = ctx
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

// applyTrace records a trace on the story: structured meta for machines, a
// trace ID and a link for readers.
func (s *S) applyTrace(traceId, spanId string) {
	if traceId == "" {
		return
	}
	if s.meta == nil {
		s.meta = make(map[string]any)
	}
	otel := map[string]any{"traceId": traceId}
	if spanId != "" {
		otel["spanId"] = spanId
	}
	s.meta["otel"] = otel

	s.docs = append(s.docs, kvEntry("Trace ID", traceId))

	template := s.traceUrlTemplate
	if template == "" {
		template = os.Getenv("OTEL_TRACE_URL_TEMPLATE")
	}
	if url := resolveTraceUrl(template, traceId); url != "" {
		s.docs = append(s.docs, linkEntry("View Trace", url))
	}
}

func bridgeOtel(s *S) {
	if s.ctx == nil {
		return
	}
	span := otelTrace.SpanFromContext(s.ctx)
	sc := span.SpanContext()
	if !sc.TraceID().IsValid() {
		return
	}

	s.applyTrace(sc.TraceID().String(), sc.SpanID().String())

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

// warnedOnce keeps the missing-TestMain warning to one line per suite. Atomic
// because Init is called from every test goroutine, parallel ones included: a
// plain bool here is a data race the -race detector reports against this
// library rather than against the suite that tripped it.
var warnedOnce atomic.Bool

// warnIfNotReporting says so when the suite has no TestMain, which is the one
// mistake that produces a full run and no report at all.
//
// `reporting` needs no atomic: RunAndReport sets it before m.Run starts any
// test, so every read here happens after that write.
func warnIfNotReporting() {
	if reporting || !warnedOnce.CompareAndSwap(false, true) {
		return
	}
	warn("[executable-stories] no report will be written: add\n" +
		"  func TestMain(m *testing.M) { es.RunAndReport(m) }\n" +
		"to this package.\n")
}

// Init creates a new story for the given test.
// It records the start time, assigns a source order, and registers a cleanup
// function to capture the test result and record the test case to the global collector.
func Init(t TestingT, scenario string, opts ...Option) *S {
	t.Helper()
	warnIfNotReporting()

	s := &S{
		scenario:     scenario,
		t:            t,
		startTime:    time.Now(),
		sourceOrder:  nextOrder(),
		sourceFile:   callerFile(),
		seenPrimary:  make(map[string]bool),
		activeTimers: make(map[int]*timerEntry),
		pendingIdx:   -1,
	}

	for _, opt := range opts {
		opt(s)
	}

	// OTel bridge: detect active span, flow data bidirectionally
	bridgeOtel(s)

	// Registered before any cleanup the test adds, so LIFO ordering runs it
	// last and the final marker's assertions are all in.
	t.Cleanup(func() {
		s.closePending()

		duration := elapsedMs(s.startTime)

		status := "pass"
		if t.Failed() {
			status = "fail"
		} else if t.Skipped() {
			status = "skip"
		}

		order := s.sourceOrder
		story := &StoryMeta{
			Scenario:    s.scenario,
			SuitePath:   suitePath(t.Name()),
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
			SourceFile:  s.sourceFile,
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

// Planned records a scenario that is specified but not implemented yet. It
// appears in the report marked "planned" and stops being planned as soon as
// someone writes it as a real story with Init.
//
// Go has no bodyless-test idiom, so declare one in an otherwise empty test:
//
//	func TestCheckoutBlocksSuspendedAccount(t *testing.T) {
//		es.Planned(t, "checkout is blocked for a suspended account")
//	}
//
// Skipping is left to you. t.Skip means "do not run this now", which is a
// different claim from "we have not built this yet", and conflating them would
// put every quarantined test in your plan.
func Planned(t TestingT, scenario string, opts ...Option) {
	t.Helper()
	warnIfNotReporting()

	s := &S{
		scenario:    scenario,
		t:           t,
		startTime:   time.Now(),
		sourceOrder: nextOrder(),
		sourceFile:  callerFile(),
		seenPrimary: make(map[string]bool),
		pendingIdx:  -1,
	}
	for _, opt := range opts {
		opt(s)
	}

	// Recorded in cleanup, not here: code after Planned() can still fail the
	// test, and reporting that failure as "planned" would hide it.
	t.Cleanup(func() {
		status := "todo"
		if t.Failed() {
			status = "fail"
		} else if t.Skipped() {
			status = "skip"
		}

		order := s.sourceOrder
		duration := float64(0)
		record(RawTestCase{
			Title:     t.Name(),
			TitlePath: strings.Split(t.Name(), "/"),
			Story: &StoryMeta{
				Scenario:    scenario,
				SuitePath:   suitePath(t.Name()),
				Steps:       []StoryStep{},
				Tags:        s.tags,
				Tickets:     s.tickets,
				Covers:      s.covers,
				Meta:        s.meta,
				SourceOrder: &order,
			},
			SourceFile: s.sourceFile,
			Status:     status,
			DurationMs: &duration,
		})
	})
}

// suitePath is the enclosing test names for a subtest, which is everything
// before the last segment of Go's "Parent/child" test name. A top-level test
// has none.
func suitePath(name string) []string {
	parts := strings.Split(name, "/")
	if len(parts) < 2 {
		return nil
	}
	return parts[:len(parts)-1]
}

// addStep creates a new step and sets it as the current step.
// If a primary keyword (Given/When/Then) repeats consecutively, it is
// auto-converted to "And" while the tracker keeps the original keyword.
// Docs passed here move onto the step, leaving wherever they were attached
// first, so a doc built inline reads as belonging to the step it describes.
func (s *S) addStep(keyword, text string, docs ...DocEntry) *S {
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
	if len(docs) > 0 {
		s.dropDocs(docs)
		s.currentStep.Docs = append(s.currentStep.Docs, docs...)
	}

	// Close the previous marker before this step's own assertions begin.
	s.closePending()
	s.pendingIdx = len(s.steps) - 1
	s.pendingFrom = s.assertions
	return s
}

// Given adds a "Given" step to the story.
func (s *S) Given(text string, docs ...DocEntry) *S {
	return s.addStep("Given", text, docs...)
}

// When adds a "When" step to the story.
func (s *S) When(text string, docs ...DocEntry) *S {
	return s.addStep("When", text, docs...)
}

// Then adds a "Then" step to the story.
func (s *S) Then(text string, docs ...DocEntry) *S {
	return s.addStep("Then", text, docs...)
}

// And adds an "And" step to the story.
func (s *S) And(text string, docs ...DocEntry) *S {
	return s.addStep("And", text, docs...)
}

// But adds a "But" step to the story.
func (s *S) But(text string, docs ...DocEntry) *S {
	return s.addStep("But", text, docs...)
}

// Arrange is Given under the arrange/act/assert name.
func (s *S) Arrange(text string, docs ...DocEntry) *S { return s.addStep("Given", text, docs...) }

// Act is When under the arrange/act/assert name.
func (s *S) Act(text string, docs ...DocEntry) *S { return s.addStep("When", text, docs...) }

// Assert is Then under the arrange/act/assert name.
func (s *S) Assert(text string, docs ...DocEntry) *S { return s.addStep("Then", text, docs...) }

// Setup is Given.
func (s *S) Setup(text string, docs ...DocEntry) *S { return s.addStep("Given", text, docs...) }

// Context is Given.
func (s *S) Context(text string, docs ...DocEntry) *S { return s.addStep("Given", text, docs...) }

// Execute is When.
func (s *S) Execute(text string, docs ...DocEntry) *S { return s.addStep("When", text, docs...) }

// Action is When.
func (s *S) Action(text string, docs ...DocEntry) *S { return s.addStep("When", text, docs...) }

// Verify is Then.
func (s *S) Verify(text string, docs ...DocEntry) *S { return s.addStep("Then", text, docs...) }

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
	if !ok {
		return
	}
	delete(s.activeTimers, token)
	durationMs := elapsedMs(entry.start)

	// By ID first: it names the step the timer started on even if the story
	// added steps in between. The index is the fallback for a step with none.
	if entry.stepID != "" {
		for i := range s.steps {
			if s.steps[i].ID == entry.stepID {
				s.steps[i].DurationMs = &durationMs
				return
			}
		}
	}
	if entry.stepIndex != nil && *entry.stepIndex < len(s.steps) {
		s.steps[*entry.stepIndex].DurationMs = &durationMs
	}
}

// Fn wraps a function body as a step with timing capture.
// The body is executed immediately and duration is recorded on the step.
// The step is marked as Wrapped=true to distinguish it from text-only markers.
// If the body panics, duration is still recorded and the panic propagates.
func (s *S) Fn(keyword, text string, body func()) *S {
	s.addStep(keyword, text)
	// By index, not through currentStep: a body that adds its own steps moves
	// currentStep, and the deferred write would land the duration on whichever
	// step the body finished on.
	idx := len(s.steps) - 1
	s.steps[idx].Wrapped = true
	// A wrapped step measures its own body, so it does not wait on a later
	// marker to close it.
	s.pendingIdx = -1
	isClaim := keyword == "Then"
	before := s.assertions

	start := time.Now()
	defer func() {
		d := elapsedMs(start)
		s.steps[idx].DurationMs = &d
		if n := s.assertions - before; n > 0 {
			s.steps[idx].Assertions = &n
		} else if isClaim {
			// Nothing counted, but wrapping a claim is itself the signal Go
			// can give that the step checked something: the body ran to
			// completion. Setup steps arrange, so only a claim counts —
			// tested against the keyword as written, since auto-And rewrites
			// a repeated Then before the step is stored.
			one := 1
			s.steps[idx].Assertions = &one
		}
	}()

	body()
	return s
}

// Expect is shorthand for Fn("Then", text, body).
func (s *S) Expect(text string, body func()) *S {
	return s.Fn("Then", text, body)
}

// errorReporter is the failure half of *testing.T. Asserted separately rather
// than added to TestingT, so an existing implementation of that interface
// keeps compiling.
type errorReporter interface {
	Errorf(format string, args ...any)
}

// Check counts one assertion on the open step and reports a failed condition
// through TestingT.Errorf. It returns cond so callers can stop after a check.
// A failed condition panics when a custom TestingT has no Errorf method.
func (s *S) Check(cond bool, format string, args ...any) bool {
	if s.t != nil {
		s.t.Helper()
	}
	s.assertions++
	if !cond {
		r, ok := s.t.(errorReporter)
		if !ok {
			panic(fmt.Sprintf(
				"executable-stories: Check failed but %T cannot report it (no Errorf method): "+
					"%s", s.t, fmt.Sprintf(format, args...)))
		}
		r.Errorf(format, args...)
	}
	return cond
}

// closePending attributes the assertions that ran since a marker was declared
// to that marker. A marker states the claim and the checks follow it, so the
// count is only final once the next step starts or the test ends.
func (s *S) closePending() {
	idx := s.pendingIdx
	s.pendingIdx = -1
	if idx < 0 || idx >= len(s.steps) {
		return
	}
	if n := s.assertions - s.pendingFrom; n > 0 {
		s.steps[idx].Assertions = &n
	}
}

// addDoc appends a DocEntry to the current step if one exists,
// otherwise it appends to the story-level docs.
// dropDocs removes the given entries from wherever they were first attached,
// so an entry built inline and then handed to a step or a parent does not
// appear twice in the report.
func (s *S) dropDocs(moved []DocEntry) {
	movedPtrs := make(map[uintptr]struct{}, len(moved))
	for _, doc := range moved {
		movedPtrs[reflect.ValueOf(doc).Pointer()] = struct{}{}
	}
	filterDocs := func(docs []DocEntry) []DocEntry {
		filtered := docs[:0]
		for _, doc := range docs {
			if _, exists := movedPtrs[reflect.ValueOf(doc).Pointer()]; !exists {
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

func (s *S) addDoc(entry DocEntry) {
	sanitizeEntry(entry)
	if children, ok := entry["children"].([]DocEntry); ok && len(children) > 0 {
		s.dropDocs(children)
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

// State attaches a state snapshot doc entry and returns it.
// The value is a JSON-serializable snapshot of "what the world looks like"
// at the current step; consecutive states with the same label are diffed by
// the report renderer. An empty label means an anonymous state lane and the
// label field is omitted from the emitted JSON.
func (s *S) State(label string, value any, children ...DocEntry) DocEntry {
	entry := stateEntry(label, value, children...)
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

// Video attaches a video doc entry and returns it.
func (s *S) Video(path string, opts VideoOptions, children ...DocEntry) DocEntry {
	entry := videoEntry(path, opts, children...)
	s.addDoc(entry)
	return entry
}

// Html attaches an embedded-HTML doc entry and returns it. Exactly one of
// opts.Path, opts.URL, or opts.Content must be set.
func (s *S) Html(opts HtmlOptions, children ...DocEntry) DocEntry {
	entry := htmlEntry(opts, children...)
	s.addDoc(entry)
	return entry
}

// Custom attaches a custom doc entry with the given type name and data and returns it.
func (s *S) Custom(typeName string, data any, children ...DocEntry) DocEntry {
	entry := customEntry(typeName, data, children...)
	s.addDoc(entry)
	return entry
}

// AttachmentOptions describes one attachment. Set Path for a file on disk or
// Body for inline content; the rest are optional.
type AttachmentOptions struct {
	Name      string
	MediaType string
	Path      string
	Body      string
	// Encoding is "BASE64" or "IDENTITY" for an inline Body.
	Encoding string
	Charset  string
	// FileName is the name to save the attachment under, when it differs.
	FileName string
}

// optString is a pointer to v, or nil when v is empty.
func optString(v string) *string {
	if v == "" {
		return nil
	}
	return &v
}

// AttachOptions adds an attachment scoped to the current step, or to the test
// case when no step is open.
func (s *S) AttachOptions(opts AttachmentOptions) *S {
	a := RawAttachment{
		Name:      opts.Name,
		MediaType: opts.MediaType,
		Path:      optString(opts.Path),
		Body:      optString(opts.Body),
		Encoding:  optString(opts.Encoding),
		Charset:   optString(opts.Charset),
		FileName:  optString(opts.FileName),
	}
	if s.currentStep != nil {
		idx := len(s.steps) - 1
		a.StepIndex = &idx
		a.StepID = &s.currentStep.ID
	}
	s.attachments = append(s.attachments, a)
	return s
}

// Attach adds a file attachment to the current step or test case level.
func (s *S) Attach(name, mediaType string, path string) *S {
	return s.AttachOptions(AttachmentOptions{Name: name, MediaType: mediaType, Path: path})
}

// AttachInline adds inline content as an attachment.
func (s *S) AttachInline(name, mediaType, body, encoding string) *S {
	return s.AttachOptions(AttachmentOptions{
		Name: name, MediaType: mediaType, Body: body, Encoding: encoding,
	})
}

// TraceRef identifies a trace the test created itself.
type TraceRef struct {
	TraceID string
	SpanID  string
}

// AttachSpans adds OTel spans to the story for trace waterfall rendering in
// HTML reports. Accepts any slice of span-like objects (structurally
// compatible with autotel's SerializedSpan). Repeated calls accumulate.
func (s *S) AttachSpans(spans []any) *S {
	s.otelSpans = append(s.otelSpans, spans...)
	return s
}

// AttachSpansWithTrace adds spans and wires the trace link for a trace the
// test created after Init ran — its own root span, say, which the init-time
// bridge could not have seen because it did not exist yet.
func (s *S) AttachSpansWithTrace(spans []any, ref TraceRef) *S {
	s.AttachSpans(spans)
	s.applyTrace(ref.TraceID, ref.SpanID)
	return s
}

// Feature declares what a package's scenarios are for, ahead of the examples.
//
// Scenarios say what the system does. A declaration says why the feature exists
// and who it serves, so a reader meets the intent before the examples. Call it
// once per test file, from an init function or the top of TestMain.
//
//	func init() {
//	    es.Feature(es.FeatureSpec{
//	        Kind:      "ability",
//	        Title:     "Anyone can do arithmetic without a calculator app",
//	        Narrative: "Switching apps for a quick sum loses your place.",
//	    })
//	}
//
// The source file is taken from the caller, so the declaration lands on the
// file that made it.
func Feature(spec FeatureSpec) {
	if spec.Title == "" {
		return
	}

	sourceFile := spec.SourceFile
	if sourceFile == "" {
		if _, file, _, ok := runtime.Caller(1); ok {
			sourceFile = file
		}
	}

	recordFeature(RawFeature{
		SourceFile: sourceFile,
		Title:      spec.Title,
		Kind:       spec.Kind,
		Narrative:  spec.Narrative,
		Tags:       spec.Tags,
		Glossary:   spec.Glossary,
	})
}

// callerFile is the test file that called into this package. Scenarios and
// feature declarations both key on it, which is what lets a declaration made in
// init() attach to the scenarios in the same file — the report groups by source
// file, so a scenario without one lands under "unknown" and the feature never
// finds it.
func callerFile() string {
	// 0 is callerFile, 1 is Init/Planned, 2 is the test that called them.
	if _, file, _, ok := runtime.Caller(2); ok {
		return file
	}
	return ""
}

// FeatureSpec is what Feature accepts.
type FeatureSpec struct {
	// Title is the heading for the feature.
	Title string
	// Kind is how to introduce it: "feature" (the default), "ability" for
	// something a person can now do, or "business-need" for cross-cutting
	// concerns like security and performance that nobody asks for by name.
	Kind string
	// Narrative is markdown explaining why the feature exists and who it serves.
	Narrative string
	// Tags apply to every scenario in the file.
	Tags []string
	// Glossary holds terms this feature defines.
	Glossary []RawGlossaryTerm
	// SourceFile overrides the caller's file. Rarely needed.
	SourceFile string
}
