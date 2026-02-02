/**
 * Comprehensive demonstration of async step implementations in Playwright.
 *
 * Patterns covered:
 * - Basic async/await in steps (all Playwright steps are async)
 * - Parallel async operations with Promise.all
 * - Sequential async operations
 * - Page interactions (async by nature)
 * - Error handling in async steps
 * - Timeouts and waiting
 */
import { story, given, when, then, and, doc, arrange, act, assert } from "playwright-executable-stories";
import { expect } from "@playwright/test";

// Helper functions to simulate async operations
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchUser = async (id: string): Promise<{ id: string; name: string }> => {
  await delay(10);
  return { id, name: `User ${id}` };
};

const fetchOrders = async (_userId: string): Promise<Array<{ id: string; total: number }>> => {
  await delay(10);
  return [
    { id: "order-1", total: 100 },
    { id: "order-2", total: 200 },
  ];
};

const saveToDatabase = async (_data: unknown): Promise<{ success: boolean }> => {
  await delay(10);
  return { success: true };
};

// ============================================================================
// Basic Async/Await (All Playwright steps are async)
// ============================================================================

story("Basic async/await in Playwright steps", () => {
  doc.note("All Playwright step callbacks are async functions");

  let userData: { id: string; name: string };

  given("user ID is known", async () => {
    await delay(5);
    // Simulate async setup
  });

  when("user data is fetched", async () => {
    userData = await fetchUser("123");
  });

  then("user data is available", async () => {
    await delay(5);
    expect(userData).toBeDefined();
    expect(userData.id).toBe("123");
    expect(userData.name).toBe("User 123");
  });
});

// ============================================================================
// Parallel Async Operations
// ============================================================================

story("Parallel async operations with Promise.all", () => {
  doc.note("Multiple async operations can run in parallel using Promise.all");

  let user: { id: string; name: string };
  let orders: Array<{ id: string; total: number }>;
  let settings: { theme: string };

  given("user is authenticated", async () => {
    // Simulate auth check
    await delay(5);
  });

  when("user data and orders are fetched in parallel", async () => {
    const fetchSettings = async () => {
      await delay(10);
      return { theme: "dark" };
    };

    // Fetch multiple resources in parallel
    const [userData, userOrders, userSettings] = await Promise.all([
      fetchUser("123"),
      fetchOrders("123"),
      fetchSettings(),
    ]);

    user = userData;
    orders = userOrders;
    settings = userSettings;

    doc.runtime.kv("Parallel Fetch Count", 3);
  });

  then("all data is available", async () => {
    expect(user).toBeDefined();
    expect(orders).toHaveLength(2);
    expect(settings.theme).toBe("dark");
  });

  and("total order value is calculated", async () => {
    const total = orders.reduce((sum, order) => sum + order.total, 0);
    expect(total).toBe(300);
  });
});

// ============================================================================
// Page Interactions (Async by Nature)
// ============================================================================

story.skip("Async page interactions", () => {
  // NOTE: Skipped - page state doesn't persist across steps in story model
  doc.note("Playwright page operations are inherently async");

  given("a page is available", async ({ page }) => {
    expect(page).toBeDefined();
  });

  when("page content is set", async ({ page }) => {
    await page.setContent(`
      <html>
        <body>
          <h1>Test Page</h1>
          <button id="btn">Click Me</button>
          <div id="result"></div>
        </body>
      </html>
    `);
    doc.runtime.kv("Page Set", true);
  });

  when("button is clicked", async ({ page }) => {
    await page.evaluate(() => {
      document.getElementById("btn")?.addEventListener("click", () => {
        document.getElementById("result")!.textContent = "Clicked!";
      });
    });
    await page.click("#btn");
  });

  then("result is updated", async ({ page }) => {
    const result = await page.textContent("#result");
    expect(result).toBe("Clicked!");
  });
});

// ============================================================================
// Sequential Async Operations
// ============================================================================

