// The PR comment the showcase-screenshots action posts. Pure, so tests can check it without GitHub.

/** Finds the action's own comment, so a new push updates it instead of adding another. */
export const MARKER = '<!-- executable-stories-showcase:screenshots -->';

/**
 * @typedef {{ name: string; ok: boolean; codes: string[]; error: string | null; screenshot: string;
 *   compare?: { status: 'same' | 'changed' | 'new'; ratio: number; image: string | null } }} Shot
 * @typedef {{ name: string; reasons: { kind: string; detail: string }[] }} Affected
 */

/**
 * @param {{
 *   shots: Shot[];
 *   affected: Affected[];
 *   unmatched: string[];
 *   all: boolean;
 *   links: Record<string, string>;
 *   sha: string;
 *   note?: string;
 * }} input `links` maps an image file name to its URL; `all` says every state was shot.
 */
export function buildComment({
  shots,
  affected,
  unmatched,
  all,
  links,
  sha,
  note,
}) {
  const why = new Map(affected.map((a) => [a.name, a.reasons[0]]));
  const failed = shots.filter((s) => !s.ok);
  const changed = shots.filter((s) => s.ok && s.compare?.status === 'changed');
  const added = shots.filter(
    (s) => s.ok && (!s.compare || s.compare.status === 'new'),
  );
  const same = shots.filter((s) => s.ok && s.compare?.status === 'same');
  const image = (file) => links[file.split('/').at(-1) ?? ''];

  const lines = [MARKER, '### UI states in this PR', ''];

  const counts = [
    [changed.length, 'changed'],
    [added.length, 'new'],
    [same.length, 'unchanged'],
    [failed.length, 'failing'],
  ].flatMap(([n, label]) => (n ? [`**${n}** ${label}`] : []));

  lines.push(
    shots.length
      ? `${counts.join(' · ')} · at ${sha.slice(0, 7)}${all ? ' · every state shot' : ''}`
      : 'No UI state is affected by this change.',
    '',
  );

  if (note) lines.push(`> ${note}`, '');

  const section = (shot, label, file) => {
    const reason = why.get(shot.name);
    const url = file && image(file);

    lines.push(`#### \`${shot.name}\` · ${label}`);

    if (reason) lines.push(`<sub>${reason.kind}: ${reason.detail}</sub>`);
    lines.push(
      '',
      url
        ? `![${shot.name}](${url})`
        : `_${file ? 'Image not published' : 'No image'}._`,
      '',
    );
  };

  for (const s of changed) {
    section(
      s,
      `changed (${(s.compare.ratio * 100).toFixed(1)}% of pixels)`,
      s.compare.image,
    );
  }

  for (const s of added) section(s, 'new', s.screenshot);

  if (failed.length) {
    lines.push('#### Failing', '');

    for (const s of failed) {
      lines.push(
        `- \`${s.name}\`: ${s.codes.join(', ')}${s.error ? `: ${s.error}` : ''}`,
      );
    }

    lines.push(
      '',
      'The workflow run has each failure’s details page and screenshot.',
      '',
    );
  }

  if (same.length) {
    lines.push(
      `<details><summary>Unchanged (${same.length})</summary>`,
      '',
      same.map((s) => `\`${s.name}\``).join(', '),
      '',
      '</details>',
      '',
    );
  }

  if (unmatched.length) {
    lines.push(
      `<details><summary>Changed files no scenario points at (${unmatched.length})</summary>`,
      '',
      ...unmatched.map((f) => `- \`${f}\``),
      '',
      all
        ? 'Shared files can change any state, so every state was shot.'
        : 'Shared files can change any state; these weren’t checked.',
      '',
      '</details>',
      '',
    );
  }

  lines.push(
    '<sub>Posted by executable-stories-showcase. Pushing again updates this comment.</sub>',
  );

  return `${lines.join('\n')}\n`;
}
