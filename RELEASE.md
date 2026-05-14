# Release

Agent Pets ships a GitHub desktop release and two public npm packages:

- `agent-pets`
- `opencode-agent-pets`

## Requirements

- `NPM_TOKEN` must be a repository secret that can publish new public packages for the npm account or organization.
- The root `package.json` version must be bumped for an automatic release from `main`.
- `packages/opencode-agent-pets/package.json` should be bumped when the OpenCode plugin changes.

## Flow

1. Bump the root `package.json` version.
2. Push to `main`.
3. The release workflow builds Windows, macOS, and Linux artifacts.
4. The workflow creates `v<version>` on GitHub and uploads the desktop installers.
5. The workflow publishes any missing npm package versions.

The workflow can also be run manually from GitHub Actions. If the GitHub Release already exists, it skips recreating it and retries npm publishing.

## Checks

Run these before pushing a release bump:

```bash
bun install
bun run typecheck
bun run test
bun run pack
```

Check package contents with:

```bash
bun pm pack
```
