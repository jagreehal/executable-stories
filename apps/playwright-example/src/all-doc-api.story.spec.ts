/**
 * Comprehensive demonstration of ALL doc API methods available in Playwright.
 *
 * Doc API methods:
 * - doc.note(text) - Add notes
 * - doc.tag(...tags) - Add tags
 * - doc.kv(key, value) - Key-value pairs
 * - doc.code(label, content, lang) - Code blocks
 * - doc.json(label, value) - JSON objects
 * - doc.table(label, columns, rows) - Tables
 * - doc.link(label, url) - Links
 * - doc.section(title, markdown) - Sections
 * - doc.mermaid(label, content) - Mermaid diagrams
 * - doc.screenshot(label, buffer) - Screenshots (Playwright-specific!)
 * - doc.custom(type, data) - Custom content
 * - doc.runtime.* - Runtime-only doc methods
 */
import { story, given, when, then, doc } from "playwright-executable-stories";
import { expect } from "@playwright/test";

// ============================================================================
// doc.note() - Add free-text notes
// ============================================================================

story("doc.note() demonstration", () => {
  doc.note("This is a simple note about the story");
  doc.note("Notes can span multiple lines\nand include line breaks");

  given("a precondition with a note", async () => {});

  doc.note("Notes can appear between steps");

  when("an action occurs", async () => {});

  doc.note("Final note before assertion");

  then("verification passes", async () => {
    expect(true).toBe(true);
  });
});

// ============================================================================
// doc.tag() - Add tags for categorization
// ============================================================================

story("doc.tag() demonstration", () => {
  // Single tag
  doc.tag("smoke");

  // Multiple tags via array
  doc.tag(["regression", "critical"]);

  // Multiple calls add more tags
  doc.tag("api");
  doc.tag(["integration", "v2"]);

  given("tags are added", async () => {});

  then("story has multiple tags for filtering", async () => {
    expect(true).toBe(true);
  });
});

// ============================================================================
// doc.kv() - Add key-value pairs
// ============================================================================

story("doc.kv() demonstration", () => {
  doc.kv("Environment", "test");
  doc.kv("Version", "1.0.0");
  doc.kv("Author", "Test Team");
  doc.kv("Priority", "high");
  doc.kv("Numeric Value", 42);
  doc.kv("Boolean Value", true);

  given("key-value pairs are defined", async () => {});

  doc.kv("Step-specific Key", "value after step");

  then("all key-value pairs appear in documentation", async () => {
    expect(true).toBe(true);
  });
});

// ============================================================================
// doc.code() - Add code blocks with syntax highlighting
// ============================================================================

story("doc.code() demonstration", () => {
  doc.code(
    "TypeScript Example",
    `const greeting: string = "Hello, World!";
console.log(greeting);

function add(a: number, b: number): number {
  return a + b;
}`,
    "typescript"
  );

  doc.code(
    "JavaScript Example",
    `const data = { name: "test", value: 42 };
console.log(JSON.stringify(data));`,
    "javascript"
  );

  doc.code(
    "Playwright Example",
    `import { test, expect } from '@playwright/test';

test('my test', async ({ page }) => {
  await page.goto('https://example.com');
  await expect(page).toHaveTitle(/Example/);
});`,
    "typescript"
  );

  given("code blocks with different languages", async () => {});

  then("code is syntax highlighted in docs", async () => {
    expect(true).toBe(true);
  });
});

// ============================================================================
// doc.json() - Add JSON code blocks
// ============================================================================

story("doc.json() demonstration", () => {
  doc.json("Simple Object", {
    name: "test",
    value: 42,
    active: true,
  });

  doc.json("Playwright Config Snippet", {
    testDir: "./tests",
    fullyParallel: true,
    reporter: [["html"], ["list"]],
    use: {
      baseURL: "http://localhost:3000",
      screenshot: "only-on-failure",
      video: "retain-on-failure",
    },
  });

  given("JSON objects are documented", async () => {});

  then("JSON is formatted and displayed", async () => {
    expect(true).toBe(true);
  });
});

