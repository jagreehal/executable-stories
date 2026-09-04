---
title: Converting a CucumberJS suite
description: From .feature files, step definitions and a World object to Vitest story tests, one scenario at a time
---

[Why not Cucumber?](/guides/why-not-cucumber/) makes the case. This guide does the
work: it takes a `.feature` file, its step definitions and the World they share,
and lands them as one typed test file.

You do not need to convert the whole suite before you run anything. Cucumber and
Vitest run side by side for as long as the migration takes.

## What the migration moves

A Cucumber scenario lives in four places at once.

| Where it lives          | What it holds                            |
| ----------------------- | ---------------------------------------- |
| `features/cart.feature` | the words a stakeholder reads            |
| `steps/cart.steps.ts`   | the code each phrase dispatches to       |
| `class CartWorld`       | the state those steps pass to each other |
| `Before` / `After`      | when that state appears and vanishes     |

A story test holds all four in one function. Everything below is about which
Cucumber artefact collapses into which part of it.

## Step 1: Transcribe the Gherkin

```bash
npx executable-stories-init@latest --from-cucumber --dry-run
```

The dry run prints what it would write. When it looks right, drop the flag:

```bash
npx executable-stories-init@latest --from-cucumber --yes
```

For each `.feature` file this writes a `.story.test.ts` beside it, adds
`executable-stories-vitest` and the reporter, and writes `vitest.config.ts` if
you have none. Feature files under `node_modules` are left alone.

Given this feature:

```gherkin
Feature: Full Shopping Cart

  Background:
    Given the store has these products:
      | name   | price | category    |
      | Widget | 25    | electronics |
      | Gadget | 50    | electronics |

  @checkout
  Scenario: Add items and check out
    Given I add Widget to cart
    And I add Gadget to cart
    Then the cart should have 2 items
    And the cart total should be $75
```

you get this:

```typescript
// Converted from features/cart.feature by executable-stories-init.
//
// Every story marker below holds the original Gherkin text. Under each one,
// replace the TODO with the code its step definition used to run, and turn
// what the old step read off the World into a local variable. Delete the
// unported() call at the end of a scenario once it asserts something real.

import { describe, it } from 'vitest';
import { story } from 'executable-stories-vitest';

describe('Full Shopping Cart', () => {
  // Gherkin Background. Called on the first line of each scenario rather than
  // from a hook, so a reader can see the setup without leaving the test.
  function background() {
    story.given('the store has these products:');
    story.table({
      label: 'Data table',
      columns: ['name', 'price', 'category'],
      rows: [
        ['Widget', '25', 'electronics'],
        ['Gadget', '50', 'electronics'],
      ],
    });
    // TODO: port the step definition for: the store has these products:
  }

  it('Add items and check out', ({ task }) => {
    story.init(task, { tags: ['checkout'] });
    background();

    story.given('I add Widget to cart');
    // TODO: port the step definition for: I add Widget to cart

    story.and('I add Gadget to cart');
    // TODO: port the step definition for: I add Gadget to cart

    story.then('the cart should have 2 items');
    // TODO: port the step definition for: the cart should have 2 items

    story.and('the cart total should be $75');
    // TODO: port the step definition for: the cart total should be $75

    unported('Add items and check out');
  });
});
```

Two decisions in that output are worth knowing about.

**The Background is a function, not a `beforeEach`.** A hook puts the setup a
scenario depends on in another part of the file, which is one of the things this
migration exists to remove. Calling `background()` on the first line says the
same thing where you can see it.

**Every scenario throws.** `unported()` fails the test until you delete it. A
skipped test would drop the scenario out of the report while you migrate, and a
green test asserting nothing would tell your stakeholders that behaviour is
verified when it is not. The failing count is your progress bar.

Run the suite now and you get one red scenario per pickle, each carrying its full
narrative into the report. Commit that before you change any behaviour.

## Step 2: Port a scenario

Open the converted test and the step definitions together.

```typescript
// steps/cart.steps.ts
class CartWorld extends World {
  products: { name: string; price: number; category: string }[] = [];
  cart: { product: Product; quantity: number }[] = [];
  discount = 0;
  accounts: Record<string, number> = {};
}
setWorldConstructor(CartWorld);

Before(function (this: CartWorld) {
  this.products = [];
  this.cart = [];
  this.discount = 0;
  this.accounts = {};
});

defineParameterType({ name: 'product', regexp: /\w+/, transformer: (s) => s });

Given('the store has these products:', function (this: CartWorld, table: DataTable) {
  this.products = table.hashes().map((row) => ({
    name: row.name,
    price: Number(row.price),
    category: row.category,
  }));
});

When('I add {product} to cart', function (this: CartWorld, name: string) {
  const product = this.products.find((p) => p.name === name);
  if (!product) throw new Error(`Unknown product: ${name}`);
  this.cart.push({ product, quantity: 1 });
});

Then('the cart should have {int} item(s)', function (this: CartWorld, count: number) {
  assert.equal(this.cart.reduce((sum, i) => sum + i.quantity, 0), count);
});

Then('the cart total should be ${int}', function (this: CartWorld, expected: number) {
  const subtotal = this.cart.reduce((s, i) => s + i.product.price * i.quantity, 0);
  assert.equal(Math.round(subtotal * (1 - this.discount / 100)), expected);
});
```

Fill in the TODOs and delete `unported`:

