# PR description template

Drop any section that would be empty, heading included. Order the "How it's built" views
in whatever order makes the change easiest to follow.

````markdown
[Ticket](url) · [Report](url)

## Why

<One sentence: the problem, and what works once this merges.>

## Things to note

- <Changed code with no scenario, a scenario that disappeared, a migration, a deliberate
  omission. Or "None.">

## Behaviour

**New behavior**

- <Scenario title> (`<test file>`)

**Changed**

- <Scenario title>: <what now differs, in a few words>

**Broken**

- <Scenario title>: <why it fails, and whether that is expected>

**Removed**

- <Scenario title>: <withdrawn on purpose, and why>

## How it's built

<One line on what the view shows.>

```diff
 src/checkout/
+  discount.ts        apply a code to the basket total
~  basket.ts          total now subtracts the discount
```

<One line on what the view shows.>

```text
submitOrder()
  -> priceBasket(basket)
       -> applyDiscount(code)   new
```

## Screens

![<Scenario title>](<image from the head run>)
````

The behaviour lines come from `compare --format changelog`, which groups scenarios under
New behavior, Fixed, Broken, Removed, Renamed or moved, and Changed. Keep its group names,
add a few words on each line saying what differs, and lead with Broken or Removed when
either has entries: those are the lines a reviewer must not miss.
