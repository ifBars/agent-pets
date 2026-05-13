---
name: agent-pet-maker
description: Create, validate, and package Agent Pets / Codex-compatible desktop pet assets for local agent status monitors. Use when an agent needs to make or repair a pet spritesheet, document a pet contract, or port a pet into another agent UI.
---

# Agent Pet Maker

## Goal

Create pets that work as real app assets, not loose concept art. Keep visual generation, deterministic validation, packaging, and app wiring separate.

## Renderer Contract First

Before creating assets, inspect the target renderer contract. Do not assume a dropped spritesheet will animate correctly.

For Agent Pets and Codex-compatible packages:

- Atlas: `1536x1872`.
- Grid: `8x9`.
- Cell: `192x208`.
- Format: PNG or WebP.
- Background: transparent.
- Package files: `pet.json` plus `spritesheet.webp`.

## Rows

- Row 0: `idle`, 6 frames.
- Row 1: `running-right`, 8 frames.
- Row 2: `running-left`, 8 frames.
- Row 3: `waving`, 4 frames.
- Row 4: `jumping`, 5 frames.
- Row 5: `failed`, 8 frames.
- Row 6: `waiting`, 6 frames.
- Row 7: `running`, 6 frames.
- Row 8: `review`, 6 frames.

Unused cells must be fully transparent.

## Generation Workflow

1. Establish the pet name, description, visual identity, and renderer target.
2. Generate a canonical base look first.
3. Generate animation rows from the canonical base reference.
4. Use deterministic scripts only for extracting, validating, packaging, and diagnostics.
5. Do not draw, tile, mirror, or synthesize final pet visuals with code unless the renderer contract explicitly permits it and the user approves the exception.
6. Mirror `running-left` from `running-right` only when the pet is symmetric and the mirror preserves markings, props, lighting, and direction semantics.
7. Repair the smallest failing scope first.

## Visual Rules

Use compact digital-pet sprite style:

- readable at small sizes
- simple silhouette
- limited palette
- dark outline
- flat shading
- simple face
- no UI text
- no scenery

Avoid:

- detached sparkles, punctuation, speech bubbles, wave marks, speed lines, dust, glows, shadows, smears, floor marks
- frame numbers, guide boxes, visible grids, checkerboards, labels, code snippets
- tiny props that disappear at `192x208`
- high-detail illustration, realistic texture, glossy icon rendering

## Transparency And Edge QA

Generated strips often fail at the edges. Inspect on multiple backgrounds, not only transparent preview.

Block acceptance when you see:

- green or magenta matte halos
- edge fringing after chroma-key cleanup
- binary transparency stair steps
- semi-transparent dust or glow
- chroma-key-adjacent colors inside the subject
- cropped parts or slot-crossing poses

Dimension checks are necessary but not sufficient. Always inspect a contact sheet.

## Package Manifest

```json
{
  "id": "pet-id",
  "displayName": "Pet Name",
  "description": "One short sentence.",
  "spritesheetPath": "spritesheet.webp"
}
```

## Validation

Run the project validator before installing or sharing a pet:

```bash
bun run validate:pet -- C:\path\to\pet-folder
```

Passing validation only proves the manifest path and atlas dimensions are structurally compatible. It does not replace visual QA.

Generate contact-sheet QA:

```bash
bun run qa:pet -- --pet-dir C:\path\to\pet-folder --out C:\path\to\qa-output
```

Open `contact-sheet.png` and inspect every row before accepting the pet.

## Generic Status Integration

Other agents can drive Agent Pets by writing a status file and launching:

```bash
bun run pets -- --status-file C:\path\to\agent-status.json
```

Status schema:

```json
{
  "state": "running",
  "title": "Agent name",
  "detail": "Current action",
  "updatedAt": "2026-05-13T10:00:00.000Z"
}
```

Use only these states: `idle`, `running`, `waiting`, `failed`, and `review`.

## Acceptance Criteria

- Atlas is PNG or WebP, `1536x1872`.
- Every used cell contains a complete pose.
- Every unused cell is fully transparent.
- Rows preserve the same pet identity.
- States read correctly at desktop-pet size.
- Contact sheet has been visually inspected.
- Manifest and spritesheet live together.
