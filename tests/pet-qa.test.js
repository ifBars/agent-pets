const { describe, expect, test } = require("bun:test");
const { buildReview, parseArgs, ROWS } = require("../skills/agent-pet-maker/scripts/generate-pet-qa.cjs");

describe("pet QA script", () => {
  test("parses pet qa args", () => {
    const args = parseArgs(["--pet-dir", "pet", "--out=qa"]);
    expect(args.petDir).toBe("pet");
    expect(args.out).toBe("qa");
  });

  test("builds review with row contract and manual checks", () => {
    const review = buildReview({ ok: true, packageDir: "pet", checks: [], spritesheet: { width: 1536, height: 1872 } });
    expect(review.rows).toHaveLength(ROWS.length);
    expect(review.rows.find((row) => row.state === "review").frames).toBe(6);
    expect(review.manualReviewRequired.length).toBeGreaterThan(0);
  });
});
