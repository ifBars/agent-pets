# opencode-agent-pets

OpenCode plugin that bridges realtime session status to [Agent Pets](https://github.com/ifBars/agent-pets).

## Install

From an Agent Pets checkout, install locally:

```bash
bun run opencode:install-local
```

Then run OpenCode and toggle the desktop pet:

```text
/pet
```

For a published package:

```bash
opencode plugin opencode-agent-pets --global
```

Or add it to `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-agent-pets"]
}
```

## Status File

By default the plugin writes:

- Windows: `%LOCALAPPDATA%\Agent Pets\providers\opencode.json`
- macOS/Linux: `$XDG_STATE_HOME/agent-pets/providers/opencode.json` or `~/.local/state/agent-pets/providers/opencode.json`

Override it with:

```bash
AGENT_PETS_OPENCODE_STATUS_FILE=/path/to/opencode.json opencode
```

The file contains session metadata only: session id, title, working directory, state, detail, and timestamps. It does not write prompts, responses, tool arguments, or permission text.