```typescript
import { describe, expect, it } from 'vitest';
import { story } from 'executable-stories-vitest';
import { Cart, catalog } from '../src/cart';

describe('Full Shopping Cart', () => {
  it('Add items and check out', ({ task }) => {
    story.init(task, { tags: ['checkout'] });

    story.given('the store has these products:');
    story.table({
      label: 'Data table',
      columns: ['name', 'price', 'category'],
      rows: catalog.map((p) => [p.name, String(p.price), p.category]),
    });
    const cart = new Cart();

    story.and('I add Widget to cart');
    cart.add(catalog.widget);

    story.and('I add Gadget to cart');
    cart.add(catalog.gadget);

    story.then('the cart should have 2 items');
    expect(cart.itemCount()).toBe(2);

    story.and('the cart total should be $75');
    expect(cart.total()).toBe(75);
  });
});
```

The World is gone, the `Before` hook is gone, `defineParameterType` is gone, and
the four step definitions have become four lines under the markers that describe
them. Rename `Cart.add` and the compiler names every caller.

## The mapping in full

| Cucumber                                  | In a story test                                                |
| ----------------------------------------- | -------------------------------------------------------------- |
| `Feature`                                 | `describe`                                                     |
| `Rule`                                    | nested `describe`                                              |
| `Scenario` / `Example`                    | `it`                                                           |
| `Scenario Outline` + `Examples`           | one `it` per row, values substituted into title and step text  |
| `Given` / `When` / `Then` / `And` / `But` | `story.given` / `when` / `then` / `and` / `but`                |
| `*`                                       | `story.and`                                                    |
| `Background`                              | a function called on the first line of each test               |
| `@tag`                                    | `story.init(task, { tags: [...] })`                            |
| Step definition body                      | the lines under the matching marker                            |
| `World` field                             | a local variable                                               |
| `Before` / `After`                        | a factory function, or `beforeEach` for real lifecycle         |
| `DataTable` and its manual casts          | a typed literal, plus `story.table()` for the report           |
| `DocString`                               | a template literal, plus `story.code()` for the report         |
| `defineParameterType`                     | deleted                                                        |
| A phrase shared across scenarios          | an exported function                                           |

The converter reads keywords through the parser's own dialect table, so a French
or Norwegian feature file converts the same way an English one does.

## The World is the part that takes thought

Everything else on that table is mechanical. A World field is not, because it
exists to let two step definitions share a value, and in a story test they are
already in the same function.

Declare the value where the first step used it:

```typescript
story.given('I have a checking account with $500');
const checking = new Account('checking', 500);

story.and('I have a savings account with $200');
const savings = new Account('savings', 200);

story.when('I transfer $100 from checking to savings');
transfer(checking, savings, 100);
```

Resist turning the World into a context object you pass between helpers. That
rebuilds what you are leaving, and it will grow the same way.

When one World held unrelated domains, which happens because Cucumber gives you
exactly one, split them across files as you convert. Carts and bank accounts
shared an object to satisfy the runner, not because they belong together.

## Hooks

Look at what each hook did.

- **Resetting World fields.** Delete it. Each test builds its own values.
- **Building a fixture.** Make it a function. `newCart()` at the call site beats
  a hook in another file.
- **Starting a container, browser or database.** Keep it. Vitest's `beforeEach`
  and setup files handle real lifecycle, and this is real lifecycle.

`After` hooks holding defensive cleanup usually have nobody reading their output.
Delete them, and add back whatever a failure asks for.

## Reused step phrases

Cucumber's unit of reuse is the phrase. Count the uses before deciding what each
becomes.

A phrase used in two scenarios was costing more in indirection than it saved.
Inline it.

A phrase used across thirty scenarios and doing real work becomes an exported
function:

```typescript
story.given('a signed-in customer with an active subscription');
const customer = await signInWithSubscription(page);
```

The text and the behaviour are separate now, which is the gain: reword the step
without breaking a match, or change the function without touching thirty
sentences.

## Running both suites during the migration

Keep `cucumber-js` in CI until the last feature file goes.

```json
{
  "scripts": {
    "test:cucumber": "cucumber-js",
    "test:stories": "vitest run",
    "test": "pnpm test:cucumber && pnpm test:stories"
  }
}
```

Delete each `.feature` file when its scenarios pass under Vitest. Keeping it
leaves two descriptions of one behaviour, which is the drift these suites
accumulate. When the last one goes, drop `test:cucumber` and the
`@cucumber/cucumber` dependency.

## Checking your work

The report marks any observable Then step that ran no assertion:

```markdown
- **Then** the cart should have 2 items _(no assertion)_
```

Search the generated Markdown for `(no assertion)` before you call a file
converted. A scenario that reads correctly and asserts nothing is the failure
mode worth watching for, because it looks finished.

`executable-stories list reports/by-file --list-format json` gives you the same
information as data if you want to gate CI on it.

## Doing it with an agent

The `cucumber-converting-tests` skill packages this guide for a coding agent:
the mapping table, the judgement calls, and the guardrail about never writing an
assertion you have not run. Install it with the rest of the
[skill set](/ai-skills/), then point an agent at one feature file at a time.

Let the CLI do the transcription. The porting benefits from something that can
read your step definitions and your domain code together, which is what an agent
is for.

## Specification-first survives the migration

The strongest argument for Gherkin was that a product owner could write the
scenario before the code existed. That argument rested on syntax: a `.feature`
file was something a non-developer could type, and a test file was not.

Coding agents removed that constraint. A three-amigos conversation now produces
the story test directly, as `it.todo` declarations when the behaviour is agreed
before anyone builds it, and the generated report is what non-developers read.
The discipline of agreeing on concrete examples first is the part that mattered,
and it carries over. The separate syntax it used to need does not.

A team where non-developers author and maintain `.feature` files today is giving
something up here. Name that before you start rather than discovering it halfway
through.
