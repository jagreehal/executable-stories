# User Stories

| Key | Value |
| --- | --- |
| Date | 2026-02-04T20:55:30.340Z |
| Version | 1.0.0 |
| Git SHA | 3149bef |

## src/refactor-guide.story.spec.ts

### Part 2: Introduce story (test + story.init(testInfo))

#### ✅ Calculator adds two numbers

- **Given** two numbers 2 and 3
- **When** they are added
- **Then** the result is 5

### Part 3: Framework-native with story.init(testInfo)

#### ✅ Step 2 — Keep test(), add story.init(): existing test appears in docs


### Part 4: Full patterns

#### ✅ Calculator multiplies two numbers

- **Given** two numbers 7 and 6
- **When** they are multiplied
- **Then** the result is 42

#### ✅ Step 3b — Framework-native test with story.init() in the same describe


#### ✅ Calculator adds with a note

> Using small numbers; the note appears in the generated Markdown.
- **Given** two numbers 1 and 2
- **When** they are added
- **Then** the result is 3