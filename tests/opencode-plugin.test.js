import { describe, expect, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { AgentPetsOpenCodePlugin } from "../packages/opencode-agent-pets/src/index.mjs";

describe("opencode agent pets plugin", () => {
  test("writes privacy-safe status snapshots from session events", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "agent-pets-plugin-"));
    const statusFile = path.join(dir, "opencode.json");
    const plugin = await AgentPetsOpenCodePlugin(
      {
        directory: "C:\\Users\\ghost\\project",
        worktree: "C:\\Users\\ghost\\project",
        project: { id: "project-1" },
      },
      { statusFile },
    );

    await plugin.event({
      event: {
        type: "session.status",
        properties: {
          sessionID: "oc-live",
          title: "Patch provider",
          status: { type: "running" },
        },
      },
    });
    await plugin.event({
      event: {
        type: "permission.asked",
        properties: {
          sessionID: "oc-live",
          id: "permission-1",
          question: "Can I run a command?",
        },
      },
    });
    await plugin.event({
      event: {
        type: "session.idle",
        properties: {
          sessionID: "oc-live",
          title: "Patch provider",
        },
      },
    });

    const snapshot = JSON.parse(await fs.readFile(statusFile, "utf8"));
    expect(snapshot.provider).toBe("opencode");
    expect(snapshot.sessions).toHaveLength(1);
    expect(snapshot.sessions[0]).toMatchObject({
      id: "oc-live",
      title: "Patch provider",
      cwd: "C:\\Users\\ghost\\project",
      state: "review",
      detail: "session idle",
    });
    expect(JSON.stringify(snapshot)).not.toContain("Can I run a command?");
  });

  test("keeps generated session title when later events omit it", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "agent-pets-plugin-title-"));
    const statusFile = path.join(dir, "opencode.json");
    const plugin = await AgentPetsOpenCodePlugin({}, { statusFile });

    await plugin.event({
      event: {
        type: "session.status",
        properties: {
          sessionID: "oc-title",
          title: "Options trading basics",
          status: { type: "running" },
        },
      },
    });
    await plugin.event({
      event: {
        type: "message.updated",
        properties: {
          sessionID: "oc-title",
        },
      },
    });

    const snapshot = JSON.parse(await fs.readFile(statusFile, "utf8"));
    expect(snapshot.sessions[0].title).toBe("Options trading basics");
  });
});
