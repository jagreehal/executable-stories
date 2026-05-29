# executable-stories Skills

This directory is the canonical home for repository skills.

Each skill lives in its own directory with a `SKILL.md` file:

```txt
skills/
  vitest-story-api/SKILL.md
  spec-living-documentation/SKILL.md
```

Keep skills here rather than under `.claude/skills/` or `packages/*/skills/`.
The root layout is easier for skills.sh, agent installers, and monorepo users to
scan. Package ownership can still be documented in the skill frontmatter or body.

`skills.sh.json` at the repository root controls how these skills are grouped on
skills.sh. It does not affect installation or the contents of any `SKILL.md`.
