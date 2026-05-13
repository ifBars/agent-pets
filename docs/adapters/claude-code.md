# Claude Code Adapter

Agent Pets can monitor Claude Code today through the generic status-file provider. The smallest integration is to let Claude Code, a shell hook, or a task wrapper call `agent-pets-emit` whenever work starts, waits, completes, or fails.

## Start Agent Pets

```bash
bun run pets -- --status-file .demo\claude-code-status.json
```

## Emit Status

```bash
node bin\agent-pets-emit.cjs --file .demo\claude-code-status.json --state running --title "Claude Code" --detail "Editing project files"
node bin\agent-pets-emit.cjs --file .demo\claude-code-status.json --state waiting --title "Claude Code" --detail "Waiting for approval"
node bin\agent-pets-emit.cjs --file .demo\claude-code-status.json --state review --title "Claude Code" --detail "Patch ready for review"
node bin\agent-pets-emit.cjs --file .demo\claude-code-status.json --state failed --title "Claude Code" --detail "Command failed"
```

## State Mapping

| Claude Code situation | Agent Pets state |
| --- | --- |
| Tool call, edit, test, or search running | `running` |
| Approval, prompt, or user decision needed | `waiting` |
| Work complete and ready to inspect | `review` |
| Command, build, or test failed | `failed` |
| Nothing active | `idle` |

This adapter is intentionally file-based. It does not require a Claude Code plugin API, does not read prompts, and does not upload repository content.
