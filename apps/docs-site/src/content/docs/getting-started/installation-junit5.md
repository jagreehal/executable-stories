---
title: Installation (JUnit 5)
description: Install executable-stories-junit5 and configure your Kotlin or Java test suite to write raw run JSON
---

## Install the dependency

Add the dependency to your build file.

**Gradle (Kotlin DSL):**

```kotlin
testImplementation("io.github.jagreehal:executable-stories-junit5:0.1.0")
```

**Gradle (Groovy DSL):**

```groovy
testImplementation 'io.github.jagreehal:executable-stories-junit5:0.1.0'
```

**Maven:**

```xml
<dependency>
  <groupId>io.github.jagreehal</groupId>
  <artifactId>executable-stories-junit5</artifactId>
  <version>0.1.0</version>
  <scope>test</scope>
</dependency>
```

Requires Java 21 or later and JUnit 5.11 or later.

## Framework setup

No explicit setup is required. The `StoryTestExecutionListener` registers itself automatically via JUnit Platform service discovery. Add the dependency and the listener activates for your entire test run.

The listener writes `.executable-stories/raw-run.json` after all tests have finished.

## Default output

The raw run JSON file is written relative to the working directory. When running from Gradle or Maven, that is the project root.

## Generate a report

Pass the raw run JSON to `executable-stories-formatters` to render Markdown, HTML, JUnit XML, or Cucumber formats:

```bash
npx executable-stories-formatters format --input .executable-stories/raw-run.json --format markdown
```

Install the formatters package once in your Node project or CI job:

```bash
npm install -D executable-stories-formatters
```

## Next

[First Story (JUnit 5)](/getting-started/first-story-junit5/) — write your first Kotlin scenario.

[JUnit 5 story & doc API](/reference/junit5-story-api/) — steps, docs, and adapter options.