// ============================================================================
// doc.table() - Add markdown tables
// ============================================================================

story("doc.table() demonstration", () => {
  doc.table(
    "Browser Support Matrix",
    ["Browser", "Version", "Status", "Notes"],
    [
      ["Chromium", "Latest", "Supported", "Primary"],
      ["Firefox", "Latest", "Supported", "Full support"],
      ["WebKit", "Latest", "Supported", "Safari engine"],
      ["Edge", "Latest", "Supported", "Chromium-based"],
    ]
  );

  doc.table(
    "Test Results Summary",
    ["Test Suite", "Passed", "Failed", "Skipped"],
    [
      ["Unit Tests", "45", "0", "2"],
      ["E2E Tests", "23", "1", "3"],
      ["Visual Tests", "15", "0", "0"],
    ]
  );

  given("tables are defined", async () => {});

  then("tables render as markdown", async () => {
    expect(true).toBe(true);
  });
});

// ============================================================================
// doc.link() - Add hyperlinks
// ============================================================================

story("doc.link() demonstration", () => {
  doc.link("Playwright Documentation", "https://playwright.dev/docs/intro");
  doc.link("Test Report", "https://example.com/reports/latest");
  doc.link("Issue Tracker", "https://github.com/example/project/issues");
  doc.link("CI/CD Pipeline", "https://ci.example.com/pipeline/123");

  given("links to external resources", async () => {});

  then("links are clickable in docs", async () => {
    expect(true).toBe(true);
  });
});

// ============================================================================
// doc.section() - Add titled sections with markdown
// ============================================================================

story("doc.section() demonstration", () => {
  doc.section(
    "Test Environment Setup",
    `Before running Playwright tests, ensure:

- Node.js 18+ is installed
- Browsers are installed: \`npx playwright install\`
- Base URL is configured

\`\`\`bash
npx playwright test
\`\`\``
  );

  doc.section(
    "Expected Behavior",
    `The page should:

1. Load within 3 seconds
2. Display the correct title
3. Show main navigation

> **Note:** Visual regression tests run separately.`
  );

  given("sections with rich markdown", async () => {});

  then("sections appear as collapsible or titled blocks", async () => {
    expect(true).toBe(true);
  });
});

// ============================================================================
// doc.mermaid() - Add Mermaid diagrams
// ============================================================================

story("doc.mermaid() demonstration", () => {
  doc.mermaid(
    `graph TD
    A[Start Test] --> B{Page Loaded?}
    B -->|Yes| C[Run Assertions]
    B -->|No| D[Timeout Error]
    C --> E[Take Screenshot]
    E --> F[End Test]
    D --> F`,
    "Test Flow Diagram"
  );

  doc.mermaid(
    `sequenceDiagram
    participant T as Test
    participant B as Browser
    participant S as Server

    T->>B: page.goto(url)
    B->>S: HTTP Request
    S-->>B: HTML Response
    B-->>T: Page Loaded
    T->>B: click(selector)
    B->>S: Form Submit
    S-->>B: Response
    T->>B: expect(locator)`,
    "Page Interaction Sequence"
  );

  given("mermaid diagrams are defined", async () => {});

  then("diagrams render in documentation", async () => {
    expect(true).toBe(true);
  });
});

// ============================================================================
// doc.screenshot() - Add screenshot references (Playwright-specific!)
// ============================================================================

story("doc.screenshot() demonstration", () => {
  doc.note("Playwright can capture and document screenshots");

  doc.screenshot("../screenshots/login-page.png", "Login page screenshot");
  doc.screenshot("../screenshots/dashboard.png", "Dashboard after login");

  given("screenshot paths are recorded", async () => {});

  then("screenshots appear in documentation", async () => {
    expect(true).toBe(true);
  });
});

