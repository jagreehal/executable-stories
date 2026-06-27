/**
 * Kitchen-sink StoryReport fixture — every doc kind, every status, tickets, an
 * OTel trace, and inline attachments across multiple features. Used by the comprehensive
 * Report Storybook story (and tests) to exercise the full surface of the report
 * component in one view.
 */
import type { StoryReport, ReportSummary } from "executable-stories-core";

// 1×1 transparent PNG.
const PNG =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADElEQVR42mP8z8BQDwAFgwJ/lYd9KgAAAABJRU5ErkJggg==";

function summary(over: Partial<ReportSummary>): ReportSummary {
  return { total: 0, passed: 0, failed: 0, skipped: 0, pending: 0, durationMs: 0, ...over };
}

export function kitchenSinkReport(): StoryReport {
  return {
    schemaVersion: "1.0",
    runId: "run-kitchen-sink",
    startedAtMs: 1_717_000_000_000,
    finishedAtMs: 1_717_000_002_400,
    durationMs: 2400,
    projectRoot: "/repo",
    packageVersion: "1.4.0",
    gitSha: "a1b2c3d",
    ci: { name: "GitHub Actions", url: "https://github.com/acme/shop/actions/runs/42", branch: "feat/loyalty-cap", commitSha: "a1b2c3d", prNumber: "318" },
    coverage: { linesPct: 92.4, statementsPct: 91.1, functionsPct: 88.0, branchesPct: 79.5 },
    summary: summary({ total: 5, passed: 2, failed: 1, skipped: 1, pending: 1, durationMs: 2400 }),
    features: [
      {
        id: "feature-checkout",
        title: "Checkout",
        sourceFile: "src/checkout/checkout.story.test.ts",
        summary: summary({ total: 3, passed: 1, failed: 1, skipped: 1, durationMs: 1900 }),
        scenarios: [
          {
            id: "checkout-discount",
            title: "Checkout caps the loyalty discount at 30%",
            status: "passed",
            durationMs: 1240,
            sourceLine: 12,
            retry: 0,
            retries: 0,
            tags: ["checkout", "pricing", "smoke"],
            tickets: [
              { id: "SHOP-101", url: "https://jira.example.com/browse/SHOP-101" },
              { id: "SHOP-204" },
            ],
            covers: ["src/checkout/discount.ts"],
            steps: [
              {
                id: "s1",
                index: 0,
                keyword: "Given",
                text: 'a cart with 3 items totaling "$120.00"',
                status: "passed",
                durationMs: 120,
                docEntries: [{ phase: "static", kind: "note", text: "Seeded from the standard fixture cart." }],
              },
              {
                id: "s2",
                index: 1,
                keyword: "When",
                text: "a loyalty discount of 45% is applied",
                status: "passed",
                durationMs: 80,
                docEntries: [
                  { phase: "static", kind: "kv", label: "Requested discount", value: 0.45 },
                  {
                    phase: "static", kind: "code",
                    label: "Pricing call",
                    lang: "ts",
                    content: "const total = applyDiscount(cart, { loyalty: 0.45 });",
                  },
                ],
              },
              {
                id: "s3",
                index: 2,
                keyword: "Then",
                text: "the discount is capped at 30%",
                status: "passed",
                durationMs: 40,
                docEntries: [
                  {
                    phase: "static", kind: "table",
                    label: "Discount tiers",
                    columns: ["Requested", "Applied", "Saving"],
                    rows: [
                      ["20%", "20%", "$24.00"],
                      ["45%", "30%", "$36.00"],
                    ],
                  },
                ],
              },
            ],
            docEntries: [
              {
                phase: "static", kind: "section",
                title: "Why this rule exists",
                markdown:
                  "Loyalty stacking used to let a few accounts reach **negative totals**. The cap keeps margins safe — see the [pricing policy](https://example.com/policy).",
              },
              { phase: "static", kind: "tag", names: ["regression-guard", "finance-approved"] },
              { phase: "static", kind: "link", label: "Pricing policy", url: "https://example.com/policy" },
              {
                phase: "static", kind: "mermaid",
                title: "Discount pipeline",
                code: "flowchart LR\n  Cart --> Loyalty --> Cap[Cap at 30%] --> Total",
              },
            ],
            attachments: [{ name: "cart.png", mediaType: "image/png", body: PNG, contentEncoding: "BASE64" }],
            otelSpans: [
              { spanId: "a", name: "POST /checkout", startTimeMs: 0, durationMs: 1240, status: "ok" },
              { spanId: "b", parentSpanId: "a", name: "pricing.applyDiscount", startTimeMs: 120, durationMs: 80, status: "ok" },
              { spanId: "c", parentSpanId: "a", name: "db.cart.load", startTimeMs: 10, durationMs: 95, status: "ok" },
            ],
          },
          {
            id: "checkout-declined",
            title: "Checkout is blocked when the card is declined",
            status: "failed",
            durationMs: 610,
            sourceLine: 48,
            retry: 1,
            retries: 1,
            tags: ["checkout", "payments"],
            tickets: [{ id: "SHOP-318", url: "https://jira.example.com/browse/SHOP-318" }],
            errorMessage: "expected order to be undefined but received { id: 'ord_91' }",
            errorStack:
              "AssertionError: expected order to be undefined\n    at src/checkout/checkout.story.test.ts:61:24",
            steps: [
              { id: "f1", index: 0, keyword: "Given", text: "a customer whose card will be declined", status: "passed", durationMs: 90, docEntries: [] },
              { id: "f2", index: 1, keyword: "When", text: "they submit the order", status: "passed", durationMs: 200, docEntries: [] },
              {
                id: "f3",
                index: 2,
                keyword: "Then",
                text: "no order is created",
                status: "failed",
                durationMs: 60,
                errorMessage: "expected order to be undefined but received { id: 'ord_91' }",
                docEntries: [{ phase: "static", kind: "kv", label: "Gateway response", value: { code: "declined", retriable: false } }],
              },
            ],
            docEntries: [],
            attachments: [],
            otelSpans: [
              { spanId: "p", name: "POST /checkout", startTimeMs: 0, durationMs: 610, status: "error", statusMessage: "card declined" },
              { spanId: "q", parentSpanId: "p", name: "payments.charge", startTimeMs: 95, durationMs: 410, status: "error", statusMessage: "declined" },
            ],
          },
          {
            id: "checkout-giftwrap",
            title: "Gift wrapping is offered above the free-wrap threshold",
            status: "skipped",
            durationMs: 0,
            sourceLine: 90,
            retry: 0,
            retries: 0,
            tags: ["checkout", "wip"],
            steps: [
              { id: "k1", index: 0, keyword: "Given", text: "a cart above the threshold", status: "skipped", durationMs: 0, docEntries: [] },
            ],
            docEntries: [{ phase: "static", kind: "note", text: "Skipped until the gift-wrap service ships (SHOP-400)." }],
            attachments: [],
          },
        ],
      },
      {
        id: "feature-search",
        title: "Search",
        sourceFile: "src/search/search.story.test.ts",
        summary: summary({ total: 2, passed: 1, pending: 1, durationMs: 500 }),
        scenarios: [
          {
            id: "search-typo",
            title: "Search tolerates a single typo",
            status: "pending",
            durationMs: 0,
            sourceLine: 14,
            retry: 0,
            retries: 0,
            tags: ["search", "fuzzy"],
            steps: [
              { id: "p1", index: 0, keyword: "Given", text: "the catalogue is indexed", status: "pending", durationMs: 0, docEntries: [] },
            ],
            docEntries: [{ phase: "static", kind: "note", text: "Pending: fuzzy ranking is still being tuned." }],
            attachments: [],
          },
          {
            id: "search-media",
            title: "Search results render rich media and embeds",
            status: "passed",
            durationMs: 500,
            sourceLine: 52,
            retry: 0,
            retries: 0,
            tags: ["search", "ui"],
            tickets: [{ id: "SHOP-512" }],
            steps: [
              { id: "m1", index: 0, keyword: "Given", text: "a query that matches one product", status: "passed", durationMs: 120, docEntries: [] },
              { id: "m2", index: 1, keyword: "Then", text: "the result card renders", status: "passed", durationMs: 380, docEntries: [] },
            ],
            docEntries: [
              { phase: "static", kind: "screenshot", path: "screenshots/search-result.png", alt: "Search result card" },
              { phase: "static", kind: "video", path: "videos/search-demo.webm", caption: "Typing a query and selecting a result" },
              {
                phase: "static", kind: "html",
                title: "Embedded result card",
                height: 220,
                content:
                  "<div style=\"font-family:system-ui;padding:16px;border:1px solid #ddd;border-radius:8px\"><strong>Wireless Mouse</strong><br/>$29.99 — in stock</div>",
              },
              { phase: "static", kind: "custom", type: "ranking-debug", data: { query: "wireles mouse", topScore: 0.94, corrected: "wireless mouse" } },
            ],
            attachments: [{ name: "result.png", mediaType: "image/png", body: PNG, contentEncoding: "BASE64" }],
          },
        ],
      },
    ],
  };
}
