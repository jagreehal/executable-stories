Disclosed reference for [`cypress-reporter-setup`](SKILL.md) — module API variants beyond first setup.

## Module API for CI pipelines

```typescript
import cypress from "cypress";
import {
  buildRawRunFromCypressResult,
  generateReportsFromRawRun,
} from "executable-stories-cypress/reporter";

const result = await cypress.run({ spec: "cypress/e2e/**/*.story.cy.ts" });

if (result.status === "finished") {
  const rawRun = buildRawRunFromCypressResult(result);
  await generateReportsFromRawRun(rawRun, {
    formats: ["markdown"],
    outputDir: "docs",
    outputName: "cypress-stories",
  });
}
```

When `cypress.run()` used `@cypress/grep` or another external title filter, pass
`{ runScope: "filtered" }` to `buildRawRunFromCypressResult`. Use `"full"` only for a
run that covered whole specs. The generated documentation formats update and render
`<outputDir>/by-file/`; execution formats contain only this Cypress result.

Guard on `result.status === "finished"` before building the RawRun — `cypress.run()` can also resolve with a `failed` status (e.g. a config error) that carries no test results.
