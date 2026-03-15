/**
 * Generate rich HTML report files for each theme — for landing page screenshots.
 * Run: npx tsx src/generate-screenshots.ts
 */
import { writeFileSync, mkdirSync } from "node:fs";
import {
  HtmlFormatter,
  canonicalizeRun,
  getAvailableThemes,
  RunDiffHtmlFormatter,
  diffRuns,
} from "executable-stories-formatters";
import type { RawRun, TestRunResult } from "executable-stories-formatters";

const OUT = "screenshots/html";
mkdirSync(OUT, { recursive: true });

// ---------------------------------------------------------------------------
// Rich main report fixture — shows off steps, docs, tags, errors, code, tables
// ---------------------------------------------------------------------------
const mainRun: RawRun = {
  projectRoot: "/app",
  startedAtMs: Date.now() - 12000,
  finishedAtMs: Date.now(),
  testCases: [
    {
      title: "User can log in with valid credentials",
      status: "pass",
      sourceFile: "src/auth/login.story.spec.ts",
      sourceLine: 12,
      durationMs: 342,
      tags: ["auth", "smoke", "sprint-42"],
      story: {
        scenario: "User can log in with valid credentials",
        steps: [
          { keyword: "Given" as const, text: "a registered user with email alice@example.com" },
          { keyword: "When" as const, text: "the user submits valid credentials" },
          { keyword: "Then" as const, text: "they are redirected to the dashboard" },
          { keyword: "And" as const, text: "a session cookie is set" },
        ],
        docs: [
          { kind: "note" as const, text: "Covers the primary authentication happy path", phase: "static" as const },
          { kind: "kv" as const, label: "Auth Provider", value: "OAuth2 + PKCE", phase: "static" as const },
          { kind: "code" as const, label: "Request payload", lang: "json", content: '{\n  "email": "alice@example.com",\n  "password": "••••••••"\n}', phase: "static" as const },
          { kind: "table" as const, label: "Test accounts", columns: ["Email", "Role", "Status"], rows: [["alice@example.com", "Admin", "Active"], ["bob@example.com", "Viewer", "Active"], ["charlie@example.com", "Editor", "Suspended"]], phase: "static" as const },
        ],
        tickets: ["AUTH-1024"],
      },
    },
    {
      title: "Dashboard renders analytics charts",
      status: "pass",
      sourceFile: "src/dashboard/analytics.story.spec.ts",
      sourceLine: 5,
      durationMs: 1870,
      tags: ["dashboard", "analytics"],
      story: {
        scenario: "Dashboard renders analytics charts",
        steps: [
          { keyword: "Given" as const, text: "an authenticated admin user" },
          { keyword: "When" as const, text: "they navigate to the analytics page" },
          { keyword: "Then" as const, text: "the revenue chart renders with data" },
          { keyword: "And" as const, text: "the user growth chart renders with data" },
          { keyword: "And" as const, text: "the date range picker defaults to last 30 days" },
        ],
        docs: [
          { kind: "note" as const, text: "Charts use recharts library with custom theme tokens", phase: "static" as const },
          { kind: "mermaid" as const, title: "Data flow", code: "graph LR\n  API[REST API] --> Transform[Data Transform]\n  Transform --> ChartData[Chart Data]\n  ChartData --> Revenue[Revenue Chart]\n  ChartData --> Growth[User Growth Chart]", phase: "static" as const },
          { kind: "link" as const, label: "Design spec", url: "https://figma.com/file/abc123/analytics-dashboard", phase: "static" as const },
        ],
      },
    },
    {
      title: "Shopping cart calculates totals correctly",
      status: "pass",
      sourceFile: "src/cart/totals.story.spec.ts",
      sourceLine: 8,
      durationMs: 156,
      tags: ["cart", "pricing"],
      story: {
        scenario: "Shopping cart calculates totals correctly",
        steps: [
          { keyword: "Given" as const, text: "a cart with 3 items" },
          { keyword: "When" as const, text: "a 15% discount code is applied" },
          { keyword: "Then" as const, text: "the subtotal reflects the discount" },
          { keyword: "And" as const, text: "tax is calculated on the discounted amount" },
          { keyword: "But" as const, text: "shipping cost is not discounted" },
        ],
        docs: [
          { kind: "table" as const, label: "Cart contents", columns: ["Item", "Qty", "Unit Price", "Line Total"], rows: [["Widget Pro", "2", "$29.99", "$59.98"], ["Cable USB-C", "1", "$12.50", "$12.50"], ["Screen Protector", "3", "$8.99", "$26.97"]], phase: "static" as const },
          { kind: "kv" as const, label: "Discount", value: "15% (SAVE15)", phase: "static" as const },
          { kind: "kv" as const, label: "Expected total", value: "$92.28", phase: "static" as const },
        ],
        tickets: ["CART-789", "PRICING-102"],
      },
    },
    {
      title: "Payment fails gracefully on network timeout",
      status: "fail",
      sourceFile: "src/checkout/payment.story.spec.ts",
      sourceLine: 22,
      durationMs: 5012,
      tags: ["checkout", "error-handling", "flaky"],
      errorMessage: "TimeoutError: Payment gateway did not respond within 5000ms\n    at processPayment (src/checkout/payment.ts:45:11)\n    at Object.<anonymous> (src/checkout/payment.story.spec.ts:34:5)",
      story: {
        scenario: "Payment fails gracefully on network timeout",
        steps: [
          { keyword: "Given" as const, text: "a cart ready for checkout" },
          { keyword: "And" as const, text: "the payment gateway is experiencing high latency" },
          { keyword: "When" as const, text: "the user submits the payment" },
          { keyword: "Then" as const, text: "a user-friendly error message is shown" },
          { keyword: "And" as const, text: "the cart contents are preserved" },
          { keyword: "And" as const, text: "a retry button is displayed" },
        ],
        docs: [
          { kind: "note" as const, text: "Simulates 5s network delay via MSW interceptor", phase: "static" as const },
          { kind: "code" as const, label: "Error response", lang: "json", content: '{\n  "error": "GATEWAY_TIMEOUT",\n  "message": "The payment service is temporarily unavailable. Please try again."\n}', phase: "static" as const },
        ],
        tickets: ["PAY-456"],
      },
    },
    {
      title: "Notification preferences can be updated",
      status: "pass",
      sourceFile: "src/settings/notifications.story.spec.ts",
      sourceLine: 3,
      durationMs: 289,
      tags: ["settings"],
      story: {
        scenario: "Notification preferences can be updated",
        steps: [
          { keyword: "Given" as const, text: "a user on the notification settings page" },
          { keyword: "When" as const, text: "they toggle email notifications off" },
          { keyword: "And" as const, text: "they enable push notifications" },
          { keyword: "Then" as const, text: "the preferences are saved" },
          { keyword: "And" as const, text: "a confirmation toast appears" },
        ],
        docs: [
          { kind: "section" as const, title: "Implementation notes", markdown: "Uses **optimistic updates** — UI toggles immediately while the API call is in-flight. On failure, the toggle reverts with an error toast.", phase: "static" as const },
        ],
      },
    },
    {
      title: "Search returns relevant results with highlighting",
      status: "skip",
      sourceFile: "src/search/results.story.spec.ts",
      sourceLine: 15,
      durationMs: 0,
      tags: ["search", "wip"],
      story: {
        scenario: "Search returns relevant results with highlighting",
        steps: [
          { keyword: "Given" as const, text: "a catalog with 500 products" },
          { keyword: "When" as const, text: 'the user searches for "wireless headphones"' },
          { keyword: "Then" as const, text: "results are ranked by relevance" },
          { keyword: "And" as const, text: "matching terms are highlighted in the results" },
        ],
        docs: [
          { kind: "note" as const, text: "Skipped: Elasticsearch indexing not yet available in test environment", phase: "static" as const },
        ],
      },
    },
  ],
};

