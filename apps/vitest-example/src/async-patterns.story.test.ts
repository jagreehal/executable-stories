/**
 * Comprehensive demonstration of async step implementations in Vitest.
 *
 * Patterns covered:
 * - Basic async/await in steps
 * - Parallel async operations with Promise.all
 * - Sequential async operations
 * - Async setup and teardown
 * - Error handling in async steps
 * - Timeouts and delays
 * - Concurrent steps (Vitest-specific)
 */
import { story, type StepsApi } from "vitest-executable-stories";
import { given, when, and, doc, arrange, act, assert, step } from "vitest-executable-stories";
import { expect } from "vitest";

// Note: 'then' is not exported directly due to conflict with Promise.then
const { then } = step;

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
// Basic Async/Await
// ============================================================================

story("Basic async/await in steps", () => {
  doc.note("Steps can be async functions using async/await syntax");

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

    // doc.kv (static)("Parallel Fetch Count", 3);
  });

  then("all data is available", () => {
    expect(user).toBeDefined();
    expect(orders).toHaveLength(2);
    expect(settings.theme).toBe("dark");
  });

  and("total order value is calculated", () => {
    const total = orders.reduce((sum, order) => sum + order.total, 0);
    expect(total).toBe(300);
  });
});

// ============================================================================
// Concurrent Steps (Vitest-specific)
// ============================================================================

story("Concurrent steps with .concurrent modifier", () => {
  doc.note("Vitest supports .concurrent modifier for parallel step execution");

  let results: string[] = [];

  given("setup for concurrent execution", () => {
    results = [];
  });

  when.concurrent("first concurrent operation", async () => {
    await delay(20);
    results.push("first");
  });

  when.concurrent("second concurrent operation", async () => {
    await delay(10);
    results.push("second");
  });

  when.concurrent("third concurrent operation", async () => {
    await delay(15);
    results.push("third");
  });

  then("all concurrent operations complete", () => {
    expect(results).toHaveLength(3);
    // Order depends on timing, not declaration order
    expect(results).toContain("first");
    expect(results).toContain("second");
    expect(results).toContain("third");
  });
});

// ============================================================================
// Sequential Async Operations
// ============================================================================

