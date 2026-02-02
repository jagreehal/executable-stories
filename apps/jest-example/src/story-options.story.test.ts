/**
 * Comprehensive demonstration of ALL story configuration options.
 *
 * Story options:
 * - tags: string[] - Story tags for filtering and categorization
 * - ticket: string | string[] - Ticket/issue references
 * - meta: Record<string, unknown> - Custom metadata
 */
import { story, given, when, then, doc } from "jest-executable-stories";

// ============================================================================
// Tags Option - Categorization and Filtering
// ============================================================================

story("Story with single tag", { tags: ["smoke"] }, () => {
  doc.note("Single tag for basic categorization");

  given("a tagged story", () => {});
  when("tests are filtered", () => {});
  then("this story matches the 'smoke' tag", () => {
    expect(true).toBe(true);
  });
});

story("Story with multiple tags", { tags: ["smoke", "regression", "critical"] }, () => {
  doc.note("Multiple tags for flexible filtering");

  given("a story with multiple tags", () => {});
  when("tests are filtered by any tag", () => {});
  then("this story matches multiple filters", () => {
    expect(true).toBe(true);
  });
});

story("Story with feature tags", { tags: ["feature:auth", "feature:login"] }, () => {
  doc.note("Tags can use prefixes for organization");

  given("a story tagged by feature", () => {});
  then("feature filtering is possible", () => {
    expect(true).toBe(true);
  });
});

// ============================================================================
// Ticket Option - Issue/Requirement Tracking
// ============================================================================

story("Story with single ticket", { ticket: "JIRA-123" }, () => {
  doc.note("Links story to a single issue tracker ticket");

  given("a story linked to JIRA-123", () => {});
  when("documentation is generated", () => {});
  then("ticket reference appears in docs", () => {
    expect(true).toBe(true);
  });
});

story("Story with multiple tickets", { ticket: ["JIRA-123", "JIRA-456", "JIRA-789"] }, () => {
  doc.note("Story can be linked to multiple tickets");

  given("a story linked to multiple tickets", () => {});
  when("requirements are tracked", () => {});
  then("all ticket references are documented", () => {
    expect(true).toBe(true);
  });
});

story("Story with different ticket formats", { ticket: ["JIRA-123", "GH-456", "BUG-789"] }, () => {
  doc.note("Different ticket systems can be referenced");

  given("tickets from JIRA, GitHub, and bug tracker", () => {});
  then("all formats are supported", () => {
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

    given("a story with custom metadata", () => {});
    then("metadata is available in reports", () => {
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

    given("a story with rich metadata", () => {});
    when("reports are generated", () => {});
    then("all metadata is preserved", () => {
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

    given("a fully configured story", () => {});
    when("documentation is generated", () => {});
    then("all options appear in output", () => {
      expect(true).toBe(true);
    });
  }
);

story(
  "Complete story configuration example",
  {
    tags: ["integration", "api", "v2", "feature:user-management"],
    ticket: ["EPIC-100", "STORY-201", "TASK-302"],
    meta: {
      // Project management
      priority: "high",
      owner: "api-team",
      sprint: 23,
      points: 5,

      // Technical details
      apiVersion: "2.0",
      endpoints: ["/users", "/users/:id", "/users/:id/profile"],
      methods: ["GET", "POST", "PUT", "DELETE"],

      // Quality metrics
      testCoverage: {
        unit: 95,
        integration: 80,
        e2e: 60,
      },

      // Environment configuration
      environments: ["dev", "staging", "production"],
      featureFlags: {
        newUserFlow: true,
        betaFeatures: false,
      },

      // Review and approval
      reviewers: ["senior-dev-1", "senior-dev-2"],
      approvedBy: "tech-lead",
      approvedDate: "2024-01-15",

      // Additional context
      notes: "This story covers the complete user management API",
      relatedDocs: ["docs/api/users.md", "docs/guides/user-management.md"],
    },
  },
  () => {
    doc.note("Comprehensive example with realistic metadata");
    doc.tag("documentation-example");

    given("complete story configuration", () => {});
    when("documentation is generated", () => {});
    then("rich metadata enables advanced reporting", () => {
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

    given("story with options and doc methods", () => {});
    when("both are used", () => {});
    then("they work together seamlessly", () => {
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
    given("user is on login page", () => {});
    when("user enters valid credentials", () => {});
    then("user is logged in successfully", () => {
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
    given("user is on login page", () => {});
    when("user enters invalid password", () => {});
    then("error message is displayed", () => {
      expect(true).toBe(true);
    });
  }
);

story(
  "Payment processing",
  {
    tags: ["critical", "payment", "checkout"],
    ticket: "PAY-100",
    meta: {
      priority: "critical",
      securityReview: true,
      pciCompliance: true,
      testData: {
        cardType: "visa",
        amount: 99.99,
      },
    },
  },
  () => {
    doc.note("Payment tests require special handling");

    given("user has items in cart", () => {});
    when("user completes payment", () => {});
    then("payment is processed successfully", () => {
      expect(true).toBe(true);
    });
  }
);

// ============================================================================
// Empty and Minimal Options
// ============================================================================

story("Story with empty tags array", { tags: [] }, () => {
  given("story with empty tags", () => {});
  then("story still works", () => {
    expect(true).toBe(true);
  });
});

story("Story with empty meta object", { meta: {} }, () => {
  given("story with empty meta", () => {});
  then("story still works", () => {
    expect(true).toBe(true);
  });
});

story("Story with only tags", { tags: ["minimal"] }, () => {
  given("story with only tags option", () => {});
  then("other options are optional", () => {
    expect(true).toBe(true);
  });
});

story("Story with only ticket", { ticket: "MIN-001" }, () => {
  given("story with only ticket option", () => {});
  then("other options are optional", () => {
    expect(true).toBe(true);
  });
});

story("Story with only meta", { meta: { key: "value" } }, () => {
  given("story with only meta option", () => {});
  then("other options are optional", () => {
    expect(true).toBe(true);
  });
});
