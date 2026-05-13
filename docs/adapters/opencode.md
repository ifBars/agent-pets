# OpenCode Adapter

Agent Pets can monitor OpenCode without a custom daemon by shelling out to the OpenCode CLI:

```bash
bun run pets -- --provider opencode
```

The provider reads:

```bash
opencode session list --format json --max-count 8
```

Agent Pets normalizes the returned session summaries into the shared activity model:

- recently updated sessions become `running`;
- recent inactive sessions become `review`;
- explicit failed/error statuses become `failed`;
- older sessions become `idle`.

## Requirements

- `opencode` must be installed and available on `PATH`.
- The OpenCode CLI must have local session data available for `opencode session list`.

## Notes

This adapter intentionally uses the public CLI command instead of reading OpenCode's private storage files directly. That keeps the first integration stable across storage migrations.
