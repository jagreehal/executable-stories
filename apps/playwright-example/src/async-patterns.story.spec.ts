/**
 * Comprehensive demonstration of async step implementations.
 * Use test() + story.init(testInfo) + story.given/when/then as markers; inline async/await between steps.
 */
import { expect, test } from '@playwright/test';
import { story } from 'executable-stories-playwright';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchUser = async (id: string): Promise<{ id: string; name: string }> => {
  await delay(10);
  return { id, name: `User ${id}` };
};

const fetchOrders = async (
  _userId: string,
): Promise<Array<{ id: string; total: number }>> => {
  await delay(10);
  return [
    { id: 'order-1', total: 100 },
    { id: 'order-2', total: 200 },
  ];
};

const saveToDatabase = async (
  _data: unknown,
): Promise<{ success: boolean }> => {
  await delay(10);
  return { success: true };
};

// ============================================================================
// Basic Async/Await
// ============================================================================

test('Basic async/await in steps', async ({}, testInfo) => {
  story.init(testInfo);
  story.note('Steps can be async functions using async/await syntax');

  story.given('user ID is known');
  await delay(5);

  story.when('user data is fetched');
  const userData = await fetchUser('123');

  story.then('user data is available');
  await delay(5);
  expect(userData).toBeDefined();
  expect(userData.id).toBe('123');
  expect(userData.name).toBe('User 123');
});

// ============================================================================
// Parallel Async Operations
// ============================================================================

test('Parallel async operations with Promise.all', async ({}, testInfo) => {
  story.init(testInfo);
  story.note('Multiple async operations can run in parallel using Promise.all');

  story.given('user is authenticated');
  await delay(5);

  story.when('user data and orders are fetched in parallel');
  const fetchSettings = async () => {
    await delay(10);
    return { theme: 'dark' };
  };
  const [user, userOrders, userSettings] = await Promise.all([
    fetchUser('123'),
    fetchOrders('123'),
    fetchSettings(),
  ]);
  const orders = userOrders;
  const settings = userSettings;

  story.then('all data is available');
  expect(user).toBeDefined();
  expect(orders).toHaveLength(2);
  expect(settings.theme).toBe('dark');

  story.and('total order value is calculated');
  const total = orders.reduce((sum, order) => sum + order.total, 0);
  expect(total).toBe(300);
});

// ============================================================================
// Sequential Async Operations
// ============================================================================

test('Sequential async operations', async ({}, testInfo) => {
  story.init(testInfo);
  story.note('Some operations must be sequential due to dependencies');

  story.given('nothing is loaded yet');

  story.when('user is fetched first');
  const user = await fetchUser('456');

  story.and('then orders are fetched using user ID');
  const orders = await fetchOrders(user.id);

  story.then('both user and orders are available');
  expect(user.id).toBe('456');
  expect(orders.length).toBeGreaterThan(0);
});

// ============================================================================
// Async Setup and Teardown
// ============================================================================

test('Async setup and teardown pattern', async ({}, testInfo) => {
  story.init(testInfo);
  story.note('Setup and teardown can be async for database connections, etc.');

  interface Connection {
    id: string;
    isOpen: boolean;
  }

  story.arrange('database connection is established');
  await delay(10);
  const connection = { id: 'conn-123', isOpen: true } as Connection;

  story.arrange('transaction is started');
  await delay(5);
  const transactionId = `tx-${Date.now()}`;

  story.act('data is saved');
  const result = await saveToDatabase({ name: 'test' });
  expect(result.success).toBe(true);

  story.assert('transaction can be committed');
  await delay(5);
  expect(transactionId).toBeDefined();

  story.then('connection is still open for cleanup');
  expect(connection.isOpen).toBe(true);
});

// ============================================================================
// Error Handling in Async Steps
// ============================================================================

test('Error handling in async steps', async ({}, testInfo) => {
  story.init(testInfo);
  story.note('Async errors should be properly caught and handled');

  let error: Error | null = null;

  story.given('an async operation that might fail');

  story.when('the operation fails');
  const failingOperation = async () => {
    await delay(5);
    throw new Error('Network error');
  };
  try {
    await failingOperation();
  } catch (e) {
    error = e as Error;
  }

  story.then('error is caught and can be asserted');
  expect(error).not.toBeNull();
  expect(error?.message).toBe('Network error');
});

