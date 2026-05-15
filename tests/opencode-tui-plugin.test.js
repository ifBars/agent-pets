import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { AgentPetsOpenCodeTuiPlugin, resolveLaunchOptions } from "../packages/opencode-agent-pets/src/tui.mjs";
import opencodeTuiPlugin from "../packages/opencode-agent-pets/src/opencode-tui.mjs";

describe("opencode agent pets tui plugin", () => {
  test("exports an OpenCode TUI plugin module object", () => {
    expect(opencodeTuiPlugin).toMatchObject({
      id: "agent-pets.tui",
      tui: AgentPetsOpenCodeTuiPlugin,
    });
  });

  test("registers a slash pet command that toggles Agent Pets", async () => {
    let commands = [];
    const toggles = [];
    const toasts = [];

    await AgentPetsOpenCodeTuiPlugin(
      {
        command: {
          register(callback) {
            commands = callback();
            return () => {};
          },
        },
        ui: {
          toast(input) {
            toasts.push(input);
          },
        },
      },
      {
        toggle: async () => {
          toggles.push("called");
          return { state: "started", message: "Agent Pets opened" };
        },
      },
    );

    expect(commands).toHaveLength(1);
    expect(commands[0].slash).toEqual({ name: "pet" });
    await commands[0].onSelect();
    expect(toggles).toEqual(["called"]);
    expect(toasts[0]).toMatchObject({ variant: "success", message: "Agent Pets opened" });
  });

  test("registers slash command through keymap layers when available", async () => {
    let layer = null;
    const toggles = [];

    await AgentPetsOpenCodeTuiPlugin(
      {
        keymap: {
          registerLayer(input) {
            layer = input;
          },
        },
        ui: {
          toast() {},
        },
      },
      {
        toggle: async () => {
          toggles.push("called");
          return { state: "started", message: "Agent Pets opened" };
        },
      },
    );

    expect(layer.commands[0]).toMatchObject({
      name: "agent-pets.toggle",
      slashName: "pet",
    });
    await layer.commands[0].run();
    expect(toggles).toEqual(["called"]);
  });

  test("defaults to the agent-pets launcher script", () => {
    const source = fs.readFileSync(path.join(import.meta.dir, "..", "packages", "opencode-agent-pets", "src", "tui.mjs"), "utf8");

    expect(source).toContain('["run", "agent-pets", "--", "--provider", "opencode"]');
    expect(source).not.toContain('["run", "pets", "--"');
  });

  test("uses the repo launcher from a local checkout", async () => {
    await expect(resolveLaunchOptions()).resolves.toMatchObject({
      command: "bun",
      args: ["run", "agent-pets", "--", "--provider", "opencode"],
      cwd: path.join(import.meta.dir, ".."),
    });
  });

  test("uses the published app package when no local checkout is present", async () => {
    const packageDir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-pets-plugin-package-"));
    fs.writeFileSync(path.join(packageDir, "package.json"), JSON.stringify({ name: "opencode-agent-pets" }));

    await expect(resolveLaunchOptions({ packageRootStartDir: packageDir })).resolves.toMatchObject({
      command: "bun",
      args: ["x", "@ifbars/agent-pets", "--provider", "opencode"],
      cwd: os.homedir(),
    });
  });
});
