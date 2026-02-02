/**
 * Comprehensive demonstration of ALL doc API methods available in Vitest.
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
 * - doc.screenshot(label, buffer) - Screenshots
 * - doc.custom(type, data) - Custom content
 * - doc.runtime.* - Runtime-only doc methods
 */
import { story, type StepsApi } from "vitest-executable-stories";
import { given, when, doc, step } from "vitest-executable-stories";
import { expect } from "vitest";

// Note: 'then' is not exported directly due to conflict with Promise.then
const { then } = step;

// ============================================================================
// doc.note() - Add free-text notes
// ============================================================================

story("doc.note() demonstration", () => {
  doc.note("This is a simple note about the story");
  doc.note("Notes can span multiple lines\nand include line breaks");

  given("a precondition with a note", () => {});

  doc.note("Notes can appear between steps");

  when("an action occurs", () => {});

  doc.note("Final note before assertion");

  then("verification passes", () => {
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

  given("tags are added", () => {});

  then("story has multiple tags for filtering", () => {
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

  given("key-value pairs are defined", () => {});

  doc.kv("Step-specific Key", "value after step");

  then("all key-value pairs appear in documentation", () => {
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
    "SQL Query",
    `SELECT users.name, orders.total
FROM users
INNER JOIN orders ON users.id = orders.user_id
WHERE orders.total > 100
ORDER BY orders.total DESC;`,
    "sql"
  );

  doc.code(
    "Shell Command",
    `#!/bin/bash
npm install
npm run build
npm test`,
    "bash"
  );

  given("code blocks with different languages", () => {});

  then("code is syntax highlighted in docs", () => {
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

  doc.json("Nested Configuration", {
    database: {
      host: "localhost",
      port: 5432,
      credentials: {
        username: "admin",
        password: "****",
      },
    },
    features: ["auth", "cache", "logging"],
    settings: {
      maxConnections: 100,
      timeout: 30000,
    },
  });

  doc.json("Array of Items", [
    { id: 1, name: "Item 1" },
    { id: 2, name: "Item 2" },
    { id: 3, name: "Item 3" },
  ]);

  given("JSON objects are documented", () => {});

  then("JSON is formatted and displayed", () => {
    expect(true).toBe(true);
  });
});

// ============================================================================
// doc.table() - Add markdown tables
// ============================================================================

story("doc.table() demonstration", () => {
  doc.table(
    "Test Results Summary",
    ["Test Suite", "Status", "Duration", "Coverage"],
    [
      ["Unit Tests", "Passed", "2.3s", "95%"],
      ["Integration Tests", "Passed", "5.1s", "87%"],
      ["E2E Tests", "Failed", "12.4s", "72%"],
      ["Performance Tests", "Skipped", "-", "-"],
    ]
  );

  doc.table(
    "Feature Matrix",
    ["Feature", "Chrome", "Firefox", "Safari"],
    [
      ["WebGL", "Yes", "Yes", "Partial"],
      ["WebRTC", "Yes", "Yes", "Yes"],
      ["Service Workers", "Yes", "Yes", "Yes"],
    ]
  );

  given("tables are defined", () => {});

  then("tables render as markdown", () => {
    expect(true).toBe(true);
  });
});

// ============================================================================
// doc.link() - Add hyperlinks
// ============================================================================

story("doc.link() demonstration", () => {
  doc.link("Project Documentation", "https://example.com/docs");
  doc.link("API Reference", "https://example.com/api");
  doc.link("Issue Tracker", "https://github.com/example/project/issues");
  doc.link("CI/CD Pipeline", "https://ci.example.com/pipeline/123");

  given("links to external resources", () => {});

  then("links are clickable in docs", () => {
    expect(true).toBe(true);
  });
});

// ============================================================================
// doc.section() - Add titled sections with markdown
// ============================================================================

story("doc.section() demonstration", () => {
  doc.section(
    "Prerequisites",
    `Before running this test, ensure:

- Node.js 18+ is installed
- Database is running
- Environment variables are set

\`\`\`bash
export API_KEY=your-key-here
\`\`\``
  );

  doc.section(
    "Expected Behavior",
    `The system should:

1. Validate user input
2. Process the request
3. Return appropriate response

> **Note:** Error handling is tested separately.`
  );

  given("sections with rich markdown", () => {});

  then("sections appear as collapsible or titled blocks", () => {
    expect(true).toBe(true);
  });
});

// ============================================================================
// doc.mermaid() - Add Mermaid diagrams
// ============================================================================

story("doc.mermaid() demonstration", () => {
  doc.mermaid(
    `graph TD
    A[Start] --> B{Is Valid?}
    B -->|Yes| C[Process]
    B -->|No| D[Error]
    C --> E[End]
    D --> E`,
    "Flow Diagram"
  );

  doc.mermaid(
    `sequenceDiagram
    participant U as User
    participant A as API
    participant D as Database

    U->>A: POST /login
    A->>D: Query user
    D-->>A: User data
    A-->>U: JWT token`,
    "Sequence Diagram"
  );

  doc.mermaid(
    `erDiagram
    USER ||--o{ ORDER : places
    ORDER ||--|{ LINE_ITEM : contains
    PRODUCT ||--o{ LINE_ITEM : "ordered in"`,
    "Entity Relationship"
  );

  given("mermaid diagrams are defined", () => {});

  then("diagrams render in documentation", () => {
    expect(true).toBe(true);
  });
});

// ============================================================================
// doc.screenshot() - Add screenshot references
// ============================================================================

story("doc.screenshot() demonstration", () => {
  // Note: In Vitest, screenshots are typically file paths rather than buffers
  doc.screenshot("../screenshots/login-page.png", "Login page screenshot");
  doc.screenshot("../screenshots/dashboard.png", "Dashboard after login");

  given("screenshot paths are recorded", () => {});

  then("screenshots appear in documentation", () => {
    expect(true).toBe(true);
  });
});

// ============================================================================
// doc.custom() - Add custom content types
// ============================================================================

story("doc.custom() demonstration", () => {
  doc.custom("chart", {
    type: "bar",
    data: [10, 20, 30, 40],
    labels: ["Q1", "Q2", "Q3", "Q4"],
  });

  doc.custom("metric", {
    name: "Response Time",
    value: 145,
    unit: "ms",
    threshold: 200,
  });

  doc.custom("badge", {
    label: "Coverage",
    value: "95%",
    color: "green",
  });

  given("custom content types are added", () => {});

  then("custom renderers can process them", () => {
    expect(true).toBe(true);
  });
});

// ============================================================================
// doc.runtime.* - Runtime documentation (inside step callbacks)
// NOTE: In Vitest, doc.runtime.* requires using the callback pattern
// ============================================================================

story("doc.runtime.* demonstration", (s) => {
  s.doc.note("Static doc added at registration time");

  s.given("setup with runtime values", () => {
    const timestamp = Date.now();
    s.doc.runtime.kv("Timestamp", timestamp);
    s.doc.runtime.note(`Test started at ${new Date(timestamp).toISOString()}`);
  });

  s.when("action produces runtime data", () => {
    const result = { success: true, count: 42 };
    s.doc.runtime.json("Action Result", result);
    s.doc.runtime.code(
      "Generated Code",
      `const result = ${JSON.stringify(result)};`,
      "javascript"
    );
  });

  s.then("runtime values appear in docs", () => {
    const metrics = { assertions: 3, duration: 15 };
    s.doc.runtime.kv("Assertions", metrics.assertions);
    s.doc.runtime.kv("Duration (ms)", metrics.duration);
    s.doc.runtime.tag(["runtime", "dynamic"]);
    expect(true).toBe(true);
  });
});

// ============================================================================
// Using callback parameter for doc (Vitest-specific)
// ============================================================================

story("doc via callback parameter", (stepsApi: StepsApi) => {
  const { given: gv, when: wh, then: th, doc: stepDoc } = stepsApi;
  stepDoc.note("Using doc from callback parameter");
  stepDoc.tag("callback-pattern");

  gv("setup via callback", () => {});

  stepDoc.kv("Pattern", "callback");

  wh("action via callback", () => {
    stepDoc.runtime.kv("Runtime via callback", "value");
  });

  th("assertion via callback", () => {
    expect(true).toBe(true);
  });
});

// ============================================================================
// Complete Example - All doc APIs together
// NOTE: Using callback pattern for doc.runtime.* support
// ============================================================================

story("Complete doc API demonstration", (s) => {
  // Story-level documentation
  s.doc.note("This story demonstrates all doc API methods in one place");
  s.doc.tag(["comprehensive", "documentation", "example"]);
  s.doc.kv("Author", "Documentation Team");
  s.doc.kv("Version", "2.0");
  s.doc.link("Full Documentation", "https://example.com/docs/complete");

  s.given("all documentation methods are available", () => {
    // Note: doc.runtime.* only available inside step callbacks when using callback pattern
  });

  s.doc.json("Test Configuration", {
    environment: "test",
    features: ["all"],
  });

  s.when("documentation is generated", () => {
    // Runtime docs captured during step execution
  });

  doc.table(
    "API Coverage",
    ["Method", "Supported", "Example"],
    [
      ["note()", "Yes", "Free text notes"],
      ["tag()", "Yes", "Categorization"],
      ["kv()", "Yes", "Key-value pairs"],
      ["code()", "Yes", "Syntax highlighted code"],
      ["json()", "Yes", "JSON objects"],
      ["table()", "Yes", "Markdown tables"],
      ["link()", "Yes", "Hyperlinks"],
      ["section()", "Yes", "Markdown sections"],
      ["mermaid()", "Yes", "Diagrams"],
      ["screenshot()", "Yes", "Images"],
      ["custom()", "Yes", "Custom types"],
      ["runtime.*", "Yes", "Runtime values"],
    ]
  );

  s.doc.mermaid(
    `graph LR
    A[Doc API] --> B[Static Docs]
    A --> C[Runtime Docs]
    B --> D[Generated MD]
    C --> D`,
    "Documentation Flow"
  );

  s.then("all methods produce rich documentation", () => {
    expect(true).toBe(true);
  });
});
