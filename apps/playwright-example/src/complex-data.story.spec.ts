/**
 * Comprehensive demonstration of complex data structures in documentation (Playwright).
 *
 * Patterns covered:
 * - Nested JSON objects
 * - Large tables
 * - Multiple code formats (SQL, YAML, bash, etc.)
 * - Mermaid diagrams (various types)
 * - Complex metadata structures
 * - Page-captured data
 */
import { story, given, when, then, doc } from "playwright-executable-stories";
import { expect } from "@playwright/test";

// ============================================================================
// Nested JSON Objects
// ============================================================================

story("Deeply nested JSON structures", () => {
  doc.note("Demonstrating complex nested JSON in documentation");

  doc.json("Playwright Configuration", {
    testDir: "./tests",
    fullyParallel: true,
    forbidOnly: true,
    retries: 2,
    workers: 4,
    reporter: [
      ["html", { outputFolder: "playwright-report" }],
      ["list"],
    ],
    use: {
      baseURL: "http://localhost:3000",
      trace: "on-first-retry",
      screenshot: "only-on-failure",
      video: "retain-on-failure",
      viewport: { width: 1920, height: 1080 },
      headless: true,
    },
    projects: [
      {
        name: "chromium",
        use: { browserName: "chromium" },
      },
      {
        name: "firefox",
        use: { browserName: "firefox" },
      },
      {
        name: "webkit",
        use: { browserName: "webkit" },
      },
      {
        name: "Mobile Safari",
        use: {
          browserName: "webkit",
          viewport: { width: 390, height: 844 },
        },
      },
    ],
  });

  given("complex configuration is loaded", async () => {});
  then("nested structures are documented", async () => {
    expect(true).toBe(true);
  });
});

story("Arrays of complex objects", () => {
  doc.note("Documenting arrays with complex nested structures");

  doc.json("Test Results", [
    {
      spec: "login.spec.ts",
      tests: [
        {
          title: "should login with valid credentials",
          status: "passed",
          duration: 1234,
          browsers: ["chromium", "firefox", "webkit"],
          retries: 0,
          screenshots: [],
        },
        {
          title: "should show error for invalid password",
          status: "passed",
          duration: 987,
          browsers: ["chromium"],
          retries: 1,
          screenshots: ["error-state.png"],
        },
      ],
      totalDuration: 2221,
    },
    {
      spec: "checkout.spec.ts",
      tests: [
        {
          title: "should complete purchase",
          status: "flaky",
          duration: 5432,
          browsers: ["chromium"],
          retries: 2,
          screenshots: ["checkout-1.png", "checkout-2.png"],
        },
      ],
      totalDuration: 5432,
    },
  ]);

  given("test results are loaded", async () => {});
  then("complex arrays are documented", async () => {
    expect(true).toBe(true);
  });
});

// ============================================================================
// Large Tables
// ============================================================================

story("Large data tables", () => {
  doc.note("Tables with many rows and columns");

  doc.table(
    "Playwright Locator Methods",
    ["Method", "Description", "Example", "Best For"],
    [
      ["getByRole", "Accessible role", "getByRole('button')", "Buttons, links"],
      ["getByText", "Text content", "getByText('Submit')", "Visible text"],
      ["getByLabel", "Form labels", "getByLabel('Email')", "Form inputs"],
      ["getByPlaceholder", "Placeholder", "getByPlaceholder('Search')", "Search inputs"],
      ["getByAltText", "Image alt", "getByAltText('Logo')", "Images"],
      ["getByTitle", "Title attribute", "getByTitle('Close')", "Icons"],
      ["getByTestId", "data-testid", "getByTestId('submit-btn')", "Test automation"],
      ["locator", "CSS/XPath", "locator('.class')", "Complex selectors"],
    ]
  );

  doc.table(
    "Browser Comparison Matrix",
    ["Feature", "Chromium", "Firefox", "WebKit"],
    [
      ["Speed", "Fast", "Fast", "Fastest (macOS)"],
      ["DevTools", "Full", "Full", "Limited"],
      ["Mobile Emulation", "Yes", "Yes", "Yes"],
      ["PDF Generation", "Yes", "No", "No"],
      ["Network Interception", "Yes", "Yes", "Yes"],
      ["Geolocation", "Yes", "Yes", "Yes"],
      ["Permissions", "Yes", "Yes", "Yes"],
      ["Downloads", "Yes", "Yes", "Yes"],
    ]
  );

  given("browser feature matrix is needed", async () => {});
  then("large tables provide comprehensive reference", async () => {
    expect(true).toBe(true);
  });
});