// ---------------------------------------------------------------------------
// Rich diff fixture — shows regressions, fixes, changes, added, removed
// ---------------------------------------------------------------------------
function makeTc(id: string, scenario: string, status: "passed" | "failed", extra: Record<string, unknown> = {}) {
  return {
    id,
    story: { scenario, steps: [], docs: [], tags: [], tickets: [], suitePath: [], sourceOrder: 0 },
    sourceFile: `src/${id.replace(/-/g, "/")}.test.ts`,
    sourceLine: 1,
    status,
    durationMs: 100 + Math.floor(Math.random() * 2000),
    attachments: [],
    stepResults: [],
    titlePath: [scenario],
    retry: 0,
    retries: 0,
    tags: [],
    ...extra,
  };
}

const diffBaseline: TestRunResult = {
  testCases: [
    makeTc("auth-login", "User login with valid credentials", "passed", {
      durationMs: 340,
      tags: ["auth", "smoke"],
      story: {
        scenario: "User login with valid credentials", suitePath: ["Auth"],
        steps: [{ keyword: "Given", text: "a registered user" }, { keyword: "When", text: "they log in" }, { keyword: "Then", text: "they see the dashboard" }],
        docs: [{ kind: "note", text: "Happy path login", phase: "static" }], tags: ["auth", "smoke"], tickets: ["AUTH-100"], sourceOrder: 0,
      },
    }),
    makeTc("auth-mfa", "MFA verification succeeds", "passed", {
      durationMs: 520,
      tags: ["auth", "mfa"],
      story: {
        scenario: "MFA verification succeeds", suitePath: ["Auth"],
        steps: [{ keyword: "Given", text: "a user with MFA enabled" }, { keyword: "When", text: "they enter a valid TOTP code" }, { keyword: "Then", text: "they are authenticated" }],
        docs: [], tags: ["auth", "mfa"], tickets: [], sourceOrder: 1,
      },
    }),
    makeTc("cart-add", "Add item to cart", "passed", {
      durationMs: 180,
      tags: ["cart"],
      story: {
        scenario: "Add item to cart", suitePath: ["Cart"],
        steps: [{ keyword: "Given", text: "an empty cart" }, { keyword: "When", text: "user adds a product" }, { keyword: "Then", text: "cart count shows 1" }],
        docs: [{ kind: "note", text: "Basic add-to-cart flow", phase: "static" }], tags: ["cart"], tickets: ["CART-200"], sourceOrder: 0,
      },
    }),
    makeTc("cart-remove", "Remove item from cart", "passed", {
      durationMs: 150,
      tags: ["cart"],
      story: {
        scenario: "Remove item from cart", suitePath: ["Cart"],
        steps: [{ keyword: "Given", text: "a cart with one item" }, { keyword: "When", text: "user removes the item" }, { keyword: "Then", text: "cart is empty" }],
        docs: [], tags: ["cart"], tickets: [], sourceOrder: 1,
      },
    }),
    makeTc("checkout-pay", "Payment processes successfully", "failed", {
      durationMs: 4800,
      tags: ["checkout", "payment"],
      errorMessage: "TimeoutError: Stripe API timeout after 5000ms",
      story: {
        scenario: "Payment processes successfully", suitePath: ["Checkout"],
        steps: [{ keyword: "Given", text: "a cart ready for checkout" }, { keyword: "When", text: "user submits payment" }, { keyword: "Then", text: "order is confirmed" }],
        docs: [{ kind: "note", text: "Uses Stripe test mode", phase: "static" }], tags: ["checkout", "payment"], tickets: ["PAY-300"], sourceOrder: 0,
      },
    }),
    makeTc("search-basic", "Basic search returns results", "passed", {
      durationMs: 220,
      tags: ["search"],
      story: {
        scenario: "Basic search returns results", suitePath: ["Search"],
        steps: [{ keyword: "Given", text: "a product catalog" }, { keyword: "When", text: "user searches" }, { keyword: "Then", text: "matching results shown" }],
        docs: [], tags: ["search"], tickets: [], sourceOrder: 0,
      },
    }),
    makeTc("legacy-export", "Legacy CSV export", "passed", {
      durationMs: 3200,
      tags: ["export", "legacy"],
      story: {
        scenario: "Legacy CSV export", suitePath: ["Export"],
        steps: [{ keyword: "Given", text: "report data" }, { keyword: "When", text: "user exports CSV" }, { keyword: "Then", text: "file downloads" }],
        docs: [{ kind: "note", text: "Deprecated: migrating to new export service", phase: "static" }], tags: ["export", "legacy"], tickets: ["EXP-50"], sourceOrder: 0,
      },
    }),
    makeTc("settings-profile", "Update profile settings", "passed", {
      durationMs: 190,
      tags: ["settings"],
      story: {
        scenario: "Update profile settings", suitePath: ["Settings"],
        steps: [{ keyword: "Given", text: "user on settings page" }, { keyword: "When", text: "they update their name" }, { keyword: "Then", text: "changes are saved" }],
        docs: [], tags: ["settings"], tickets: [], sourceOrder: 0,
      },
    }),
  ],
  startedAtMs: Date.now() - 86400000,
  finishedAtMs: Date.now() - 86400000 + 15000,
  durationMs: 15000,
  projectRoot: "/app",
  runId: "baseline-run-001",
} as TestRunResult;

