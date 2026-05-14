const { describe, expect, test } = require("bun:test");
const fs = require("node:fs");
const path = require("node:path");

describe("renderer layout", () => {
  test("opening popovers does not translate the pet stage", () => {
    const css = fs.readFileSync(path.join(__dirname, "..", "src", "renderer.css"), "utf8");
    const renderer = fs.readFileSync(path.join(__dirname, "..", "src", "renderer.js"), "utf8");

    expect(css).not.toContain("#app.activity-open .pet-stage");
    expect(css).not.toContain("#app.settings-open .pet-stage");
    expect(renderer).not.toContain("requiredPetShift");
  });

  test("pet is visibly draggable and thread cards stay compact", () => {
    const css = fs.readFileSync(path.join(__dirname, "..", "src", "renderer.css"), "utf8");
    const main = fs.readFileSync(path.join(__dirname, "..", "src", "main.ts"), "utf8");

    expect(css).toContain("bottom: 36px");
    expect(css).toContain("transform: translateX(-50%)");
    expect(main).toContain("height: bounds.height || 520");
    expect(main).toContain("minHeight: 460");
    expect(css).toContain("cursor: grab");
    expect(css).toContain("cursor: grabbing");
    expect(css).toContain("width: min(300px, calc(100vw - 24px))");
    expect(css).toContain("min-height: 34px");
  });

  test("badge counts actionable sessions instead of every review row", () => {
    const renderer = fs.readFileSync(path.join(__dirname, "..", "src", "renderer.js"), "utf8");

    expect(renderer).toContain("sessions.filter(isBadgeSession).length");
    expect(renderer).toContain('session?.state === "running"');
    expect(renderer).toContain('session?.state === "waiting"');
    expect(renderer).toContain('session?.state === "failed"');
  });

  test("thread popover can hide overflow rows before covering the pet", () => {
    const css = fs.readFileSync(path.join(__dirname, "..", "src", "renderer.css"), "utf8");
    const renderer = fs.readFileSync(path.join(__dirname, "..", "src", "renderer.js"), "utf8");

    expect(css).toContain(".session-item[hidden]");
    expect(renderer).toContain("fitThreadPopoverToAvailableHeight");
    expect(renderer).toContain("visualPetClearanceTop");
    expect(renderer).toContain("items[index].hidden = true");
    expect(renderer).toContain("petClearanceTop - height - gap");
  });

  test("settings menu is compact enough to open above the visible pet", () => {
    const css = fs.readFileSync(path.join(__dirname, "..", "src", "renderer.css"), "utf8");
    const renderer = fs.readFileSync(path.join(__dirname, "..", "src", "renderer.js"), "utf8");

    expect(css).toContain("height: 26px");
    expect(css).toContain("margin-bottom: 5px");
    expect(renderer).toContain("const petClearanceTop = visualPetClearanceTop(basePetRect)");
    expect(renderer).toContain("return rect.top;");
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
