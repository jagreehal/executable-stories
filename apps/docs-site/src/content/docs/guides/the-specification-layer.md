---
title: The specification layer
description: Declare what a feature is for, so the report reads as a specification rather than a list of scenarios
---

A scenario tells you what the system does. It cannot tell you why anyone wanted
it, who it serves, or what the words in it mean. Read a report cold and you get
a list of true statements with no way to judge whether they are the right ones.

`story.feature(...)` fills that gap. Call it once per test file and the report
opens with the intent before the examples.

```ts
import { story } from 'executable-stories-vitest';

story.feature({
  kind: 'ability',
  title: 'Employees can secure their passwords',
  narrative: `
    Reused and guessable passwords are how most accounts here get taken over.
    The signup form rejects them outright rather than warning and letting them
    through, because a warning people can click past buys nothing.
  `,
  glossary: [
    {
      term: 'password strength',
      definition: 'A score from weak to strong, derived from length and dictionary matches.',
    },
  ],
});

describe('Signup', () => {
  it('rejects a password shorter than 12 characters', ({ task }) => {
    story.init(task);
    story.given('Simona is choosing a password');
    story.when('she submits "shorty"');
    story.then('the form rejects it');
  });
});
```

The declaration replaces the file name as the feature heading, adds a badge for
the kind, and renders the narrative and glossary above the scenarios in both the
HTML and Markdown reports.

## Three kinds, and why the distinction earns its keep

`kind` decides how a reader meets the feature.

**`ability`** frames it as something a person can now do. "Employees can secure
their passwords" survives a rewrite of the code underneath it. "PasswordValidator"
does not. Name the person and the outcome, and the heading stays true for years.

**`business-need`** covers what nobody asks for by name. Security, performance,
and availability have no user story, but they have scenarios, and burying them
under a module name hides them from the people who care most.

```ts
story.feature({
  kind: 'business-need',
  title: 'Security',
  narrative: 'Every rule here came out of an incident. The ticket is on each scenario.',
});
```

**`feature`** is the default and the right choice when the other two would be a
stretch. Do not force the framing.

## The glossary is checked, not merely written down

A glossary in a wiki rots because nothing reads it. These terms sit next to the
scenarios that use them, in the same file, under the same review. Rename a
concept in the code and the scenario text that contradicts the glossary is in
the diff.

Define a term where it is used, not in one central file. A term that matters to
one feature belongs to that feature.

## Where the call goes

The declaration has to run before the tests it describes, which means module
scope in most languages.

**Vitest, Jest, Playwright, Cypress** — at the top of the file, above the first
`describe`.

**Go** — in `init()`, with the source file taken from the caller.

```go
func init() {
	es.Feature(es.FeatureSpec{
		Kind:      "ability",
		Title:     "Employees can secure their passwords",
		Narrative: "Reused passwords are how most accounts here get taken over.",
	})
}
```

**Ruby** — at the top of the file, above the test class.

```ruby
ExecutableStories.feature(
  kind: "ability",
  title: "Employees can secure their passwords",
  narrative: "Reused passwords are how most accounts here get taken over."
)
```

**Python** — at module scope, above the first test.

```python
story.feature(
    "Employees can secure their passwords",
    kind="ability",
    narrative="Reused passwords are how most accounts here get taken over.",
)
```

**Rust** — through `declare_feature!`, which wraps the call in a test of its own.
Rust runs nothing before a test binary's tests, so there is nowhere else to put
it.

```rust
declare_feature!(
    Feature::new("Employees can secure their passwords")
        .ability()
        .narrative("Reused passwords are how most accounts here get taken over.")
);
```

**JUnit 5** — from `@BeforeAll` in a companion object.

```kotlin
companion object {
    @BeforeAll
    @JvmStatic
    fun declareFeature() {
        Story.feature(
            title = "Employees can secure their passwords",
            kind = "ability",
            narrative = "Reused passwords are how most accounts here get taken over.",
        )
    }
}
```

**xUnit** — from a static constructor.

```csharp
static PasswordTests() => Story.Feature(
    "Employees can secure their passwords",
    kind: "ability",
    narrative: "Reused passwords are how most accounts here get taken over.");
```

On the JVM and .NET there is no source path to key on, so the declaring class
plays that role. Everywhere else the source file does.

## What happens without one

Nothing changes. Files that never declare a feature keep the title they had,
derived from the describe block or the file name, and render exactly as before.
Add declarations to the files where the why is hardest to guess and leave the
rest alone.

## Declaring twice

The last declaration for a file wins, which is how it reads in source order. Two
files declaring the same title stay two features, because the report groups by
file rather than by heading.
