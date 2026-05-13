# Package And Creator Spec

## Codex-Compatible Pet Package

```text
<pet-id>/
  pet.json
  spritesheet.webp
```

`pet.json`:

```json
{
  "id": "pet-id",
  "displayName": "Pet Name",
  "description": "One short sentence.",
  "spritesheetPath": "spritesheet.webp"
}
```

## Atlas

- `1536x1872`.
- `8` columns by `9` rows.
- `192x208` cells.
- PNG or WebP.
- Transparent background.
- No labels, gutters, guide marks, UI text, scenery, floor shadows, or detached effects.

## Rows

| Row | State | Frames |
| --- | --- | ---: |
| 0 | idle | 6 |
| 1 | running-right | 8 |
| 2 | running-left | 8 |
| 3 | waving | 4 |
| 4 | jumping | 5 |
| 5 | failed | 8 |
| 6 | waiting | 6 |
| 7 | running | 6 |
| 8 | review | 6 |

Unused cells after the frame count must be fully transparent.

## Creator Pipeline

Use this discipline from hatch-pet and PromisePals:

1. Create a canonical base look first.
2. Generate animation rows from that base reference.
3. Use deterministic scripts only for extraction, validation, packaging, and diagnostics.
4. Do not draw, tile, or synthesize final pet art with local scripts as a substitute for image generation.
5. Validate geometry before wiring.
6. Visually inspect contact sheets before accepting the pet.
7. Repair the smallest failing scope: frame, row, then full atlas only if needed.

## Validation Command

Agents should run this before installing or sharing a pet package:

```bash
bun run validate:pet -- C:\path\to\pet-folder
```

The validator checks manifest shape, path traversal, image format, and atlas dimensions. Visual QA is still required for transparent unused cells, matte halos, and identity consistency.

Generate a contact sheet and QA report:

```bash
bun run qa:pet -- --pet-dir C:\path\to\pet-folder --out C:\path\to\qa-output
```

Outputs:

```text
contact-sheet.png
review.json
```

## Artifact Checks

Block the package if any of these appear:

- Green or magenta matte halos from chroma-key cleanup.
- Binary GIF-style stair stepping on antialiased edges.
- Detached sparkles, punctuation, wave marks, speed lines, dust, glows, shadows, or scenery.
- Frame numbers, text, UI, guide boxes, or checkerboard backgrounds.
- Identity drift between rows.
- Cropped body parts or slot-crossing poses.
- Non-transparent unused cells.
- State rows that are just geometric transforms of one image.

## Agent Skill Strategy

Ship a generic skill under `skills/agent-pet-maker/SKILL.md`. It should not be Codex-only. It should teach other agents the package format, the row states, the visual QA rules, and the need to inspect the target renderer contract before claiming an asset works.
