import { describe, expect, it } from 'vitest';
import { story } from 'executable-stories-vitest';
import { formatCliError } from '../src/errors';

describe('JSON error output shape', () => {
  it('emits machine-readable error payload when --json is enabled', ({ task }) => {
    story.init(task);

    story.given('a CLI error message and json output mode');
    const message = 'unknown target: bad-target';

    story.when('error output is formatted by CLI formatter');
    const payload = formatCliError(message, true);

    story.then('it is valid JSON with ok=false and error message');
    const parsed = JSON.parse(payload) as { ok: boolean; error: string };
    expect(parsed.ok).toBe(false);
    expect(parsed.error).toBe(message);
  });

  it('emits plain text when json mode is disabled', ({ task }) => {
    story.init(task);

    story.given('a CLI error message and text output mode');
    const message = 'boom';

    story.when('error output is formatted by CLI formatter');
    const payload = formatCliError(message, false);

    story.then('it is user-facing plain text');
    expect(payload).toBe('Error: boom');
  });
});