// ============================================================================
// Multiple Code Formats
// ============================================================================

story("Playwright test code examples", () => {
  doc.note("Playwright test patterns in documentation");

  doc.code(
    "Page Object Pattern",
    `import { type Page, type Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel('Email');
    this.passwordInput = page.getByLabel('Password');
    this.submitButton = page.getByRole('button', { name: 'Sign in' });
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}`,
    "typescript"
  );

  doc.code(
    "API Mocking Example",
    `import { test, expect } from '@playwright/test';

test('mocked API response', async ({ page }) => {
  await page.route('**/api/users', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{ id: 1, name: 'Mock User' }]),
    });
  });

  await page.goto('/users');
  await expect(page.getByText('Mock User')).toBeVisible();
});`,
    "typescript"
  );

  given("Playwright code examples are documented", async () => {});
  then("TypeScript syntax is highlighted", async () => {
    expect(true).toBe(true);
  });
});

story("YAML configuration examples", () => {
  doc.note("YAML configuration files in documentation");

  doc.code(
    "GitHub Actions Playwright CI",
    `name: Playwright Tests
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright Browsers
        run: npx playwright install --with-deps

      - name: Run Playwright tests
        run: npx playwright test

      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30`,
    "yaml"
  );

  given("CI/CD configs are documented", async () => {});
  then("YAML syntax is highlighted", async () => {
    expect(true).toBe(true);
  });
});

story("Shell script examples", () => {
  doc.note("Bash scripts for Playwright in documentation");

  doc.code(
    "Playwright Setup Script",
    `#!/bin/bash
set -euo pipefail

echo "Setting up Playwright..."

# Install dependencies
npm ci

# Install browsers
npx playwright install chromium firefox webkit

# Install system dependencies (Linux)
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
  npx playwright install-deps
fi

# Run tests with retries
npx playwright test --retries=2

# Generate report
npx playwright show-report`,
    "bash"
  );

  given("shell scripts are documented", async () => {});
  then("bash syntax is highlighted", async () => {
    expect(true).toBe(true);
  });
});

// ============================================================================
// Mermaid Diagrams
// ============================================================================

story("Various Mermaid diagram types", () => {
  doc.note("Different types of Mermaid diagrams");

  doc.mermaid(
    `flowchart TD
    subgraph Test["Test Execution"]
        A[Start Test] --> B{Page Load OK?}
        B -->|Yes| C[Run Actions]
        B -->|No| D[Retry]
        D --> B
        C --> E{Assertions Pass?}
        E -->|Yes| F[Pass]
        E -->|No| G{Retries Left?}
        G -->|Yes| D
        G -->|No| H[Fail]
    end

    subgraph Report["Reporting"]
        F --> I[Generate Report]
        H --> I
        I --> J[Upload Artifacts]
    end`,
    "Playwright Test Flow"
  );

  doc.mermaid(
    `sequenceDiagram
    participant T as Test
    participant B as Browser
    participant P as Page
    participant N as Network

    T->>B: Launch Browser
    B->>P: New Page
    T->>N: Setup Route Mock
    T->>P: page.goto(url)
    P->>N: HTTP Request
    N-->>P: Mocked Response
    P-->>T: Page Ready
    T->>P: page.click(selector)
    P-->>T: Click Complete
    T->>P: expect(locator)
    P-->>T: Assertion Pass`,
    "Test Interaction Sequence"
  );

  doc.mermaid(
    `stateDiagram-v2
    [*] --> Idle

    Idle --> Running: test.start()
    Running --> Passed: assertions.pass()
    Running --> Failed: assertion.fail()
    Running --> Timedout: timeout.exceeded()

    Failed --> Retrying: retries.remaining()
    Timedout --> Retrying: retries.remaining()

    Retrying --> Running: retry.start()
    Retrying --> Failed: retries.exhausted()

    Passed --> [*]
    Failed --> [*]`,
    "Test Lifecycle State Machine"
  );

  doc.mermaid(
    `pie title Test Distribution by Browser
    "Chromium" : 45
    "Firefox" : 30
    "WebKit" : 20
    "Mobile" : 5`,
    "Browser Test Coverage"
  );

  given("various diagram types are documented", async () => {});
  then("all Mermaid diagram types render", async () => {
    expect(true).toBe(true);
  });
});