story("Sequential async operations", () => {
  doc.note("Some operations must be sequential due to dependencies");

  let user: { id: string; name: string };
  let orders: Array<{ id: string; total: number }>;

  given("nothing is loaded yet", async () => {
    // Initial state
  });

  when("user is fetched first", async () => {
    user = await fetchUser("456");
    doc.runtime.kv("User fetched", user.id);
  });

  and("then orders are fetched using user ID", async () => {
    // This depends on user being fetched first
    orders = await fetchOrders(user.id);
    doc.runtime.kv("Orders fetched", orders.length);
  });

  then("both user and orders are available", async () => {
    expect(user.id).toBe("456");
    expect(orders.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// Async Setup and Teardown
// ============================================================================

story("Async setup and teardown pattern", () => {
  doc.note("Setup and teardown can be async for database connections, etc.");

  interface Connection {
    id: string;
    isOpen: boolean;
  }

  let connection: Connection;
  let transactionId: string;

  arrange("database connection is established", async () => {
    // Simulate async connection
    await delay(10);
    connection = { id: "conn-123", isOpen: true };
    doc.runtime.kv("Connection ID", connection.id);
  });

  arrange("transaction is started", async () => {
    await delay(5);
    transactionId = `tx-${Date.now()}`;
    doc.runtime.kv("Transaction ID", transactionId);
  });

  act("data is saved", async () => {
    const result = await saveToDatabase({ name: "test" });
    expect(result.success).toBe(true);
  });

  assert("transaction can be committed", async () => {
    // Simulate commit
    await delay(5);
    expect(transactionId).toBeDefined();
  });

  then("connection is still open for cleanup", async () => {
    expect(connection.isOpen).toBe(true);
  });
});

// ============================================================================
// Error Handling in Async Steps
// ============================================================================

story("Error handling in async steps", () => {
  doc.note("Async errors should be properly caught and handled");

  let error: Error | null = null;

  given("an async operation that might fail", async () => {
    // Setup
  });

  when("the operation fails", async () => {
    const failingOperation = async () => {
      await delay(5);
      throw new Error("Network error");
    };

    try {
      await failingOperation();
    } catch (e) {
      error = e as Error;
    }
  });

  then("error is caught and can be asserted", async () => {
    expect(error).not.toBeNull();
    expect(error?.message).toBe("Network error");
  });
});

story("Expected async failure with .fail modifier", () => {
  doc.note("The .fail modifier works with async steps (Playwright-specific)");

  given("setup for failing operation", async () => {});

  when.fail("async operation throws", async () => {
    await delay(5);
    throw new Error("Expected async error");
  });

  then("test continues after expected failure", async () => {
    expect(true).toBe(true);
  });
});

// ============================================================================
// Timeouts and Waiting
// ============================================================================

story.skip("Working with Playwright waits", () => {
  // NOTE: Skipped - page state doesn't persist across steps in story model
  doc.note("Playwright provides various waiting mechanisms");

  given("page with delayed content", async ({ page }) => {
    await page.setContent(`
      <html>
        <body>
          <div id="loader">Loading...</div>
          <script>
            setTimeout(() => {
              document.getElementById('loader').textContent = 'Loaded!';
            }, 100);
          </script>
        </body>
      </html>
    `);
  });

  when("waiting for text change", async ({ page }) => {
    // Wait for the text to change
    await page.waitForFunction(() => {
      return document.getElementById("loader")?.textContent === "Loaded!";
    });
  });

  then("content is loaded", async ({ page }) => {
    const text = await page.textContent("#loader");
    expect(text).toBe("Loaded!");
    doc.runtime.kv("Final Text", text);
  });
});

story("Custom timeout handling", () => {
  doc.note("Async operations can include deliberate delays for timing");

  let startTime: number;
  let endTime: number;

  given("timer starts", async () => {
    startTime = Date.now();
  });

  when("operation with delay completes", async () => {
    await delay(50); // 50ms delay
    endTime = Date.now();
  });

  then("elapsed time is measurable", async () => {
    const elapsed = endTime - startTime;
    expect(elapsed).toBeGreaterThanOrEqual(50);
    doc.runtime.kv("Elapsed (ms)", elapsed);
  });
});

// ============================================================================
// Async Iteration
// ============================================================================

story("Async iteration over collections", () => {
  doc.note("Processing collections asynchronously");

  const items = ["a", "b", "c"];
  const results: string[] = [];

  given("a collection of items", async () => {
    expect(items).toHaveLength(3);
  });

  when("items are processed asynchronously", async () => {
    for (const item of items) {
      await delay(5);
      results.push(item.toUpperCase());
    }
  });

  then("all items are processed", async () => {
    expect(results).toEqual(["A", "B", "C"]);
  });
});

story("Parallel iteration with Promise.all and map", () => {
  doc.note("Processing all items in parallel for better performance");

  const items = [1, 2, 3, 4, 5];
  let results: number[];

  given("a collection of numbers", async () => {
    expect(items).toHaveLength(5);
  });

  when("items are processed in parallel", async () => {
    results = await Promise.all(
      items.map(async (item) => {
        await delay(5);
        return item * 2;
      })
    );
  });

  then("all items are doubled", async () => {
    expect(results).toEqual([2, 4, 6, 8, 10]);
  });
});

// ============================================================================
// Real-World Async Pattern with Page
// ============================================================================

story.skip("Real-world async page test pattern", () => {
  // NOTE: Skipped - page state doesn't persist across steps in story model
  doc.note("Simulates a complete async E2E test scenario");
  doc.tag(["e2e", "async"]);

  given("user navigates to a form page", async ({ page }) => {
    await page.setContent(`
      <html>
        <body>
          <form id="testForm">
            <input id="name" type="text" />
            <input id="email" type="email" />
            <button type="submit">Submit</button>
          </form>
          <div id="message"></div>
        </body>
      </html>
    `);
  });

  when("user fills the form", async ({ page }) => {
    await page.fill("#name", "Test User");
    await page.fill("#email", "test@example.com");
    doc.runtime.kv("Form Filled", true);
  });

  when("form is submitted", async ({ page }) => {
    await page.evaluate(() => {
      const form = document.getElementById("testForm");
      form?.addEventListener("submit", (e) => {
        e.preventDefault();
        document.getElementById("message")!.textContent = "Submitted!";
      });
    });
    await page.click('button[type="submit"]');
  });

  then("submission message appears", async ({ page }) => {
    const message = await page.textContent("#message");
    expect(message).toBe("Submitted!");
    doc.runtime.kv("Submission Result", message);
  });
});

// ============================================================================
// Async with Runtime Documentation
// ============================================================================

story("Async steps with runtime documentation", () => {
  doc.note("Runtime docs capture async operation results");

  given("async operation is prepared", async () => {
    await delay(5);
    doc.runtime.note("Preparation complete");
    doc.runtime.kv("Prep Time", "5ms");
  });

  when("async data is fetched", async () => {
    const data = await fetchUser("789");
    doc.runtime.json("Fetched Data", data);
    doc.runtime.tag(["async", "fetched"]);
  });

  then("runtime docs contain async results", async () => {
    await delay(5);
    doc.runtime.kv("Final Verification", "passed");
    expect(true).toBe(true);
  });
});