story("Runtime screenshot capture", () => {
  doc.note("Screenshots can be captured at runtime with page.screenshot()");

  given("a page is loaded", async ({ page }) => {
    await page.setContent("<html><body><h1>Test Page</h1></body></html>");
  });

  when("screenshot is captured", async ({ page }) => {
    // Capture screenshot and document it
    await page.screenshot({ path: "screenshots/test-capture.png" });
    doc.runtime.screenshot("../screenshots/test-capture.png", "Captured during test");
  });

  then("screenshot is in the report", async () => {
    expect(true).toBe(true);
  });
});

// ============================================================================
// doc.custom() - Add custom content types
// ============================================================================

story("doc.custom() demonstration", () => {
  doc.custom("trace", {
    name: "Full trace",
    path: "test-results/trace.zip",
    browser: "chromium",
  });

  doc.custom("video", {
    name: "Test recording",
    path: "test-results/video.webm",
    duration: "15s",
  });

  doc.custom("metric", {
    name: "Page Load Time",
    value: 1234,
    unit: "ms",
  });

  given("custom content types are added", async () => {});

  then("custom renderers can process them", async () => {
    expect(true).toBe(true);
  });
});

// ============================================================================
// doc.runtime.* - Runtime documentation (inside step callbacks)
// ============================================================================

story("doc.runtime.* demonstration", () => {
  doc.note("Static doc added at registration time");

  given("setup with runtime values", async ({ page: _page }) => {
    const timestamp = Date.now();
    doc.runtime.kv("Timestamp", timestamp);
    doc.runtime.note(`Test started at ${new Date(timestamp).toISOString()}`);
    doc.runtime.kv("Browser", "chromium");
  });

  when("page produces runtime data", async ({ page }) => {
    await page.setContent("<html><body><h1>Test</h1></body></html>");
    const title = await page.title();
    doc.runtime.kv("Page Title", title);
    doc.runtime.json("Page Info", { title, url: page.url() });
  });

  then("runtime values appear in docs", async () => {
    doc.runtime.kv("Final Check", "passed");
    doc.runtime.tag(["runtime", "dynamic"]);
    expect(true).toBe(true);
  });
});

// ============================================================================
// Complete Example - All doc APIs together
// ============================================================================

story("Complete doc API demonstration", () => {
  // Story-level documentation
  doc.note("This story demonstrates all doc API methods in one place");
  doc.tag(["comprehensive", "documentation", "example"]);
  doc.kv("Author", "Documentation Team");
  doc.kv("Version", "2.0");
  doc.link("Full Documentation", "https://example.com/docs/complete");

  given("all documentation methods are available", async ({ page }) => {
    doc.runtime.note("Step-level runtime documentation");
    doc.runtime.kv("Browser Available", !!page);
  });

  doc.json("Test Configuration", {
    environment: "test",
    features: ["all"],
    browser: "chromium",
  });

  when("documentation is generated", async () => {
    doc.runtime.kv("Generated At", new Date().toISOString());
  });

  doc.table(
    "API Coverage",
    ["Method", "Supported", "Playwright-specific"],
    [
      ["note()", "Yes", "No"],
      ["tag()", "Yes", "No"],
      ["kv()", "Yes", "No"],
      ["code()", "Yes", "No"],
      ["json()", "Yes", "No"],
      ["table()", "Yes", "No"],
      ["link()", "Yes", "No"],
      ["section()", "Yes", "No"],
      ["mermaid()", "Yes", "No"],
      ["screenshot()", "Yes", "Yes - with page.screenshot()"],
      ["custom()", "Yes", "No"],
      ["runtime.*", "Yes", "No"],
    ]
  );

  doc.mermaid(
    `graph LR
    A[Doc API] --> B[Static Docs]
    A --> C[Runtime Docs]
    B --> D[Generated MD]
    C --> D
    E[Screenshots] --> D`,
    "Documentation Flow"
  );

  then("all methods produce rich documentation", async () => {
    expect(true).toBe(true);
  });
});
