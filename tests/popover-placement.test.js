import { describe, expect, test } from "bun:test";
import { calculatePopoverLayout } from "../build/src/main/popover-placement.js";

describe("popover placement", () => {
  test("constrains the settings popover above the pet instead of covering it", () => {
    const layout = calculatePopoverLayout({
      appWidth: 360,
      petRect: { left: 124, top: 196, width: 112, height: 122 },
      popoverWidth: 276,
      popoverHeight: 198,
      constrainAbove: true,
    });

    expect(layout.top).toBe(8);
    expect(layout.maxHeight).toBe(180);
    expect(layout.top + layout.height + 8).toBeLessThanOrEqual(196);
  });

  test("keeps popovers at natural height when there is room above the pet", () => {
    const layout = calculatePopoverLayout({
      appWidth: 420,
      petRect: { left: 154, top: 210, width: 112, height: 122 },
      popoverWidth: 330,
      popoverHeight: 132,
      constrainAbove: false,
    });

    expect(layout.maxHeight).toBeNull();
    expect(layout.height).toBe(132);
    expect(layout.top).toBe(70);
  });

  test("constrains tall activity popovers above the pet", () => {
    const layout = calculatePopoverLayout({
      appWidth: 420,
      petRect: { left: 154, top: 176, width: 112, height: 122 },
      popoverWidth: 330,
      popoverHeight: 326,
      constrainAbove: true,
    });

    expect(layout.maxHeight).toBe(160);
    expect(layout.top + layout.height + 8).toBeLessThanOrEqual(176);
  });
});
