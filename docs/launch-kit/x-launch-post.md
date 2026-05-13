# X Launch Post

## Short Post

I started building Agent Pets: Codex-compatible pets that leave Codex and live on your desktop as a local-first status monitor for AI coding agents.

Running, waiting, failed, review, idle.

It loads your local Codex pet packages and also supports a generic JSON status file for other agents.

Demo:

## Thread Draft

1. Codex pets are great, but they are trapped inside Codex. I wanted them on the desktop where they could be useful while long agent tasks run.

2. Agent Pets loads the same local pet package shape Codex uses: `pet.json` plus a `1536x1872` spritesheet.

3. It maps agent work into pet states: `running`, `waiting`, `failed`, `review`, and `idle`.

4. Codex support is local-first and read-only. It watches local session metadata; it does not upload prompts, source code, or logs.

5. Other agents can integrate through a tiny status file or the `agent-pets-emit` CLI.

6. I also added a pet-maker skill and validator so agents can create compatible pets without broken atlases, path traversal, or obvious generation artifacts.

7. Still early, but already demoable: desktop app, Windows build, status provider, validator, demo media, release workflow, and docs.

## Demo Caption

Codex pet, outside Codex.

Agent Pets turns local AI-agent activity into a tiny desktop status surface: running, waiting, failed, review, idle.

Local-first. Open source. Built around the existing Codex pet format.
