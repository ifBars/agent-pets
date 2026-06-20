# aider-agent-pets

Aider integration notes for [Agent Pets](https://github.com/ifBars/agent-pets).

Aider's default chat history file contains transcript text, so Agent Pets does not parse it for status details. The preferred integration uses Aider's documented `notifications-command` hook to write a privacy-safe status file when Aider is ready for input.

## Install

From a repository where you run Aider:

```bash
agent-pets-aider-install
```

This adds the notification bridge to `.aider.conf.yml`:

```yaml
notifications: true
notifications-command: "bunx @ifbars/agent-pets --aider-notify"
```

Run Agent Pets in Aider mode:

```bash
agent-pets --provider aider
```

You can also launch it from inside Aider with `/run`:

```text
/run bunx @ifbars/agent-pets --provider aider
```

## Privacy

The Aider provider reads the notification status file written by `agent-pets-aider-notify`. If that file is missing, it may use `.aider.chat.history.md` modification time as a fallback, but it does not read transcript contents.
