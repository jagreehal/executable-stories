---
name: cucumber-converting-tests
description: >
  Use when migrating a CucumberJS suite to executable-stories: converting
  .feature files and step definitions into Vitest story tests, dissolving a
  World object into local variables, and retiring hooks, defineParameterType
  and DataTable casting. Covers the mechanical transcription and the judgement
  calls the transcription cannot make.
metadata:
  type: lifecycle
  library: executable-stories-vitest
  library_version: "8.8.4"
  requires:
    - vitest-story-api
    - vitest-reporter-setup
  sources:
    - 'jagreehal/executable-stories:apps/docs-site/src/content/docs/guides/converting-cucumber.md'
    - 'jagreehal/executable-stories:packages/executable-stories-init/src/cucumber.ts'
---

This skill builds on vitest-story-api. Read that first.

# Migrating a CucumberJS Suite

A Cucumber scenario is spread across four artefacts: the text in the `.feature`
file, the step definition the runner matched it to, the World the step read and
wrote, and the hooks that set the World up. A story test holds all four in one
function. The migration moves each Cucumber artefact into the one place that
replaces it.

Split the work in two. The CLI transcribes the Gherkin, which is deterministic
and boring. You port the step definitions, which needs judgement about intent that a
parser cannot supply reliably.

## Step 1: Transcribe the feature files

```bash
npx executable-stories-init@latest --from-cucumber --yes
```

For every `.feature` file this writes a `.story.test.ts` beside it, installs the
Vitest adapter and reporter, and wires `vitest.config.ts`. Run it with
`--dry-run` first on a suite you have not seen before.

The output preserves the Gherkin text and nothing else. A feature file records
what a step said, not the code that ran for it, and there is no reliable
one-to-one mapping back. Each scenario ends in a call to `unported()`,
which throws. That makes the whole converted suite red on the first run, and the
failing count is your burndown: it reaches zero when every scenario asserts
something real.

## Step 2: Port one scenario

Take the converted file and the step definitions side by side. Work one scenario
at a time and run the test after each.

**Before.** Three files:

```gherkin
# features/cart.feature
Feature: Shopping Cart
  Background:
    Given the store has these products:
      | name   | price |
      | Widget | 25    |

  Scenario: Apply a coupon
    Given I add 2 x Widget to cart
    When I apply coupon "SAVE10" for 10% off
    Then the cart total should be $45
```

```typescript
// steps/cart.steps.ts
class CartWorld extends World {
  products: { name: string; price: number }[] = [];
  cart: { product: { name: string; price: number }; quantity: number }[] = [];
  discount = 0;
}
setWorldConstructor(CartWorld);

Before(function (this: CartWorld) {
  this.products = [];
  this.cart = [];
  this.discount = 0;
});

defineParameterType({ name: 'product', regexp: /\w+/, transformer: (s) => s });

Given('the store has these products:', function (this: CartWorld, table: DataTable) {
  this.products = table.hashes().map((row) => ({
    name: row.name,
    price: Number(row.price),
  }));
});

When('I add {int} x {product} to cart', function (this: CartWorld, qty: number, name: string) {
  const product = this.products.find((p) => p.name === name);
  if (!product) throw new Error(`Unknown product: ${name}`);
  this.cart.push({ product, quantity: qty });
});

When('I apply coupon {string} for {int}% off', function (this: CartWorld, _code: string, pct: number) {
  this.discount = pct;
});

Then('the cart total should be ${int}', function (this: CartWorld, expected: number) {
  const subtotal = this.cart.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  assert.equal(Math.round(subtotal * (1 - this.discount / 100)), expected);
});
```

**After.** One file:

```typescript
// features/cart.story.test.ts
import { describe, expect, it } from 'vitest';
import { story } from 'executable-stories-vitest';
import { Cart, catalog } from '../src/cart';

describe('Shopping Cart', () => {
  it('Apply a coupon', ({ task }) => {
    story.init(task);

    story.given('the store has these products:');
    story.table({
      label: 'Data table',
      columns: ['name', 'price'],
      rows: [['Widget', '25']],
    });
    const cart = new Cart();

    story.and('I add 2 x Widget to cart');
    cart.add(catalog.widget, 2);

    story.when('I apply coupon "SAVE10" for 10% off');
    cart.applyDiscount(10);

    story.then('the cart total should be $45');
    expect(cart.total()).toBe(45);
  });
});
```

The World, the `Before` hook, the parameter type and the four step definitions
are all gone. The two lines that carried real behaviour, `cart.add` and
`cart.applyDiscount`, moved under the markers that describe them.

## What each Cucumber concept becomes

