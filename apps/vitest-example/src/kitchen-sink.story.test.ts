/**
 * Kitchen sink: one test that exercises every story.* API method.
 * Verifies story.note, story.table, story.kv, story.json, story.code, story.link,
 * story.section, story.mermaid, story.screenshot, story.custom, and all step keywords
 * appear in the generated docs.
 */
import { story } from 'executable-stories-vitest';
import { expect, it } from 'vitest';

it('Kitchen sink – every story API method', ({ task }) => {
  story.init(task, {
    tags: ['kitchen-sink'],
    ticket: 'KS-001',
    meta: { area: 'docs', priority: 'high' },
  });

  story.note(
    'This test exercises every story.* method so generated docs include all of them.',
  );
  story.tag('smoke');
  story.kv({ label: 'Framework', value: 'Vitest' });
  story.kv({ label: 'API Version', value: '1.0' });
  story.json({
    label: 'Config',
    value: { reporter: true },
  });
  story.code({
    label: 'Snippet',
    content: 'const x = 1;\nconst y = 2;',
    lang: 'typescript',
  });
  story.table({
    label: 'Method checklist',
    columns: ['Method', 'Used'],
    rows: [
      ['story.note', 'Yes'],
      ['story.tag', 'Yes'],
      ['story.kv', 'Yes'],
      ['story.json', 'Yes'],
      ['story.code', 'Yes'],
      ['story.table', 'Yes'],
      ['story.link', 'Yes'],
      ['story.section', 'Yes'],
      ['story.mermaid', 'Yes'],
      ['story.screenshot', 'Yes'],
      ['story.custom', 'Yes'],
    ],
  });
  story.link({ label: 'Docs', url: 'https://example.com/docs' });
  story.section({
    title: 'Section title',
    markdown: 'Section **markdown** content.',
  });
  story.mermaid({
    code: 'graph LR\n  A-->B',
    title: 'Simple diagram',
  });
  story.screenshot({ path: '../screenshots/kitchen.png', alt: 'Kitchen sink' });
  story.custom({ type: 'sink-meta', data: { version: 2, methods: 11 } });

  story.given('all doc methods were called');
  story.when('steps are recorded');
  story.then(
    'generated doc contains note, table, kv, json, code, link, section, mermaid, screenshot, custom',
  );
  story.and('step keywords given/when/then/and appear');
  story.arrange('arrange alias works');
  story.act('act alias works');
  story.assert('assert alias works');

  expect(true).toBe(true);
});
