# Claude Code Adapter

Agent Pets has two Claude Code paths.

## Local Session Provider

```bash
bun run pets -- --provider claude-code
```

This provider scans recent JSONL files under:

```text
~/.claude/projects
```

It uses timestamps, record types, and error markers to infer `running`, `review`, `failed`, and `idle`. It intentionally summarizes records as event types such as `assistant response` or `user message`; it does not surface prompt or response text in the UI.

Claude Code's CLI documentation exposes commands for starting, continuing, resuming, and printing sessions, but does not expose a stable `session list --json` command for local interactive sessions. The read-only local scanner is therefore the most useful native path for now.

## Status File Fallback

The generic status-file provider is still useful for hooks, wrappers, or teams that want explicit state updates.

Start Agent Pets:

```bash
bun run pets -- --status-file .demo\claude-code-status.json
```

Emit status:

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
