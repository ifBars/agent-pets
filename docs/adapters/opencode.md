# OpenCode Adapter

Agent Pets can monitor OpenCode without a custom daemon by shelling out to the OpenCode CLI:

```bash
bun run pets -- --provider opencode
```

The provider first reads the local OpenCode SQLite-backed session index through the official CLI:

```bash
opencode db --format json "<session query>"
```

That path is intentionally global, so the desktop pet can show recent OpenCode sessions across projects instead of only the directory where `pets` was launched.

If the database query is unavailable, Agent Pets falls back to:

```bash
opencode session list --format json --max-count 8
```

Agent Pets normalizes the returned session summaries into the shared activity model:

- active assistant/user turns become `running`;
- completed `step-finish: stop` turns become `review`;
- recent inactive sessions become `review`;
- explicit failed/error statuses become `failed`;
- older sessions become `idle`.

## Requirements

- `opencode` must be installed and available on `PATH`.
- The OpenCode CLI must have local session data available for `opencode db` or `opencode session list`.

## Notes

This adapter intentionally uses OpenCode CLI commands instead of opening OpenCode's private database directly from Electron. That keeps the integration read-only and lets OpenCode own its storage migrations.
