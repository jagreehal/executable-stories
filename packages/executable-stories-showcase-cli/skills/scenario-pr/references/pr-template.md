# PR description template

Fill this in. Leave out any section or view that doesn't apply; never add sections beyond these.

```markdown
## Why

{One sentence: the problem this PR solves and what's possible once it ships.}

## What changes on screen

{One line per changed or new state, with its picture. Order by importance, not by name.}

**{State, e.g. "Orders: empty"}** · `{scenario-name}` · {changed | new}
{One short line on what changed, if the picture doesn't make it obvious.}
![{scenario-name}]({published URL})

{Unchanged states that were checked, in one line: "No change: orders-error, orders-loading."}

## Things to note

- {1-3 bullets: anything the reviewer could miss. A state the change touches with no scenario,
  an intended diff elsewhere, a migration, a deliberate omission. "None." when there is nothing.}

## Change outline

{The smallest code-shape views that explain the implementation, each under one line of text.
Pick from: a component tree, a call tree, a file tree with responsibilities, a key type, or
pseudocode for the logic. Use a `diff` block when the shape already existed, a plain block when
it's new.}

## Try it

{The scenario links for the states above, so a reviewer can open them in their own dev server.}

- `/orders?scenario=orders-empty`
```

## Change outline examples

A component change:

```diff
 <OrdersPage> (src/features/orders/OrdersPage.tsx)
   useOrders()
-  <OrdersTable />
+  {orders.length ? <OrdersTable /> : <EmptyOrders />}
+    <EmptyOrders> (src/features/orders/EmptyOrders.tsx)
```

A control-flow change:

```diff
 loadOrders
   fetch /api/orders
-  on error: throw
+  on error: show <OrdersError> with Retry
+  retry: loadOrders
```

Keep each view to what the reviewer needs. Leave out files and calls the change didn't touch.