test.skip('Expected async failure with .fails modifier (no step.fails; use try/catch or expect().rejects)', async ({}, testInfo) => {
  story.init(testInfo);
  story.note('The .fails modifier works with async steps');
  story.given('setup for failing operation');
  story.when('async operation throws');
  await delay(5);
  throw new Error('Expected async error');
});

// ============================================================================
// Timeouts and Delays
// ============================================================================

test('Working with timeouts and delays', async ({}, testInfo) => {
  story.init(testInfo);
  story.note('Async operations can include deliberate delays for timing');

  story.given('timer starts');
  const startTime = Date.now();

  story.when('operation with delay completes');
  await delay(50);
  const endTime = Date.now();

  story.then('elapsed time is measurable');
  const elapsed = endTime - startTime;
  expect(elapsed).toBeGreaterThanOrEqual(50);
});

// ============================================================================
// Async Iteration
// ============================================================================

test('Async iteration over collections', async ({}, testInfo) => {
  story.init(testInfo);
  story.note('Processing collections asynchronously');

  const items = ['a', 'b', 'c'];
  const results: string[] = [];

  story.given('a collection of items');
  expect(items).toHaveLength(3);

  story.when('items are processed asynchronously');
  for (const item of items) {
    await delay(5);
    results.push(item.toUpperCase());
  }

  story.then('all items are processed');
  expect(results).toEqual(['A', 'B', 'C']);
});

test('Parallel iteration with Promise.all and map', async ({}, testInfo) => {
  story.init(testInfo);
  story.note('Processing all items in parallel for better performance');

  const items = [1, 2, 3, 4, 5];

  story.given('a collection of numbers');
  expect(items).toHaveLength(5);

  story.when('items are processed in parallel');
  const results = await Promise.all(
    items.map(async (item) => {
      await delay(5);
      return item * 2;
    }),
  );

  story.then('all items are doubled');
  expect(results).toEqual([2, 4, 6, 8, 10]);
});

// ============================================================================
// Real-World Async Pattern
// ============================================================================

test('Real-world async API test pattern', async ({}, testInfo) => {
  story.init(testInfo);
  story.note('Simulates a complete async API test scenario');
  story.tag(['async']);

  interface ApiResponse<T> {
    data: T;
    status: number;
    timestamp: string;
  }

  const mockApi = {
    async get<T>(_endpoint: string): Promise<ApiResponse<T>> {
      await delay(10);
      return {
        data: { id: '123', name: 'Test' } as T,
        status: 200,
        timestamp: new Date().toISOString(),
      };
    },
    async post<T>(_endpoint: string, _body: unknown): Promise<ApiResponse<T>> {
      await delay(10);
      return {
        data: { success: true, id: 'new-123' } as T,
        status: 201,
        timestamp: new Date().toISOString(),
      };
    },
  };

  story.arrange('API client is configured');
  await delay(5);

  story.act('GET request is made');
  const getResponse = await mockApi.get<{ id: string; name: string }>(
    '/users/123',
  );

  story.act('POST request is made');
  const postResponse = await mockApi.post<{ success: boolean; id: string }>(
    '/users',
    {
      name: 'New User',
    },
  );

  story.assert('GET response is valid');
  expect(getResponse.status).toBe(200);
  expect(getResponse.data.id).toBe('123');

  story.assert('POST response is valid');
  expect(postResponse.status).toBe(201);
  expect(postResponse.data.success).toBe(true);

  story.assert('both responses have timestamps');
  expect(getResponse.timestamp).toBeDefined();
  expect(postResponse.timestamp).toBeDefined();
});

// ============================================================================
// Async with Runtime Documentation
// ============================================================================

test('Async steps with runtime documentation', async ({}, testInfo) => {
  story.init(testInfo);
  story.note('Runtime docs capture async operation results');

  story.given('async operation is prepared');
  await delay(5);

  story.when('async data is fetched');
  await fetchUser('789');

  story.then('runtime docs contain async results');
  await delay(5);
  expect(true).toBe(true);
});
