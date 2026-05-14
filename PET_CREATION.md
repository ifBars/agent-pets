# Make a Custom Pet

Agent Pets uses Codex-compatible pet packages. A pet lives in its own folder under `~/.codex/pets`:

```text
~/.codex/pets/my-pet/
  pet.json
  spritesheet.webp
```

## Manifest

```json
{
  "id": "my-pet",
  "displayName": "My Pet",
  "description": "A short description.",
  "spritesheetPath": "spritesheet.webp"
}
```

## Spritesheet Contract

- `1536x1872`
- `8x9` grid
- `192x208` cells
- PNG or WebP
- Transparent background
- Unused cells fully transparent

## Build Workflow

Use the `agent-pet-maker` or `hatch-pet` skill workflow to generate the pet, then validate it:

```bash
bun run validate:pet -- ~/.codex/pets/my-pet
```

If the cutout has a thin green, purple, or colored fringe, clean the edge before QA:

```bash
bun run clean:pet-edges -- --pet-dir ~/.codex/pets/my-pet --in-place
```

Run the QA helper:

```bash
bun run qa:pet -- --pet-dir ~/.codex/pets/my-pet --out ./my-pet-qa
```

Launch it as a desktop-only companion:

```bash
bun run agent-pets -- --provider desktop --pet my-pet
```

Desktop mode is manual in v1. It does not inspect active windows, browser tabs, document titles, or game process state.
