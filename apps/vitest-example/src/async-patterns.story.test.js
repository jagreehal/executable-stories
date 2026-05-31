/**
 * Comprehensive demonstration of async step implementations in Vitest.
 *
 * Patterns covered:
 * - Basic async/await in tests
 * - Parallel async operations with Promise.all
 * - Sequential async operations
 * - Async setup and teardown
 * - Error handling in async
 * - Timeouts and delays
 */
import { story } from 'executable-stories-vitest';
import { describe, expect, it } from 'vitest';
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const fetchUser = async (id) => {
    await delay(10);
    return { id, name: `User ${id}` };
};
const fetchOrders = async (_userId) => {
    await delay(10);
    return [
        { id: 'order-1', total: 100 },
        { id: 'order-2', total: 200 },
    ];
};
const saveToDatabase = async (_data) => {
    await delay(10);
    return { success: true };
};
describe('Async Patterns', () => {
    // ============================================================================
    // Basic Async/Await
    // ============================================================================
    it('Basic async/await in steps', async ({ task }) => {
        story.init(task);
        story.note('Tests can be async functions using async/await syntax');
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
    it('Parallel async operations with Promise.all', async ({ task }) => {
        story.init(task);
        story.note('Multiple async operations can run in parallel using Promise.all');
        story.given('user is authenticated');
        await delay(5);
        story.when('user data and orders are fetched in parallel');
        const fetchSettings = async () => {
            await delay(10);
            return { theme: 'dark' };
        };
        const [user, orders, settings] = await Promise.all([
            fetchUser('123'),
            fetchOrders('123'),
            fetchSettings(),
        ]);
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
    it('Sequential async operations', async ({ task }) => {
        story.init(task);
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
    it('Async setup and teardown pattern', async ({ task }) => {
        story.init(task);
        story.note('Setup and teardown can be async for database connections, etc.');
        story.arrange('database connection is established');
        await delay(10);
        const connection = { id: 'conn-123', isOpen: true };
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
    // Error Handling in Async
    // ============================================================================
    it('Error handling in async steps', async ({ task }) => {
        story.init(task);
        story.note('Async errors should be properly caught and handled');
        let error = null;
        story.given('an async operation that might fail');
        story.when('the operation fails');
        const failingOperation = async () => {
            await delay(5);
            throw new Error('Network error');
        };
        try {
            await failingOperation();
        }
        catch (e) {
            error = e;
        }
        story.then('error is caught and can be asserted');
        expect(error).not.toBeNull();
        expect(error?.message).toBe('Network error');
    });
    // ============================================================================
    // Timeouts and Delays
    // ============================================================================
    it('Working with timeouts and delays', async ({ task }) => {
        story.init(task);
        story.note('Async operations can include deliberate delays for timing');
        story.given('timer starts');
        const startTime = Date.now();
        story.when('operation with delay completes');
        await delay(50);
        const endTime = Date.now();
        story.then('elapsed time is measurable');
        const elapsed = endTime - startTime;
        expect(elapsed).toBeGreaterThanOrEqual(45); // Allow for timing variations
    });
    // ============================================================================
    // Async Iteration
    // ============================================================================
    it('Async iteration over collections', async ({ task }) => {
        story.init(task);
        story.note('Processing collections asynchronously');
        const items = ['a', 'b', 'c'];
        const results = [];
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
    it('Parallel iteration with Promise.all and map', async ({ task }) => {
        story.init(task);
        story.note('Processing all items in parallel for better performance');
        const items = [1, 2, 3, 4, 5];
        story.given('a collection of numbers');
        expect(items).toHaveLength(5);
        story.when('items are processed in parallel');
        const results = await Promise.all(items.map(async (item) => {
            await delay(5);
            return item * 2;
        }));
        story.then('all items are doubled');
        expect(results).toEqual([2, 4, 6, 8, 10]);
    });
    // ============================================================================
    // Real-World Async Pattern
    // ============================================================================
    it('Real-world async API test pattern', async ({ task }) => {
        story.init(task);
        story.note('Simulates a complete async API test scenario');
        story.tag(['async']);
        const mockApi = {
            async get(_endpoint) {
                await delay(10);
                return {
                    data: { id: '123', name: 'Test' },
                    status: 200,
                    timestamp: new Date().toISOString(),
                };
            },
            async post(_endpoint, _body) {
                await delay(10);
                return {
                    data: { success: true, id: 'new-123' },
                    status: 201,
                    timestamp: new Date().toISOString(),
                };
            },
        };
        story.arrange('API client is configured');
        await delay(5);
        story.act('GET request is made');
        const getResponse = await mockApi.get('/users/123');
        story.act('POST request is made');
        const postResponse = await mockApi.post('/users', {
            name: 'New User',
        });
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
    it('Async steps with runtime documentation', async ({ task }) => {
        story.init(task);
        story.note('Runtime docs capture async operation results');
        story.tag(['async', 'documentation']);
        story.kv({ label: 'Prep Time', value: '5ms' });
        story.given('async operation is prepared');
        await delay(5);
        story.when('async data is fetched');
        const data = await fetchUser('789');
        story.json({ label: 'Fetched Data', value: data });
        story.then('runtime docs contain async results');
        await delay(5);
        story.kv({ label: 'Final Verification', value: 'passed' });
        expect(true).toBe(true);
    });
});
