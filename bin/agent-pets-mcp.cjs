#!/usr/bin/env node
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const readline = require("node:readline");
const { spawn } = require("node:child_process");

const VALID_STATES = new Set(["idle", "running", "waiting", "failed", "review"]);

function defaultMcpStatusFile() {
  if (process.platform === "win32") {
    const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local");
    return path.join(localAppData, "Agent Pets", "providers", "mcp.json");
  }
  const stateHome = process.env.XDG_STATE_HOME || path.join(os.homedir(), ".local", "state");
  return path.join(stateHome, "agent-pets", "providers", "mcp.json");
}

function normalizeState(value) {
  const state = typeof value === "string" ? value.toLowerCase() : "";
  if (VALID_STATES.has(state)) return state;
  if (["error", "errored", "fail", "failed", "crashed"].includes(state)) return "failed";
  if (["busy", "active", "working", "running", "streaming"].includes(state)) return "running";
  if (["blocked", "needs-input", "waiting", "paused"].includes(state)) return "waiting";
  if (["complete", "completed", "done", "finished", "success", "succeeded", "review"].includes(state)) return "review";
  return "idle";
}

async function writeStatusFile(filePath, input = {}) {
  const resolved = path.resolve(filePath || defaultMcpStatusFile());
  const payload = {
    state: normalizeState(input.state || "running"),
    title: cleanString(input.title) || "MCP agent",
    detail: cleanString(input.detail) || cleanString(input.message) || "Agent activity",
    updatedAt: new Date().toISOString(),
  };
  await fs.mkdir(path.dirname(resolved), { recursive: true });
  await fs.writeFile(resolved, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return { filePath: resolved, payload };
}

function launchAgentPets(input = {}) {
  const statusFile = path.resolve(input.statusFile || defaultMcpStatusFile());
  const pet = cleanString(input.pet);
  const args = ["x", "@ifbars/agent-pets", "--provider", "json-status", "--status-file", statusFile];
  if (pet) args.push("--pet", pet);
  const child = spawn("bun", args, {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });
  child.unref();
  return { statusFile, command: "bun", args };
}

const TOOLS = [
  {
    name: "launch_agent_pets",
    description: "Launch the local Agent Pets desktop companion and attach it to the MCP status file.",
    inputSchema: {
      type: "object",
      properties: {
        pet: { type: "string", description: "Optional Agent Pets pet id to launch." },
        statusFile: { type: "string", description: "Optional JSON status file path. Defaults to Agent Pets local app data." },
      },
    },
  },
  {
    name: "update_agent_pets_status",
    description: "Update Agent Pets with privacy-safe high-level agent status. Do not include prompt or source code text.",
    inputSchema: {
      type: "object",
      properties: {
        state: { type: "string", enum: [...VALID_STATES], description: "High-level agent state." },
        title: { type: "string", description: "Short tool or agent label." },
        detail: { type: "string", description: "Short privacy-safe status detail." },
        statusFile: { type: "string", description: "Optional JSON status file path. Defaults to Agent Pets local app data." },
      },
    },
  },
];

async function callTool(name, args = {}) {
  if (name === "launch_agent_pets") {
    const result = launchAgentPets(args);
    await writeStatusFile(result.statusFile, {
      state: "running",
      title: "MCP agent",
      detail: "Agent Pets launched",
    });
    return textResult(`Agent Pets launched with status file ${result.statusFile}`);
  }
  if (name === "update_agent_pets_status") {
    const result = await writeStatusFile(args.statusFile, args);
    return textResult(`Agent Pets status updated to ${result.payload.state}`);
  }
  return textResult(`Unknown tool: ${name}`, true);
}

async function handleMessage(message) {
  if (!message || typeof message !== "object") return null;
  if (!Object.prototype.hasOwnProperty.call(message, "id")) return null;
  if (message.method === "initialize") {
    return {
      jsonrpc: "2.0",
      id: message.id,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "agent-pets", version: "1.0.4" },
      },
    };
  }
  if (message.method === "tools/list") {
    return { jsonrpc: "2.0", id: message.id, result: { tools: TOOLS } };
  }
  if (message.method === "tools/call") {
    const params = message.params || {};
    const result = await callTool(params.name, params.arguments || {});
    return { jsonrpc: "2.0", id: message.id, result };
  }
  return {
    jsonrpc: "2.0",
    id: message.id,
    error: { code: -32601, message: `Method not found: ${message.method}` },
  };
}

async function main() {
  const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      const response = await handleMessage(JSON.parse(line));
      if (response) process.stdout.write(`${JSON.stringify(response)}\n`);
    } catch (error) {
      process.stdout.write(
        `${JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32700, message: error instanceof Error ? error.message : String(error) } })}\n`,
      );
    }
  }
}

function textResult(text, isError = false) {
  return { content: [{ type: "text", text }], isError };
}

function cleanString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}

module.exports = {
  TOOLS,
  callTool,
  defaultMcpStatusFile,
  handleMessage,
  launchAgentPets,
  main,
  normalizeState,
  writeStatusFile,
};
