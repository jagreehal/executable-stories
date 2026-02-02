/**
 * Comprehensive demonstration of ALL story configuration options in Playwright.
 *
 * Story options:
 * - tags: string[] - Story tags for filtering and categorization
 * - ticket: string | string[] - Ticket/issue references
 * - meta: Record<string, unknown> - Custom metadata
 */
import { story, given, when, then, doc } from "playwright-executable-stories";
import { expect } from "@playwright/test";

// ============================================================================
// Tags Option - Categorization and Filtering
// ============================================================================

story("Story with single tag", { tags: ["smoke"] }, () => {
  doc.note("Single tag for basic categorization");

  given("a tagged story", async () => {});
  when("tests are filtered", async () => {});
  then("this story matches the 'smoke' tag", async () => {
    expect(true).toBe(true);
  });
});

story("Story with multiple tags", { tags: ["smoke", "regression", "critical"] }, () => {
  doc.note("Multiple tags for flexible filtering");

  given("a story with multiple tags", async () => {});
  when("tests are filtered by any tag", async () => {});
  then("this story matches multiple filters", async () => {
    expect(true).toBe(true);
  });
});

story("Story with browser tags", { tags: ["chromium", "webkit", "firefox"] }, () => {
  doc.note("Tags can indicate browser compatibility");

  given("a story tagged by browser", async () => {});
  then("browser-specific filtering is possible", async () => {
    expect(true).toBe(true);
  });
});

// ============================================================================
// Ticket Option - Issue/Requirement Tracking
// ============================================================================

story("Story with single ticket", { ticket: "JIRA-123" }, () => {
  doc.note("Links story to a single issue tracker ticket");

  given("a story linked to JIRA-123", async () => {});
  when("documentation is generated", async () => {});
  then("ticket reference appears in docs", async () => {
    expect(true).toBe(true);
  });
});

story("Story with multiple tickets", { ticket: ["JIRA-123", "JIRA-456", "JIRA-789"] }, () => {
  doc.note("Story can be linked to multiple tickets");

  given("a story linked to multiple tickets", async () => {});
  when("requirements are tracked", async () => {});
  then("all ticket references are documented", async () => {
    expect(true).toBe(true);
  });
});

story("Story with different ticket formats", { ticket: ["JIRA-123", "GH-456", "BUG-789"] }, () => {
  doc.note("Different ticket systems can be referenced");

  given("tickets from JIRA, GitHub, and bug tracker", async () => {});
  then("all formats are supported", async () => {
    expect(true).toBe(true);
  });
});

// ============================================================================
// Meta Option - Custom Metadata
// ============================================================================

story(
  "Story with simple metadata",
  {
    meta: {
      priority: "high",
      owner: "team-backend",
    },
  },
  () => {
    doc.note("Custom metadata attached to story");

    given("a story with custom metadata", async () => {});
    then("metadata is available in reports", async () => {
      expect(true).toBe(true);
    });
  }
);

story(
  "Story with Playwright-specific metadata",
  {
    meta: {
      browsers: ["chromium", "webkit"],
      viewport: { width: 1920, height: 1080 },
      retries: 2,
      timeout: 30000,
      video: "on-first-retry",
      screenshot: "only-on-failure",
    },
  },
  () => {
    doc.note("Metadata can document Playwright-specific test configuration");

    given("Playwright metadata is specified", async () => {});
    when("tests are configured", async () => {});
    then("configuration is documented", async () => {
      expect(true).toBe(true);
    });
  }
);

story(
  "Story with complex metadata",
  {
    meta: {
      priority: "critical",
      owner: "team-frontend",
      sprint: 42,
      epic: "User Authentication",
      estimatedHours: 8,
      reviewers: ["alice", "bob", "charlie"],
      dependencies: ["auth-service", "user-service"],
      environments: {
        dev: true,
        staging: true,
        production: false,
      },
    },
  },
  () => {
    doc.note("Metadata can contain nested structures and arrays");

    given("a story with rich metadata", async () => {});
    when("reports are generated", async () => {});
    then("all metadata is preserved", async () => {
      expect(true).toBe(true);
    });
  }
);

// ============================================================================
// Combined Options - All Options Together
// ============================================================================

story(
  "Story with all options combined",
  {
    tags: ["smoke", "critical", "feature:checkout"],
    ticket: "PROJ-456",
    meta: {
      priority: "high",
      owner: "team-checkout",
      sprint: 15,
      complexity: "medium",
    },
  },
  () => {
    doc.note("All story options used together");

    given("a fully configured story", async () => {});
    when("documentation is generated", async () => {});
    then("all options appear in output", async () => {
      expect(true).toBe(true);
    });
  }
);

