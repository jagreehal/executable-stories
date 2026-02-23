# Formatting conventions (when writing or citing)

Use these rules when writing or citing code in responses:

- **Code and symbols:** Use backticks for file paths, directory names, function names, class names, and inline code (e.g. `story.given`, `vitest.config.ts`).
- **Emphasis:** Use **bold** for key terms when emphasizing (e.g. **MUST**, **SHOULD**).
- **Citing code from the repo:** Use the standard citation format with line range and path:
  ```startLine:endLine:filepath
  // snippet
  ```
  Example: ```12:15:packages/executable-stories-vitest/src/reporter.ts```
- **Math (if ever needed):** Inline math `\( ... \)`, block math `\[ ... \]`.
- **Valid markdown:** Ensure output is valid markdown (no broken backticks or brackets).
