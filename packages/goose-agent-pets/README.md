# goose-agent-pets

Goose integration for [Agent Pets](https://github.com/ifBars/agent-pets).

Goose supports stdio MCP extensions and custom slash commands backed by recipes, so this package wires Agent Pets into both surfaces:

- `agent-pets` MCP extension
- `/pet` recipe command

## Install

```bash
agent-pets-goose-install
```

This updates Goose `config.yaml` with:

- an `agent-pets` stdio extension using `bunx @ifbars/agent-pets --mcp`
- a `/pet` slash command pointing at the packaged recipe

Then open Goose and run:

```text
/pet
```

## Privacy

The MCP tools only accept high-level state, short title, and short detail fields. Do not send prompt text, source code, secrets, or transcript content as status details.
