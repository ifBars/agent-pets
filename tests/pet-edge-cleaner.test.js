const { describe, expect, test } = require("bun:test");
const { detectFringeColors, parseArgs, parseHexColor, processPixels } = require("../skills/agent-pet-maker/scripts/clean-pet-edges.cjs");

describe("pet edge cleaner", () => {
  test("parses edge cleaner args", () => {
    const args = parseArgs(["--pet-dir", "pet", "--fringe", "#7a45ff", "--tolerance=50", "--in-place"]);
    expect(args.petDir).toBe("pet");
    expect(args.fringe).toEqual([parseHexColor("#7a45ff")]);
    expect(args.tolerance).toBe(50);
    expect(args.inPlace).toBe(true);
  });

  test("removes targeted fringe pixels adjacent to transparency", () => {
    const width = 3;
    const height = 3;
    const pixels = new Uint8ClampedArray(width * height * 4);
    setPixel(pixels, width, 1, 1, 20, 20, 20, 255);
    setPixel(pixels, width, 1, 0, 122, 69, 255, 255);

    const result = processPixels(pixels, width, height, {
      targets: [parseHexColor("#7a45ff")],
      tolerance: 8,
      radius: 1,
    });

    expect(result.changedPixels).toBe(1);
    expect(alphaAt(result.data, width, 1, 0)).toBe(0);
    expect(alphaAt(result.data, width, 1, 1)).toBe(255);
  });

  test("auto-detects purple and green cutout hues without selecting orange", () => {
    const width = 4;
    const height = 2;
    const pixels = new Uint8ClampedArray(width * height * 4);
    setPixel(pixels, width, 0, 0, 122, 69, 255, 255);
    setPixel(pixels, width, 1, 0, 30, 220, 80, 255);
    setPixel(pixels, width, 2, 0, 255, 130, 20, 255);

    const colors = detectFringeColors(pixels, width, height, { radius: 1, maxColors: 4 });
    const hex = colors.map((color) => `#${[color.r, color.g, color.b].map((part) => part.toString(16).padStart(2, "0")).join("")}`);
    expect(hex).toContain("#7a45ff");
    expect(hex).toContain("#1edc50");
    expect(hex).not.toContain("#ff8214");
  });
});

function setPixel(data, width, x, y, r, g, b, a) {
  const offset = (y * width + x) * 4;
  data[offset] = r;
  data[offset + 1] = g;
  data[offset + 2] = b;
  data[offset + 3] = a;
}

function alphaAt(data, width, x, y) {
  return data[(y * width + x) * 4 + 3];
}