// ============================================================================
// Complex Metadata with Story Options
// ============================================================================

story(
  "Story with complex metadata structure",
  {
    tags: ["comprehensive", "documentation", "complex-data"],
    ticket: ["DOCS-001", "TECH-456"],
    meta: {
      complexity: "high",
      estimatedReviewTime: "30min",
      browsers: ["chromium", "webkit", "firefox"],
      dataFormats: ["json", "typescript", "yaml", "bash", "mermaid"],
      coverage: {
        nestedJson: true,
        largeTables: true,
        codeBlocks: true,
        diagrams: true,
      },
      reviewers: ["tech-writer", "senior-qa"],
      lastUpdated: "2024-01-15",
    },
  },
  () => {
    doc.note("This story demonstrates complex metadata in story options");

    given("story has rich metadata", async () => {});
    when("documentation is generated", async () => {});
    then("metadata is preserved in output", async () => {
      expect(true).toBe(true);
    });
  }
);

// ============================================================================
// Page-Captured Data
// ============================================================================

story("Capturing and documenting page data", () => {
  doc.note("Documenting data extracted from page interactions");

  given("a page with structured content", async ({ page }) => {
    await page.setContent(`
      <html>
        <body>
          <table id="data-table">
            <thead><tr><th>Name</th><th>Value</th></tr></thead>
            <tbody>
              <tr><td>Item 1</td><td>100</td></tr>
              <tr><td>Item 2</td><td>200</td></tr>
              <tr><td>Item 3</td><td>300</td></tr>
            </tbody>
          </table>
        </body>
      </html>
    `);
  });

  when("data is extracted from page", async ({ page }) => {
    const data = await page.$$eval("#data-table tbody tr", (rows) =>
      rows.map((row) => {
        const cells = row.querySelectorAll("td");
        return { name: cells[0]?.textContent, value: cells[1]?.textContent };
      })
    );
    doc.runtime.json("Extracted Table Data", data);
  });

  then("extracted data is documented", async () => {
    expect(true).toBe(true);
  });
});

// ============================================================================
// Combined Complex Documentation
// ============================================================================

story("All complex data types in one story", () => {
  doc.note("Comprehensive example combining all complex data documentation");
  doc.tag(["comprehensive", "all-in-one"]);

  // Key-value pairs
  doc.kv("Documentation Version", "2.0");
  doc.kv("Last Updated", new Date().toISOString());
  doc.kv("Completeness", "100%");

  // Link
  doc.link("Playwright Docs", "https://playwright.dev");

  // Nested JSON
  doc.json("Sample Test Config", {
    testDir: "./tests",
    use: {
      baseURL: "http://localhost:3000",
      screenshot: "on",
    },
    projects: [{ name: "chromium" }],
  });

  // Table
  doc.table(
    "Quick Reference",
    ["Type", "Example", "Support"],
    [
      ["JSON", "Nested objects", "Full"],
      ["Tables", "Multi-column", "Full"],
      ["Code", "Multiple langs", "Full"],
      ["Diagrams", "Mermaid", "Full"],
      ["Screenshots", "page.screenshot()", "Playwright"],
    ]
  );

  // Code
  doc.code(
    "Quick Start",
    `import { test, expect } from '@playwright/test';

test('my test', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Home/);
});`,
    "typescript"
  );

  // Mermaid
  doc.mermaid(
    `graph LR
    A[Test] --> B[Page]
    B --> C[Assert]
    C --> D[Report]`,
    "Simple Flow"
  );

  // Section
  doc.section(
    "Additional Notes",
    `This story demonstrates:
- Nested JSON structures
- Large tables
- Multiple code formats
- Various Mermaid diagrams
- Complex metadata
- Playwright-specific features`
  );

  given("all documentation types are used", async () => {});
  then("comprehensive documentation is generated", async () => {
    expect(true).toBe(true);
  });
});
