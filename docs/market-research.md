# Market Research

## Current Landscape

### Desktop pet nostalgia

Desktop Goose proved that a small desktop character can become highly shareable. Its page emphasizes prank-like desktop behavior: stealing the mouse, tracking mud, delivering memes, and opening notes. It also has thousands of comments and strong ratings, which confirms demand for desktop-character novelty. The weakness for Agent Pets is also clear: prank behavior triggers trust concerns and can become unusable during real work.

Source: https://samperson.itch.io/desktop-goose

Shimeji-ee and related runners own the classic customizable mascot lane. VShimeji describes Shimeji-ee as a desktop mascot for Windows, macOS, and Linux that wanders around the screen, with actions defined through XML and image sets. Shijima-Qt modernizes that category as a Qt6 cross-platform shimeji desktop pet runner.

Sources:

- https://github.com/Valkryst/VShimeji
- https://github.com/pixelomer/Shijima-Qt

### Local-first AI companion apps

Open Deskmate positions itself as an open-source Windows desktop AI companion for practical work, local control, chat, build workflows, subagents, configuration, and connectors.

Source: https://opendeskmate.com/

Workstream describes a broader local-first developer command center that aggregates engineering tools and includes agent observability. This validates that "agent observability" is becoming a real developer-tool category, not just a novelty.

Source: https://arxiv.org/abs/2604.17055

### Codex-specific adjacent app

CodexPet Nest is close to the Codex pet niche: it gives Codex pets a desktop nest, usage status, widgets, quick actions, local pet management, and community themes. Its current public positioning is nest/widget/marketplace-oriented, with macOS first and Windows/Linux planned.

Source: https://codexpet.app/

## Opportunity

Agent Pets should not compete as a generic desktop companion or a Codex pet marketplace. The stronger position is:

> A local-first ambient agent monitor that uses Codex-compatible pets as the status surface for coding agents.

That makes the project useful even when the novelty wears off. The core job is not "cute pet exists on desktop." It is "my agent work is visible without reopening Codex."

## Differentiation

- Practical status surface: `running`, `waiting`, `failed`, `review`, and `idle` map to real agent state.
- Local-only by default: read local session files, do not proxy prompts or repos.
- Compatible with existing Codex pet packages.
- Agent-agnostic roadmap: add providers for Claude Code, Aider, OpenCode, Goose, and generic JSON status feeds.
- Creator tooling: provide skills and validators so agents can create clean pet assets without matte halos, bad transparency, state drift, or broken atlases.
- Demo-friendly: one screen can show Codex doing work while the pet reacts on the desktop.

## Initial Audience

- Codex Desktop users who already enjoy custom pets.
- Developers running long agent tasks who want a low-friction status peripheral.
- Agent-tool builders who need a fun but practical local status output.
- OSS contributors interested in pet packs and agent-provider adapters.

## Risks

- Codex session internals are not a public API. The provider must be defensive and documented as best-effort.
- Desktop overlays need strong trust boundaries. No hidden injection, no remote code, no invasive input grabbing.
- The exact package name `pets` may not be available or may be too generic. Use `agent-pets` as the project/package name and keep `pets` as a command alias only if publishable.
- Pet creation can produce poor artifacts without a strict pipeline. Use hatch-pet plus PromisePals-style edge diagnostics and visual QA.
