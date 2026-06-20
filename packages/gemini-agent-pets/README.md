# gemini-agent-pets

Gemini CLI integration for [Agent Pets](https://github.com/ifBars/agent-pets).

It adds a `/pet` custom command that launches Agent Pets in Gemini CLI provider mode.

## Install

Install the custom command globally:

```bash
agent-pets-gemini-install
```

Then open Gemini CLI and run:

```text
/pet
```

You can pass a pet id:

```text
/pet pingu
```

## Manual Install

Copy `commands/pet.toml` to:

- Windows: `%USERPROFILE%\.gemini\commands\pet.toml`
- macOS/Linux: `~/.gemini/commands/pet.toml`

Gemini CLI custom commands are prompt templates. The `/pet` command asks Gemini to launch Agent Pets as a detached local process with `bunx @ifbars/agent-pets --provider gemini-cli`.
