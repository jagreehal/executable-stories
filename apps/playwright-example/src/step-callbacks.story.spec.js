import { expect, test } from '@playwright/test';
import { story } from 'executable-stories-playwright';
import { add, multiply } from './calculator.js';
test.describe('Step Callbacks', () => {
    test('Calculator adds two numbers using step callbacks', async ({}, testInfo) => {
        story.init(testInfo);
        const a = story.given('number a is 5', () => 5);
        const b = story.given('number b is 3', () => 3);
        const result = story.when('the numbers are added', () => add(a, b));
        story.then('the result is 8', () => {
            expect(result).toBe(8);
        });
    });
    test('Mixed markers and step callbacks', async ({}, testInfo) => {
        story.init(testInfo);
        story.given('the calculator is ready');
        const result = story.when('we multiply 7 by 6', () => multiply(7, 6));
        story.then('the result is 42', () => {
            expect(result).toBe(42);
        });
        story.and('the result is a positive number');
        expect(result).toBeGreaterThan(0);
    });
    test('Async step callbacks with timing', async ({}, testInfo) => {
        story.init(testInfo);
        const data = await story.given('data fetched asynchronously', async () => {
            await new Promise((resolve) => setTimeout(resolve, 10));
            return { a: 5, b: 3 };
        });
        const result = await story.when('async addition is performed', async () => {
            await new Promise((resolve) => setTimeout(resolve, 5));
            return add(data.a, data.b);
        });
        await story.then('the async result is 8', async () => {
            expect(result).toBe(8);
        });
    });
    test('Step callbacks with inline docs still use marker-only', async ({}, testInfo) => {
        story.init(testInfo);
        story.given('valid credentials', {
            json: { label: 'Credentials', value: { email: 'user@example.com' } },
        });
        const result = story.when('login is attempted', () => ({ authenticated: true }));
        story.then('user is authenticated', () => {
            expect(result.authenticated).toBe(true);
        });
        story.but('rate limit is not exceeded');
    });
});
