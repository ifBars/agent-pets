# T3Code Adapter

Agent Pets includes a T3Code adapter:

```bash
bun run pets -- --provider t3code
```

The adapter first tries these commands, in order:

```bash
t3code session list --format json --max-count 8
t3 session list --format json --max-count 8
```

Any returned sessions are normalized into the shared Agent Pets state model:

- `running`, `active`, `busy`, or recently updated sessions become `running`.
- `waiting`, `blocked`, or `needs-input` sessions become `waiting`.
- `failed`, `error`, or `crashed` sessions become `failed`.
- recent inactive sessions become `review`.
- old sessions become `idle`.

If no T3Code CLI is available, Agent Pets falls back to read-only Electron local-storage inspection under:

```text
%APPDATA%\t3code
%APPDATA%\t3code-dev
```

That fallback can identify T3Code draft threads across projects and detect a recent unsent draft as `waiting`. It intentionally does not expose draft prompt text in the UI. Older drafts are shown as `idle` so stale app data does not make the pet look active forever.

If T3Code exposes a different command shape, use the status-file provider as a stable fallback:

```bash
bun run pets -- --provider json-status --status-file .demo\t3code-status.json
node bin\agent-pets-emit.cjs --file .demo\t3code-status.json --state running --title "T3Code" --detail "Working"
```
