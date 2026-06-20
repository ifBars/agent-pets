# Provider Research

Short-lived notes for deciding which Agent Pets providers to add next. Keep this grounded in public usage signals and local-first integration quality.

## 2026-05-17 Snapshot

Gemini CLI was the first expansion target after Codex, OpenCode, Claude Code, and T3Code because it appears repeatedly beside those tools in current CLI-agent comparisons and local-session browser discussions. Its provider surface is also practical: official Gemini CLI docs describe automatic local session storage under `~/.gemini/tmp/<project_hash>/chats/`, and the recorded JSONL metadata is enough for privacy-safe status without rendering prompt or response text.

Gemini CLI also has a useful `/pet`-style integration surface: global custom commands live in `~/.gemini/commands/`, and extensions can contribute command prompts through `gemini-extension.json`. This is weaker than OpenCode's direct TUI plugin API because the command is a prompt template that asks Gemini to run a detached shell command, but it gives Gemini users the same memorable entry point.

Existing pet/companion products show that users value three things more than heavy dashboards:

- Codex-compatible pet packages and galleries.
- Local desktop companions that can reflect agent state across tools.
- Simple setup paths for the agents they already use.

More detailed usage signals:

- OpenPets leads with "one command" setup and positions integrations as drop-in companions for the tools users already run. Its public site lists Claude Code, OpenCode, Pi, CLI/shell scripts, generic MCP, and Cursor, while marking VS Code/Copilot, Windsurf, and Zed as planned surfaces. That argues for broad MCP coverage first, then provider-native hooks/plugins where the host exposes them.
- OpenPets' GitHub README frames the product around visible progress, tool use, test runs, approvals, completion, and errors, not around transcript browsing. Its integration model has three layers: MCP tools, agent instructions, and hooks/plugins for automatic reactions. Agent Pets should keep mirroring that shape: explicit MCP launch/update tools plus lightweight host-specific `/pet` commands and hooks when available.
- Coding Pets currently presents 29 Codex pet packages with per-pet download/view counts, 9-state sprites, and sorting by newest/name/downloads/views. The visible top entries are mostly user-submitted, fandom-inspired, or personality-driven. This suggests the catalog side should stay compatible with Codex pet packages and make install/share paths obvious rather than overfitting to a single bundled mascot.
- OpenPets' gallery advertises 1090 companions and a submit-a-pet flow based on an issue template, sprite sheet review, and one-command install. The repeated pattern across products is community contribution plus quick adoption, so provider work should not make pet packaging harder or require remote accounts.

Useful next-provider candidates:

- `claude-code`: already had a JSONL provider, but the higher-value surface is official Claude Code MCP plus hooks and slash-command skills. Claude Code documents `.mcp.json` project MCP servers, `.claude/settings.local.json` hooks, and `.claude/skills/` skills invocable via slash command, so Agent Pets now installs all three and uses the hook status file before falling back to JSONL metadata.
- `cursor`: strong market signal and OpenPets already positions Cursor as an MCP/project-rules integration target. Cursor's current docs support stdio MCP servers in `~/.cursor/mcp.json`, so Agent Pets exposes a generic MCP bridge instead of pretending Cursor has a local chat-history provider.
- `aider`: common CLI-agent comparison target. Aider's default `.aider.chat.history.md` contains transcript text, so Agent Pets uses Aider's documented `notifications-command` as the preferred status bridge and only uses chat-history mtime as a fallback.
- `goose`: appears in terminal-agent comparisons and is a strong fit for integration. Goose supports stdio MCP extensions in `config.yaml` plus custom slash commands backed by recipe files, so Agent Pets uses the generic MCP bridge and installs a `/pet` recipe command.
- `github-copilot-cli`: now has a practical integration surface. Current GitHub docs describe user-level MCP config at `~/.copilot/mcp-config.json`, hooks under `~/.copilot/hooks/`, skills under `~/.copilot/skills/`, and `/skills` user invocation, so Agent Pets can support Copilot CLI through MCP, hooks, and a `/pet` skill without scraping session event logs.
- `windsurf`: a high-signal editor-agent surface. Windsurf Cascade documents raw MCP config at `~/.codeium/windsurf/mcp_config.json` and workflow files under `.windsurf/workflows/` that can be invoked as slash commands, so Agent Pets installs both an MCP bridge and a workspace `/pet` workflow.
- `cline`: a popular VS Code/CLI coding-agent surface. Cline documents MCP settings under `~/.cline/data/settings/cline_mcp_settings.json` and global skills under `~/.cline/skills/`, with skills invocable as slash commands, so Agent Pets installs both an MCP bridge and a `/pet` skill.
- `continue`: common open-source assistant surface. Continue documents workspace MCP blocks under `.continue/mcpServers/`; no equivalent `/pet` slash-command surface was found, so Agent Pets installs a workspace MCP block and documents the prompt-based flow.
- `zed`: OpenPets marks Zed as a planned MCP+rules surface. Current Zed docs use `context_servers` in `settings.json` for Agent Panel MCP servers and rules via `.rules` or the Rules Library. No documented custom `/pet` slash-command file format was found, so Agent Pets installs a Zed MCP context server only and documents the prompt-based flow.
- `warp`: popular terminal-agent surface with a strong fit for Agent Pets. Warp documents Agent Mode MCP servers through project `.warp/.mcp.json` config, so Agent Pets installs a workspace MCP server. Warp Drive saved prompts can provide a `/pet`-style flow, but no documented local saved-prompt file format was found, so Agent Pets documents the manual saved-prompt setup instead of writing undocumented files.

Sources checked:

- https://google-gemini.github.io/gemini-cli/docs/cli/session-management.html
- https://google-gemini.github.io/gemini-cli/docs/cli/custom-commands.html
- https://github.com/google-gemini/gemini-cli
- https://code.claude.com/docs/en/mcp
- https://code.claude.com/docs/en/slash-commands
- https://code.claude.com/docs/en/hooks
- https://code.claude.com/docs/en/settings
- https://cursor.com/docs/mcp
- https://cursor.com/docs/rules
- https://aider.chat/docs/config/aider_conf.html
- https://aider.chat/docs/usage/notifications.html
- https://aider.chat/docs/usage/commands.html
- https://github.com/aaif-goose/goose
- https://github.com/aaif-goose/goose/blob/main/documentation/docs/guides/config-files.md
- https://github.com/aaif-goose/goose/blob/main/documentation/docs/guides/context-engineering/slash-commands.md
- https://openpets.dev/
- https://codingpets.com/
- https://www.codex-pet.com/
- https://github.com/alvinunreal/openpets
- https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-config-dir-reference
- https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-command-reference
- https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/use-hooks
- https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-skills
- https://docs.windsurf.com/windsurf/cascade/mcp
- https://docs.windsurf.com/plugins/cascade/workflows
- https://docs.cline.bot/getting-started/config
- https://docs.cline.bot/core-workflows/using-commands
- https://docs.cline.bot/customization/skills
- https://docs.continue.dev/customize/deep-dives/mcp
- https://zed.dev/docs/ai/mcp
- https://zed.dev/docs/configuring-zed
- https://zed.dev/docs/ai/rules
- https://docs.warp.dev/agent-platform/capabilities/mcp