| Cucumber                              | In a story test                                                     |
| ------------------------------------- | ------------------------------------------------------------------- |
| `Feature`                             | `describe`                                                          |
| `Rule`                                | nested `describe`                                                   |
| `Scenario` / `Example`                | `it`                                                                |
| `Scenario Outline` + `Examples`       | one `it` per row, values substituted into the titles and step text  |
| `Given` / `When` / `Then` / `And` / `But` | `story.given` / `when` / `then` / `and` / `but`                 |
| `*`                                   | `story.and`                                                         |
| `Background`                          | a plain function called on the first line of each `it`              |
| `@tag`                                | `story.init(task, { tags: ['tag'] })`                               |
| Step definition body                  | the lines under the matching marker                                 |
| `World` field                         | a `const` or `let` in the test                                      |
| `Before` / `After` hook               | a factory function, or Vitest's `beforeEach` when it is real setup     |
| `defineParameterType`                 | deleted                                                             |
| `DataTable` plus manual `Number()`    | a typed literal, plus `story.table()` when the table earns a place in the report |
| `DocString`                           | a template literal, plus `story.code()` for the report              |
| A step phrase reused across scenarios | an ordinary exported function                                       |

## The four judgement calls

### The World

A World field exists so two step definitions can share a value. In a story test
they are lines in the same function, so the value is a local variable. Declare it
where the first step used it.

Do not translate a World into an object you pass around. That rebuilds the thing
you are leaving. If a scenario needs three variables, declare three variables.

When the World held genuinely unrelated domains, as in a suite where carts and
bank accounts shared one object because Cucumber allows only one, split them
across files by domain while you convert. The single World was a constraint of
the runner, not a description of your system.

### Hooks

Ask what a `Before` hook did.

- Reset World fields: delete it. Fresh locals in each test already do this.
- Build a fixture the test needs: make it a function and call it. `newCart()`
  says more at the call site than a hook does from another file.
- Start a container, open a browser, seed a database: keep it in Vitest's
  `beforeEach` or a setup file. This is real lifecycle and belongs in a hook.

`After` hooks that logged or screenshotted "just in case" usually have no reader.
Delete them and add what you need back when a failure asks for it.

### Reused step phrases

Cucumber's reuse unit is the phrase. Grep how many scenarios use a phrase before
you decide what it becomes.

- Used once or twice: inline the body. The indirection was costing more than it saved.
- Used across many scenarios and doing real work: export a function from a
  helper module and call it under the marker. `await signIn(page, user)` reads
  better than a regex and jumps to its definition.

The step text stays in `story.given(...)`. The function underneath carries the
behaviour. They are separate now, which is the point: you can reword a step
without breaking a match.

### Data tables

A `DataTable` arrived as `Record<string, string>` and every step cast it by hand.
In TypeScript the table is a typed literal, so the cast disappears and the
compiler checks the shape.

Keep `story.table()` when a reader of the report benefits from seeing the data.
Drop it when the table was only a way to get values into the step, and use a
plain array instead.

## Order of work

1. **Run `--from-cucumber` and commit the red suite.** The diff shows what was
   converted before anyone has changed behaviour.
2. **Port the smallest feature first**, end to end, including deleting its
   `.feature` file. This settles the questions above once, in code, so the rest
   of the migration copies a decided pattern.
3. **Port by domain, not by file.** Scenarios that shared World fields will
   share helpers, so converting them together saves rework.
4. **Delete each `.feature` when its scenarios pass.** Leaving it costs you a
   second description of the same behaviour, which is the drift Cucumber suites
   accumulate.
5. **Run both suites in CI until the last feature file goes.** `cucumber-js` and
   `vitest run` coexist; a scenario is covered by one or the other, never neither.

## Guardrails

- **Never write an assertion you have not run.** A converted scenario that calls
  `story.then(...)` and asserts nothing is worse than the red one it replaced:
  the report will claim behaviour nobody verified. The Markdown and HTML output
  marks such a step `(no assertion)`, so check for that string before you call a
  file done.
- **Port behaviour, not wording.** The converted test must fail for the same
  reasons the Cucumber scenario failed. Reword step text later, once the
  assertion is in place.
- **Do not convert a scenario you cannot read.** A step definition that reads
  three World fields set by other steps needs those steps read first. Convert
  the whole scenario at once or leave it.
- **Keep the scenario titles.** They are what stakeholders recognise in the
  report, and they link the new test to the old feature file during the migration.

## When to keep Cucumber

A team where non-developers write and edit `.feature` files, and keep doing so,
has something this migration takes away. Say so rather than converting.

Coding agents change that calculus for most teams. Writing the specification
first no longer requires a syntax non-developers can type, because the
conversation that produces the scenario can produce the test. What survives the
migration is the discipline of agreeing on examples before writing code. What
goes is the mapping layer that discipline used to require.

## Related skills

- `vitest-story-api` for the `story` surface these conversions target.
- `vitest-reporter-setup` for the report the migration produces.
- `spec-convert-tests` for rewriting unclear test code into specification
  language, which is a good pass to run after the mechanical port lands.
- `spec-example-mapping` when a converted scenario turns out to describe two
  rules at once and needs splitting.
