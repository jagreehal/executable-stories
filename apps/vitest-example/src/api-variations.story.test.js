/**
 * Comprehensive API variations test for Vitest.
 * describe/it + story.init(task) + story.given/when/then (markers only).
 */
import { story } from 'executable-stories-vitest';
import { expect, it, test } from 'vitest';
// 1. Framework-native with story.init()
test('Framework native with story.init', ({ task }) => {
    story.init(task);
    expect(true).toBe(true);
});
// 2. Optional callbacks → steps are markers only (no callbacks)
it('Optional callbacks for all step keywords', ({ task }) => {
    story.init(task);
    story.given('given context without callback');
    story.when('when action without callback');
    story.then('then assertion without callback');
    story.and('and additional step without callback');
    story.arrange('arrange context without callback');
    story.act('act action without callback');
    story.assert('assert with callback');
    expect(true).toBe(true);
    story.setup('setup context without callback');
    story.context('context setup without callback');
    story.execute('execute action without callback');
    story.action('action execute without callback');
    story.verify('verify with callback');
    expect(true).toBe(true);
});
// 3. Multiple steps → And
it('Multiple steps become And', ({ task }) => {
    story.init(task);
    story.given('first given');
    story.given('second given becomes And');
    story.when('first when');
    story.when('second when becomes And');
    story.then('first then');
    expect(true).toBe(true);
    story.then('second then becomes And');
    expect(true).toBe(true);
});
// 4. Story with metadata
it('Story with metadata', ({ task }) => {
    story.init(task, { tags: ['smoke', 'api'], ticket: 'JIRA-123' });
    story.given('context');
    story.then('assertion');
    expect(true).toBe(true);
});
// 5. story.note(), story.tag(), story.kv()
it('Story with notes and tags', ({ task }) => {
    story.init(task);
    story.note('This is a note about the story');
    story.tag('smoke');
    story.tag(['api', 'important']);
    story.given('context');
    story.kv({ label: 'key', value: 'value' });
    story.then('assertion');
    expect(true).toBe(true);
});
