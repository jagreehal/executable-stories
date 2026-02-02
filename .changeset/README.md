# Changesets

This directory contains changeset files that describe changes to this package.

## Creating a Changeset

When you make changes that should be published, create a changeset:

```bash
pnpm changeset
```

This will:
1. Ask what kind of change (major, minor, patch)
2. Ask for a summary of the changes
3. Create a changeset file in `.changeset/`

## Versioning and Publishing

The GitHub Actions workflow will automatically:
- Create a PR with version bumps when changesets are merged to `main`
- Publish to npm when the version PR is merged (using OIDC for secure publishing)

## Manual Release (if needed)

If you need to release manually:

1. **Version package**: Run `pnpm version-packages` to update version and generate changelog
2. **Publish**: Run `pnpm release` to build and publish to npm
