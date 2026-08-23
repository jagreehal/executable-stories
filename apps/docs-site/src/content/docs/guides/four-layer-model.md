---
title: Four layers, without a world object
description: How the DSL and protocol-driver layers land in TypeScript when there is no step registry to fight
---

Acceptance tests fall over at scale for a predictable reason: the test says
*click the button with id `submit-order`*, and six months later someone renames
the button. The test was never about the button.

The fix is a layered structure. Dave Farley describes four:

1. **Test cases** — what the system does, in the language of the business
2. **DSL** — reusable domain operations the test cases call
3. **Protocol drivers** — how an operation reaches the system
4. **The system under test**

Layers 1 and 2 change when the behaviour changes. Layers 3 and 4 change when the
implementation changes. Keep them apart and a UI rewrite touches one file.

## Layer 2 is just functions

In Cucumber, layer 2 has to be step definitions, and shared state has to travel
through a world object, because a regex-matched step has no other way to hand
anything to the next one. That machinery is not the model. It is the cost of
putting the test cases in a separate `.feature` file.

Here the test is code, so layer 2 is a function.

```ts
// dsl/orders.ts
export interface OrderDeps {
  store: StoreDriver;
}

export async function placeOrder(
  args: { customer: string; items: Item[] },
  deps: OrderDeps,
): Promise<OrderRef> {
  const cart = await deps.store.startCart(args.customer);
  for (const item of args.items) await deps.store.addItem(cart, item);
  return deps.store.checkout(cart);
}
```

No registry, no world, no regex. The test calls it and holds the result in a
variable:

```ts
it('confirms an order paid by card', async ({ task }) => {
  story.init(task);

  story.given('Simona has two shirts in her basket');
  const order = await placeOrder({ customer: 'Simona', items: [shirt, shirt] }, { store });

  story.when('she pays by card');
  await payByCard(order, { store });

  story.then('she gets a confirmation');
  expect(await store.confirmationFor(order)).toBeDefined();
});
```

If that looks like ordinary code, that is the point. The `fn(args, deps)` shape
used across this codebase *is* the DSL layer. Nothing was added to get it.

## Layer 3 is the deps argument

A protocol driver is whatever satisfies `StoreDriver`. Swap it and the same test
runs against a different depth of the system.

```ts
const store = process.env.TARGET === 'deployed'
  ? httpStoreDriver({ baseUrl: process.env.BASE_URL! })
  : inMemoryStoreDriver();
```

The in-memory driver runs in milliseconds on every commit. The HTTP driver runs
against a deployed environment on merge. Neither test case changes, because
neither ever knew which one it had.

This is the payoff the layering exists for, and it is a constructor argument.

## What belongs in which layer

**A test case names outcomes, never mechanics.** "She pays by card", not "she
fills the card field and clicks Pay". Farley's check: would your description
also describe a person doing this in a physical shop? If it mentions a button,
it would not.

**The DSL hides incidental detail behind defaults.** `placeOrder` invents an
address, a payment method, and a delivery slot. A test that cares about the
address passes one; the rest stay quiet about it. Every value a test states is a
claim that the value matters, so stating values that do not matter is a lie that
costs a reader time.

**A protocol driver holds every selector, URL, and payload shape.** One file to
change when the UI does.

**No business logic in layers 2 or 3.** A DSL that computes the expected total
will happily agree with a broken system. Put the number in the test case.

## Test isolation

Layered tests get run in parallel, which means two tests cannot both own "the
customer". Give each run its own names:

```ts
const customer = unique('Simona'); // Simona-4f2a1c
```

Functional isolation like this beats resetting a database between tests: it is
faster, and it survives running against a shared environment where you have no
authority to reset anything.

## Where this leaves you

The structure Farley describes is worth having. The apparatus usually bundled
with it is not. Test cases in code get layers 2 and 3 as functions and
arguments, which is a thing every developer on the team already knows how to
refactor.
