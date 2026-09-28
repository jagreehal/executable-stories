---
title: Verify a deploy
description: Run stories against the live system after a deploy and read each condition's expected and actual values in the report.
---

A green pipeline tells you the steps ran. To know the system landed where you meant it to, check the running service: the released version serving, enough replicas up, the error rate in bounds. A story checks those claims the same way it checks code.

You write a post-deploy story as an ordinary story test. It points at a deployed URL instead of a local module.

## The story

Keep these in their own directory and let them run only when you set a target:

```typescript
// deploy/orders.story.test.ts
import { story } from 'executable-stories-vitest';
import { describe, expect, it } from 'vitest';

const baseUrl = process.env.DEPLOY_URL;
const version = process.env.DEPLOY_VERSION;

describe.runIf(baseUrl)('Orders deploy', () => {
  it('serves the released version with capacity to spare', async ({ task }) => {
    story.init(task);

    story.given(`version ${version} was deployed to ${baseUrl}`);
    const status = await fetch(`${baseUrl}/status`).then((r) => r.json());
    story.kv({ label: 'Observed', value: status });

    story.then('the released version is serving');
    expect(status.version).toBe(version);

    story.then('at least 3 replicas are available');
    expect(status.availableReplicas).toBeGreaterThanOrEqual(3);

    story.then('the error rate is at most 1%');
    expect(status.errorRate).toBeLessThanOrEqual(0.01);
  });
});
```

Swap `/status` for whatever your service or platform exposes. Each Then names one condition, and one assertion checks it.

`story.kv` records the observed values, so readers see the evidence behind a pass as well as a failure.

## Run it after the deploy

Give it its own config so its report stays separate from the main suite:

```typescript
// vitest.deploy.config.ts
import { defineConfig } from 'vitest/config';
import { createStoryReporter } from 'executable-stories-vitest/reporter';

export default defineConfig({
  test: {
    include: ['deploy/**/*.story.test.ts'],
    reporters: [
      'default',
      createStoryReporter({
        formats: ['markdown', 'html'],
        outputDir: 'reports/deploy',
        rawRunPath: 'reports/deploy/raw-run.json',
      }),
    ],
  },
});
```

```bash
DEPLOY_URL=https://orders.example.com DEPLOY_VERSION=2026.09.19 \
  vitest run --config vitest.deploy.config.ts
```

## Reading a failure

The failing step carries the assertion's expected and actual values next to its message. In `agent-text`:

```text
FAIL serves the released version with capacity to spare
  Given version 2026.09.19 was deployed
    Observed: {"version":"2026.09.19","availableReplicas":2,"errorRate":0.004}
  Then the released version is serving
  And at least 3 replicas are available !! FAILED
    ! expected 2 to be greater than or equal to 3
    ! expected: 3
    ! actual: 2
```

The HTML report shows the pair under the step. StoryReport JSON and `executable-stories check` carry them as `expected` and `actual`, so an agent reads the gap straight from the fields.

Vitest fills both for any matcher that reports values. Jest fills them for equality matchers such as `toBe` and `toEqual`. Playwright and Cypress report the message. When both sides print the same text, as Jest's Maps and Sets do, the report shows the message on its own.

## Order the conditions

The test stops at the first failed `expect`, so the report lists the steps up to that point. Put the most fundamental condition first: if the wrong version is serving, the replica count tells you little. When you need every condition on every run, give each its own `it()`.

## Record what you verified

Pair the run with the [deployment ledger](/guides/release-confidence/#deployment-ledger) to answer which run verified which environment:

```bash
executable-stories deploy record reports/deploy/raw-run.json \
  --env production \
  --tag 2026.09.19
```
