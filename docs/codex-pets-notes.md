# Codex Pets Notes

## Asset Contract

Codex custom pets live under:

```text
${CODEX_HOME:-$HOME/.codex}/pets/<pet-id>/
  pet.json
  spritesheet.webp
```

The manifest shape is:

```json
{
  "id": "signal",
  "displayName": "Signal",
  "description": "One short sentence.",
  "spritesheetPath": "spritesheet.webp"
}
```

The spritesheet must be a PNG or WebP atlas sized `1536x1872`, which is an `8 x 9` grid of `192x208` cells.

## Loader Behavior

The packaged Codex desktop app has a `custom-avatars` bridge. It reads both legacy `${CODEX_HOME}/avatars/<id>/avatar.json` and current `${CODEX_HOME}/pets/<id>/pet.json`, validates that `spritesheetPath` stays inside the pet folder, reads the image as base64, accepts only `1536x1872` PNG/WebP files, and returns renderer records with ids like `custom:<folder-name>`.

The renderer merges those records after the built-in pets. A custom pet uses `assetRef: "codex"` as a fallback but provides `spritesheetUrl`, which overrides the bundled built-in atlas.

## Animation Contract

The renderer uses CSS on `.codex-avatar-root`:

```css
aspect-ratio: 192 / 208;
image-rendering: pixelated;
background-repeat: no-repeat;
background-size: 800% 900%;
```

Animation is done by setting `background-position`:

```js
`${columnIndex / 7 * 100}% ${rowIndex / 8 * 100}%`
```

Rows and timings:

| State | Row | Frames | Timing |
| --- | ---: | ---: | --- |
| idle | 0 | 6 | 280, 110, 110, 140, 140, 320 ms |
| running-right | 1 | 8 | 120 ms, last 220 ms |
| running-left | 2 | 8 | 120 ms, last 220 ms |
| waving | 3 | 4 | 140 ms, last 280 ms |
| jumping | 4 | 5 | 140 ms, last 280 ms |
| failed | 5 | 8 | 140 ms, last 240 ms |
| waiting | 6 | 6 | 150 ms, last 260 ms |
| running | 7 | 6 | 120 ms, last 220 ms |
| review | 8 | 6 | 150 ms, last 280 ms |

For non-idle states, Codex plays the state row three times, then appends a slowed idle loop and loops from that idle section. Reduced-motion mode uses only the first frame.

## Overlay Behavior

The floating Codex pet window maps session state to mascot state:

- active/running task: `running`
- waiting on input: `waiting`
- failed/cancelled task: `failed`
- unread completed output: `review`
- otherwise: `idle`

While dragging, horizontal movement switches the transient state to `running-right` or `running-left`.

## Prototype

This workspace contains a small Electron prototype:

```powershell
bun install
bun run list
bun run pets -- --pet signal
```

It intentionally loads custom/local pets only. Bundled Codex pets are inside the installed Codex ASAR and should not be redistributed without an explicit licensing decision.
