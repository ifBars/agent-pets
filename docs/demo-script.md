# Demo Script

Target length: 25-35 seconds.

## Shot List

1. Show a desktop with Codex open and a custom pet visible.
2. Terminal: `bun run pets`.
3. Agent Pets appears as the same pet outside Codex.
4. Start a Codex task.
5. Pet switches into `running`; activity panel shows the active thread.
6. Codex reaches a response or a user-wait state.
7. Pet switches into `review` or `waiting`.
8. Quick close: "Codex-compatible pets. Local-only agent status. Open source."

## Controlled Demo Driver

For a clean recording, run the status driver in one terminal:

```bash
bun run demo:status
```

Then launch the app against the generated status file:

```bash
bun run pets -- --status-file .demo\agent-status.json
```

This cycles through `idle`, `running`, `waiting`, `review`, and `failed` so the video can show every pet state without depending on live Codex timing.

Generate a still demo image from the actual renderer:

```bash
bun run demo:screenshot
```

Output:

```text
docs/demo/agent-pets-demo.png
```

Generate a short MP4 from the actual renderer:

```bash
bun run demo:video
```

Output:

```text
docs/demo/agent-pets-demo.mp4
```

## X Post Draft

I wanted Codex pets to leave Codex, so I started building Agent Pets.

It loads your local Codex pet packages and turns them into a desktop status monitor for agent work: running, waiting, failed, review, idle.

Local-first, open source, and built around the existing Codex pet format.

## Demo Notes

- Use a high-contrast desktop background.
- Keep the pet window near Codex so the relationship is obvious.
- Avoid showing private prompt text.
- Show the local package path or README briefly to make it feel real.
