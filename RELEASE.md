# Release

Agent Pets publishes two npm packages:

- `agent-pets`
- `opencode-agent-pets`

## Requirements

- GitHub repository secret: `NPM_TOKEN`
- Package versions updated in both `package.json` files
- A clean tag named `v<version>`, for example `v0.1.0`

## Flow

1. Push a `v*` tag.
2. The release workflow builds Windows, macOS, and Linux desktop artifacts.
3. The workflow creates a GitHub Release and uploads the desktop artifacts.
4. When the GitHub Release is published, the workflow publishes both npm packages.

## Local Checks

Run these before tagging:

```bash
bun install
bun run typecheck
bun run test
bun run pack
```

Check the npm package contents:

```bash
bun pm pack
```