story(
  "Complete Playwright story configuration",
  {
    tags: ["e2e", "visual", "cross-browser", "feature:user-management"],
    ticket: ["EPIC-100", "STORY-201", "TASK-302"],
    meta: {
      // Project management
      priority: "high",
      owner: "qa-team",
      sprint: 23,
      points: 5,

      // Playwright configuration
      browsers: ["chromium", "webkit", "firefox"],
      projects: ["Desktop Chrome", "Mobile Safari"],
      parallel: true,
      workers: 4,

      // Test settings
      retries: 2,
      timeout: 60000,
      video: "retain-on-failure",
      screenshot: "on",
      trace: "on-first-retry",

      // Quality metrics
      testCoverage: {
        unit: 95,
        integration: 80,
        e2e: 60,
      },

      // Review and approval
      reviewers: ["senior-qa-1", "senior-qa-2"],
      approvedBy: "qa-lead",
      approvedDate: "2024-01-15",

      // Additional context
      notes: "This story covers cross-browser E2E tests for user management",
      relatedDocs: ["docs/e2e/user-management.md"],
    },
  },
  () => {
    doc.note("Comprehensive example with realistic Playwright metadata");
    doc.tag("documentation-example");

    given("complete story configuration", async () => {});
    when("documentation is generated", async () => {});
    then("rich metadata enables advanced reporting", async () => {
      expect(true).toBe(true);
    });
  }
);

// ============================================================================
// Story Options with doc.* Methods
// ============================================================================

story(
  "Story options combined with doc API",
  {
    tags: ["api", "comprehensive"],
    ticket: "DOC-789",
    meta: {
      owner: "docs-team",
    },
  },
  () => {
    // Story options provide structured metadata
    // doc.* methods provide additional documentation

    doc.note("Story options and doc API complement each other");
    doc.tag("additional-tag"); // Adds to options.tags
    doc.kv("Additional Key", "Additional Value");

    doc.table(
      "Options vs Doc API",
      ["Aspect", "Story Options", "Doc API"],
      [
        ["When Set", "Declaration time", "Anytime"],
        ["Structure", "Fixed schema", "Flexible"],
        ["Use Case", "Filtering/Reporting", "Rich docs"],
      ]
    );

    given("story with options and doc methods", async () => {});
    when("both are used", async () => {});
    then("they work together seamlessly", async () => {
      expect(true).toBe(true);
    });
  }
);

// ============================================================================
// Practical Examples
// ============================================================================

story(
  "Login feature - happy path",
  {
    tags: ["smoke", "auth", "login"],
    ticket: "AUTH-001",
    meta: {
      priority: "critical",
      automationStatus: "complete",
    },
  },
  () => {
    given("user is on login page", async () => {});
    when("user enters valid credentials", async () => {});
    then("user is logged in successfully", async () => {
      expect(true).toBe(true);
    });
  }
);

story(
  "Login feature - invalid password",
  {
    tags: ["regression", "auth", "login", "negative"],
    ticket: ["AUTH-001", "AUTH-015"],
    meta: {
      priority: "high",
      automationStatus: "complete",
      relatedTo: "Login feature - happy path",
    },
  },
  () => {
    given("user is on login page", async () => {});
    when("user enters invalid password", async () => {});
    then("error message is displayed", async () => {
      expect(true).toBe(true);
    });
  }
);

story(
  "Visual regression test",
  {
    tags: ["visual", "chromium-only"],
    ticket: "VIS-100",
    meta: {
      priority: "medium",
      snapshotDir: "snapshots/",
      updateSnapshots: false,
    },
  },
  () => {
    doc.note("Visual tests have specific configuration needs");

    given("page is loaded", async ({ page }) => {
      await page.setContent("<html><body><h1>Visual Test</h1></body></html>");
    });
    when("screenshot is compared", async () => {});
    then("no visual differences detected", async () => {
      expect(true).toBe(true);
    });
  }
);

// ============================================================================
// Empty and Minimal Options
// ============================================================================

story("Story with empty tags array", { tags: [] }, () => {
  given("story with empty tags", async () => {});
  then("story still works", async () => {
    expect(true).toBe(true);
  });
});

story("Story with empty meta object", { meta: {} }, () => {
  given("story with empty meta", async () => {});
  then("story still works", async () => {
    expect(true).toBe(true);
  });
});

story("Story with only tags", { tags: ["minimal"] }, () => {
  given("story with only tags option", async () => {});
  then("other options are optional", async () => {
    expect(true).toBe(true);
  });
});

story("Story with only ticket", { ticket: "MIN-001" }, () => {
  given("story with only ticket option", async () => {});
  then("other options are optional", async () => {
    expect(true).toBe(true);
  });
});

story("Story with only meta", { meta: { key: "value" } }, () => {
  given("story with only meta option", async () => {});
  then("other options are optional", async () => {
    expect(true).toBe(true);
  });
});
