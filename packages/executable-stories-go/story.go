package es

import (
	"fmt"
	"strings"
	"time"
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

// S represents a story attached to a single test.
type S struct {
	scenario    string
	steps       []StoryStep
	tags        []string
	tickets     []string
	meta        map[string]any
	docs        []DocEntry // story-level docs
	currentStep *StoryStep
	seenPrimary map[string]bool // tracks seen primary keywords for auto-and conversion
	t           TestingT
	startTime   time.Time
	sourceOrder int
	stepCounter int
	attachments []RawAttachment
}

// WithTags adds tags to the story.
func WithTags(tags ...string) Option {
	return func(s *S) {
		s.tags = append(s.tags, tags...)
	}
}

// WithTicket adds ticket references to the story.
func WithTicket(tickets ...string) Option {
	return func(s *S) {
		s.tickets = append(s.tickets, tickets...)
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

// Init creates a new story for the given test.
// It records the start time, assigns a source order, and registers a cleanup
// function to capture the test result and record the test case to the global collector.
func Init(t TestingT, scenario string, opts ...Option) *S {
	t.Helper()

	s := &S{
		scenario:    scenario,
		t:           t,
		startTime:   time.Now(),
		sourceOrder: nextOrder(),
		seenPrimary: make(map[string]bool),
	}

	for _, opt := range opts {
		opt(s)
	}

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
			Meta:        s.meta,
			Docs:        s.docs,
			SourceOrder: &order,
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
func (s *S) addDoc(entry DocEntry) *S {
	if s.currentStep != nil {
		s.currentStep.Docs = append(s.currentStep.Docs, entry)
	} else {
		s.docs = append(s.docs, entry)
	}
	return s
}

// Note attaches a note doc entry.
func (s *S) Note(text string) *S {
	return s.addDoc(noteEntry(text))
}

// Tag attaches a tag doc entry.
func (s *S) Tag(names ...string) *S {
	return s.addDoc(tagEntry(names...))
}

// Kv attaches a key-value doc entry.
func (s *S) Kv(label string, value any) *S {
	return s.addDoc(kvEntry(label, value))
}

// JSON attaches a code doc entry with lang=json by marshaling the value.
func (s *S) JSON(label string, value any) *S {
	return s.addDoc(jsonEntry(label, value))
}

// Code attaches a code doc entry. An optional language can be provided.
func (s *S) Code(label, content string, lang ...string) *S {
	l := ""
	if len(lang) > 0 {
		l = lang[0]
	}
	return s.addDoc(codeEntry(label, content, l))
}

// Table attaches a table doc entry.
func (s *S) Table(label string, columns []string, rows [][]string) *S {
	return s.addDoc(tableEntry(label, columns, rows))
}

// Link attaches a link doc entry.
func (s *S) Link(label, url string) *S {
	return s.addDoc(linkEntry(label, url))
}

// Section attaches a section doc entry.
func (s *S) Section(title, markdown string) *S {
	return s.addDoc(sectionEntry(title, markdown))
}

// Mermaid attaches a mermaid doc entry. An optional title can be provided.
func (s *S) Mermaid(code string, title ...string) *S {
	t := ""
	if len(title) > 0 {
		t = title[0]
	}
	return s.addDoc(mermaidEntry(code, t))
}

// Screenshot attaches a screenshot doc entry. An optional alt text can be provided.
func (s *S) Screenshot(path string, alt ...string) *S {
	a := ""
	if len(alt) > 0 {
		a = alt[0]
	}
	return s.addDoc(screenshotEntry(path, a))
}

// Custom attaches a custom doc entry with the given type name and data.
func (s *S) Custom(typeName string, data any) *S {
	return s.addDoc(customEntry(typeName, data))
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

