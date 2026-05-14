# opencode-agent-pets

OpenCode plugin that bridges realtime session status to [Agent Pets](https://github.com/ifBars/agent-pets).

## Quick Start

Install the plugin globally:

```bash
opencode plugin opencode-agent-pets --global
```

Open OpenCode, then toggle the desktop pet:

```text
/pet
```

The plugin launches Agent Pets in OpenCode mode and keeps the pet updated with realtime session status.

## Local Checkout

```bash
bun run opencode:install-local
```

Then open OpenCode and run:

```text
/pet
```

You can also add the published plugin directly to `opencode.json`:

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
