const { describe, expect, test } = require("bun:test");
const fs = require("node:fs");
const path = require("node:path");

describe("renderer layout", () => {
  test("opening the activity popover does not translate the pet stage", () => {
    const css = fs.readFileSync(path.join(__dirname, "..", "src", "renderer.css"), "utf8");

    expect(css).not.toContain("#app.activity-open .pet-stage");
    expect(css).toContain("#app.settings-open .pet-stage");
  });

  test("pet is visibly draggable and thread cards stay compact", () => {
    const css = fs.readFileSync(path.join(__dirname, "..", "src", "renderer.css"), "utf8");

    expect(css).toContain("cursor: grab");
    expect(css).toContain("cursor: grabbing");
    expect(css).toContain("width: min(300px, calc(100vw - 24px))");
  });

  test("transparent app space is click-through except explicit hit targets", () => {
    const css = fs.readFileSync(path.join(__dirname, "..", "src", "renderer.css"), "utf8");
    const main = fs.readFileSync(path.join(__dirname, "..", "src", "main.ts"), "utf8");
    const preload = fs.readFileSync(path.join(__dirname, "..", "src", "preload.ts"), "utf8");
    const renderer = fs.readFileSync(path.join(__dirname, "..", "src", "renderer.js"), "utf8");

    expect(css).toMatch(/body\s*\{\s*pointer-events:\s*none;/);
    expect(css).toContain("pointer-events: auto");
    expect(main).toContain('ipcMain.on("window:set-ignore-mouse-events"');
    expect(main).toContain("win.setIgnoreMouseEvents(Boolean(ignore)");
    expect(preload).toContain("setIgnoreMouseEvents");
    expect(renderer).toContain("setWindowMousePassthrough(true)");
    expect(renderer).toContain("document.elementsFromPoint");
  });
});
