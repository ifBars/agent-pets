# T3Code Adapter

Agent Pets includes a T3Code command-session adapter:

```bash
bun run pets -- --provider t3code
```

The adapter tries these commands, in order:

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

If T3Code exposes a different command shape, use the status-file provider as a stable fallback:

```bash
bun run pets -- --provider json-status --status-file .demo\t3code-status.json
node bin\agent-pets-emit.cjs --file .demo\t3code-status.json --state running --title "T3Code" --detail "Working"
```