story("Sequential async operations", () => {
  doc.note("Some operations must be sequential due to dependencies");

  let user: { id: string; name: string };
  let orders: Array<{ id: string; total: number }>;

  given("nothing is loaded yet", () => {
    // Initial state
  });

  when("user is fetched first", async () => {
    user = await fetchUser("456");
    // doc.kv (static)("User fetched", user.id);
  });

  and("then orders are fetched using user ID", async () => {
    // This depends on user being fetched first
    orders = await fetchOrders(user.id);
    // doc.kv (static)("Orders fetched", orders.length);
  });

  then("both user and orders are available", () => {
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
    // doc.kv (static)("Connection ID", connection.id);
  });

  arrange("transaction is started", async () => {
    await delay(5);
    transactionId = `tx-${Date.now()}`;
    // doc.kv (static)("Transaction ID", transactionId);
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

  // Note: In real tests, you'd use afterEach for cleanup
  // This demonstrates the async pattern
  then("connection is still open for cleanup", () => {
    expect(connection.isOpen).toBe(true);
  });
});

// ============================================================================
// Error Handling in Async Steps
// ============================================================================

story("Error handling in async steps", () => {
  doc.note("Async errors should be properly caught and handled");

  let error: Error | null = null;

  given("an async operation that might fail", () => {
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

  then("error is caught and can be asserted", () => {
    expect(error).not.toBeNull();
    expect(error?.message).toBe("Network error");
  });
});

story("Expected async failure with .fails modifier", () => {
  doc.note("The .fails modifier works with async steps");

  given("setup for failing operation", () => {});

  when.fails("async operation throws", async () => {
    await delay(5);
    throw new Error("Expected async error");
  });

  then("test continues after expected failure", () => {
    expect(true).toBe(true);
  });
});

// ============================================================================
// Timeouts and Delays
// ============================================================================

story("Working with timeouts and delays", () => {
  doc.note("Async operations can include deliberate delays for timing");

  let startTime: number;
  let endTime: number;

  given("timer starts", () => {
    startTime = Date.now();
  });

  when("operation with delay completes", async () => {
    await delay(50); // 50ms delay
    endTime = Date.now();
  });

  then("elapsed time is measurable", () => {
    const elapsed = endTime - startTime;
    expect(elapsed).toBeGreaterThanOrEqual(50);
    // doc.kv (static)("Elapsed (ms)", elapsed);
  });
});

// ============================================================================
// Async Iteration
// ============================================================================

story("Async iteration over collections", () => {
  doc.note("Processing collections asynchronously");

  const items = ["a", "b", "c"];
  const results: string[] = [];

  given("a collection of items", () => {
    expect(items).toHaveLength(3);
  });

  when("items are processed asynchronously", async () => {
    for (const item of items) {
      await delay(5);
      results.push(item.toUpperCase());
    }
  });

  then("all items are processed", () => {
    expect(results).toEqual(["A", "B", "C"]);
  });
});

story("Parallel iteration with Promise.all and map", () => {
  doc.note("Processing all items in parallel for better performance");

  const items = [1, 2, 3, 4, 5];
  let results: number[];

  given("a collection of numbers", () => {
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

  then("all items are doubled", () => {
    expect(results).toEqual([2, 4, 6, 8, 10]);
  });
});

// ============================================================================
// Real-World Async Pattern
// ============================================================================

story("Real-world async API test pattern", () => {
  doc.note("Simulates a complete async API test scenario");
  doc.tag(["integration", "async"]);

  interface ApiResponse<T> {
    data: T;
    status: number;
    timestamp: string;
  }

  const mockApi = {
    async get<T>(_endpoint: string): Promise<ApiResponse<T>> {
      await delay(10);
      return {
        data: { id: "123", name: "Test" } as T,
        status: 200,
        timestamp: new Date().toISOString(),
      };
    },
    async post<T>(_endpoint: string, _body: unknown): Promise<ApiResponse<T>> {
      await delay(10);
      return {
        data: { success: true, id: "new-123" } as T,
        status: 201,
        timestamp: new Date().toISOString(),
      };
    },
  };

  let getResponse: ApiResponse<{ id: string; name: string }>;
  let postResponse: ApiResponse<{ success: boolean; id: string }>;

  arrange("API client is configured", async () => {
    // Simulate async configuration
    await delay(5);
  });

  act("GET request is made", async () => {
    getResponse = await mockApi.get<{ id: string; name: string }>("/users/123");
    // doc.json (static)("GET Response", getResponse);
  });

  act("POST request is made", async () => {
    postResponse = await mockApi.post<{ success: boolean; id: string }>("/users", {
      name: "New User",
    });
    // doc.json (static)("POST Response", postResponse);
  });

  assert("GET response is valid", () => {
    expect(getResponse.status).toBe(200);
    expect(getResponse.data.id).toBe("123");
  });

  assert("POST response is valid", () => {
    expect(postResponse.status).toBe(201);
    expect(postResponse.data.success).toBe(true);
  });

  assert("both responses have timestamps", () => {
    expect(getResponse.timestamp).toBeDefined();
    expect(postResponse.timestamp).toBeDefined();
  });
});

// ============================================================================
// Async with Callback Parameter (Vitest-specific)
// ============================================================================

story("Async steps with callback parameter", (stepsApi: StepsApi) => {
  doc.note("Async works with callback parameter pattern");
  const { given: gv, when: wh, then: th } = stepsApi;

  let data: string;

  gv("async setup via callback", async () => {
    await delay(5);
    data = "initialized";
  });

  wh("async action via callback", async () => {
    await delay(5);
    data = data.toUpperCase();
  });

  th("async assertion via callback", async () => {
    await delay(5);
    expect(data).toBe("INITIALIZED");
  });
});

// ============================================================================
// Async with Runtime Documentation
// NOTE: In Vitest, doc.runtime.* requires using the callback pattern
// ============================================================================

story("Async steps with runtime documentation", (s) => {
  s.doc.note("Runtime docs capture async operation results");
  s.doc.tag(["async", "documentation"]);
  s.doc.kv("Prep Time", "5ms");

  s.given("async operation is prepared", async () => {
    await delay(5);
    s.doc.runtime.note("Preparation complete");
  });

  s.when("async data is fetched", async () => {
    const data = await fetchUser("789");
    s.doc.runtime.json("Fetched Data", data);
    s.doc.runtime.tag(["async", "fetched"]);
  });

  s.then("runtime docs contain async results", async () => {
    await delay(5);
    s.doc.runtime.kv("Final Verification", "passed");
    expect(true).toBe(true);
  });
});