const diffCurrent: TestRunResult = {
  testCases: [
    // REGRESSED: login was passing, now failing
    makeTc("auth-login", "User login with valid credentials", "failed", {
      durationMs: 5100,
      tags: ["auth", "smoke"],
      errorMessage: "Error: Authentication service returned 503 — upstream dependency failure\n    at AuthService.authenticate (src/auth/service.ts:89:13)",
      story: {
        scenario: "User login with valid credentials", suitePath: ["Auth"],
        steps: [{ keyword: "Given", text: "a registered user" }, { keyword: "When", text: "they log in" }, { keyword: "Then", text: "they see the dashboard" }],
        docs: [{ kind: "note", text: "Happy path login", phase: "static" }], tags: ["auth", "smoke"], tickets: ["AUTH-100"], sourceOrder: 0,
      },
    }),
    // UNCHANGED
    makeTc("auth-mfa", "MFA verification succeeds", "passed", {
      durationMs: 510,
      tags: ["auth", "mfa"],
      story: {
        scenario: "MFA verification succeeds", suitePath: ["Auth"],
        steps: [{ keyword: "Given", text: "a user with MFA enabled" }, { keyword: "When", text: "they enter a valid TOTP code" }, { keyword: "Then", text: "they are authenticated" }],
        docs: [], tags: ["auth", "mfa"], tickets: [], sourceOrder: 1,
      },
    }),
    // CHANGED: updated docs and tags
    makeTc("cart-add", "Add item to cart", "passed", {
      durationMs: 165,
      tags: ["cart", "core"],
      story: {
        scenario: "Add item to cart", suitePath: ["Cart"],
        steps: [{ keyword: "Given", text: "an empty cart" }, { keyword: "When", text: "user adds a product" }, { keyword: "Then", text: "cart count shows 1" }, { keyword: "And", text: "cart total updates" }],
        docs: [{ kind: "note", text: "Updated: now also verifies cart total calculation", phase: "static" }], tags: ["cart", "core"], tickets: ["CART-200", "CART-215"], sourceOrder: 0,
      },
    }),
    // UNCHANGED
    makeTc("cart-remove", "Remove item from cart", "passed", {
      durationMs: 145,
      tags: ["cart"],
      story: {
        scenario: "Remove item from cart", suitePath: ["Cart"],
        steps: [{ keyword: "Given", text: "a cart with one item" }, { keyword: "When", text: "user removes the item" }, { keyword: "Then", text: "cart is empty" }],
        docs: [], tags: ["cart"], tickets: [], sourceOrder: 1,
      },
    }),
    // FIXED: payment was failing, now passing
    makeTc("checkout-pay", "Payment processes successfully", "passed", {
      durationMs: 890,
      tags: ["checkout", "payment"],
      story: {
        scenario: "Payment processes successfully", suitePath: ["Checkout"],
        steps: [{ keyword: "Given", text: "a cart ready for checkout" }, { keyword: "When", text: "user submits payment" }, { keyword: "Then", text: "order is confirmed" }],
        docs: [{ kind: "note", text: "Fixed: increased Stripe timeout to 10s, added retry logic", phase: "static" }], tags: ["checkout", "payment"], tickets: ["PAY-300", "PAY-312"], sourceOrder: 0,
      },
    }),
    // UNCHANGED
    makeTc("search-basic", "Basic search returns results", "passed", {
      durationMs: 215,
      tags: ["search"],
      story: {
        scenario: "Basic search returns results", suitePath: ["Search"],
        steps: [{ keyword: "Given", text: "a product catalog" }, { keyword: "When", text: "user searches" }, { keyword: "Then", text: "matching results shown" }],
        docs: [], tags: ["search"], tickets: [], sourceOrder: 0,
      },
    }),
    // REMOVED: legacy-export is gone (migrated)
    // ADDED: new feature
    makeTc("search-filters", "Search with category filters", "passed", {
      durationMs: 310,
      tags: ["search", "filters"],
      story: {
        scenario: "Search with category filters", suitePath: ["Search"],
        steps: [{ keyword: "Given", text: "a product catalog with categories" }, { keyword: "When", text: "user searches with a category filter" }, { keyword: "Then", text: "only matching category results are shown" }],
        docs: [{ kind: "note", text: "New feature: faceted search with category filtering", phase: "static" }], tags: ["search", "filters"], tickets: ["SEARCH-450"], sourceOrder: 1,
      },
    }),
    // ADDED: another new feature
    makeTc("notif-push", "Push notification delivery", "passed", {
      durationMs: 420,
      tags: ["notifications", "push"],
      story: {
        scenario: "Push notification delivery", suitePath: ["Notifications"],
        steps: [{ keyword: "Given", text: "a user with push enabled" }, { keyword: "When", text: "an event triggers a notification" }, { keyword: "Then", text: "the push notification is delivered" }],
        docs: [{ kind: "note", text: "Uses Firebase Cloud Messaging in test mode", phase: "static" }], tags: ["notifications", "push"], tickets: ["NOTIF-100"], sourceOrder: 0,
      },
    }),
    // UNCHANGED
    makeTc("settings-profile", "Update profile settings", "passed", {
      durationMs: 185,
      tags: ["settings"],
      story: {
        scenario: "Update profile settings", suitePath: ["Settings"],
        steps: [{ keyword: "Given", text: "user on settings page" }, { keyword: "When", text: "they update their name" }, { keyword: "Then", text: "changes are saved" }],
        docs: [], tags: ["settings"], tickets: [], sourceOrder: 0,
      },
    }),
  ],
  startedAtMs: Date.now() - 15000,
  finishedAtMs: Date.now(),
  durationMs: 13000,
  projectRoot: "/app",
  runId: "current-run-002",
} as TestRunResult;

// ---------------------------------------------------------------------------
// Generate HTML files
// ---------------------------------------------------------------------------
const themes = getAvailableThemes();
const canonicalRun = canonicalizeRun(mainRun);
const diff = diffRuns(diffBaseline, diffCurrent);

for (const theme of themes) {
  // Main report
  const mainFormatter = new HtmlFormatter({
    theme,
    title: "E-Commerce Test Suite",
    syntaxHighlighting: false,
    mermaidEnabled: false,
    markdownEnabled: false,
  });
  writeFileSync(`${OUT}/main-${theme}.html`, mainFormatter.format(canonicalRun));

  // Diff report per theme
  const diffFormatter = new RunDiffHtmlFormatter({
    title: "Sprint 42 → Sprint 43 Comparison",
    theme,
  });
  writeFileSync(`${OUT}/diff-${theme}.html`, diffFormatter.format(diff));
}

console.log(`Generated ${themes.length} main reports + ${themes.length} diff reports in ${OUT}/`);
console.log("Themes:", themes.join(", "));
