# zed-agent-pets

Zed Agent Panel integration for [Agent Pets](https://github.com/ifBars/agent-pets).

## Install

```bash
agent-pets-zed-install
```

The installer writes an `agent-pets` entry under `context_servers` in the Zed user settings file:

- macOS/Linux: `~/.config/zed/settings.json` or `$XDG_CONFIG_HOME/zed/settings.json`
- Windows: `%APPDATA%\Zed\settings.json`

## Usage

Open Zed's Agent Panel and ask it to launch Agent Pets or update the pet status. Zed exposes this integration as MCP tools through `context_servers`; it does not currently provide a documented custom `/pet` slash-command file format.

The MCP tools send only high-level state such as `running`, `waiting`, `failed`, and `review`. Do not include prompt text, source code, diffs, or private conversation content in status updates.
