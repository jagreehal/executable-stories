import { story } from 'executable-stories-vitest';
import { test } from 'vitest';

type StoryMeta = { story?: { sourceOrder?: number } };

test('First test', ({ task }) => {
  story.init(task);
  console.log('First test, sourceOrder:', (task.meta as StoryMeta).story?.sourceOrder);
});

test('Second test', ({ task }) => {
  story.init(task);
  console.log('Second test, sourceOrder:', (task.meta as StoryMeta).story?.sourceOrder);
});

test('Third test', ({ task }) => {
  story.init(task);
  console.log('Third test, sourceOrder:', (task.meta as StoryMeta).story?.sourceOrder);
});
