#!/usr/bin/env python3
"""Clean chroma-key fringe artifacts from Codex-compatible pet spritesheets.

This is for already-transparent pet sheets that still have thin green or purple
cut-out halos at alpha edges. It targets key-colored edge pixels only, then
cleans transparent RGB so halos do not reappear during scaling/compositing.
"""

from __future__ import annotations

import argparse
import json
import math
import re
import shutil
from collections import defaultdict
from pathlib import Path
from typing import Iterable, NamedTuple

from PIL import Image, ImageChops, ImageDraw, ImageFilter


DEFAULT_TOLERANCE = 76
DEFAULT_RADIUS = 1
DEFAULT_TRANSPARENT_ALPHA = 8
DEFAULT_MIN_ALPHA = 24
DEFAULT_MAX_AUTO_COLORS = 3
DIAGNOSTIC_BACKGROUNDS = [
    ("checker", None),
    ("black", (0, 0, 0, 255)),
    ("white", (255, 255, 255, 255)),
    ("blue", (66, 133, 244, 255)),
    ("warm", (255, 245, 225, 255)),
]


class Color(NamedTuple):
    r: int
    g: int
    b: int


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Remove thin green/purple cut-out halos from transparent pet spritesheets."
    )
    parser.add_argument("--pet-dir", help="Pet package folder containing pet.json.")
    parser.add_argument("--input", help="Input spritesheet. Defaults to pet.json spritesheetPath.")
    parser.add_argument("--output", help="Output image. Defaults to <input>.cleaned.webp.")
    parser.add_argument("--in-place", action="store_true", help="Replace input after writing a backup.")
    parser.add_argument("--no-backup", action="store_true", help="Skip <input>.bak with --in-place.")
    parser.add_argument(
        "--fringe",
        action="append",
        default=[],
        help="Target fringe color such as #7a45ff. May be repeated. Defaults to auto-detect.",
    )
    parser.add_argument("--tolerance", type=int, default=DEFAULT_TOLERANCE)
    parser.add_argument("--radius", type=int, default=DEFAULT_RADIUS, choices=[1, 2, 3])
    parser.add_argument("--transparent-alpha", type=int, default=DEFAULT_TRANSPARENT_ALPHA)
    parser.add_argument("--min-alpha", type=int, default=DEFAULT_MIN_ALPHA)
    parser.add_argument("--max-auto-colors", type=int, default=DEFAULT_MAX_AUTO_COLORS)
    parser.add_argument(
        "--edge-contract",
        type=int,
        default=0,
        choices=[0, 1, 2],
        help="Optional matte contraction after fringe cleanup. Use carefully; it can thin dark outlines.",
    )
    parser.add_argument("--diagnostic-out", help="Optional before/after edge diagnostic PNG.")
    return parser.parse_args()


def parse_hex_color(raw: str) -> Color:
    match = re.fullmatch(r"#?([0-9a-fA-F]{6})", raw.strip())
    if not match:
        raise SystemExit(f"Invalid --fringe color: {raw}")
    value = match.group(1)
    return Color(int(value[0:2], 16), int(value[2:4], 16), int(value[4:6], 16))


def color_hex(color: Color) -> str:
    return f"#{color.r:02x}{color.g:02x}{color.b:02x}"


def resolve_input(args: argparse.Namespace) -> Path:
    if args.input:
        return Path(args.input).resolve()
    if not args.pet_dir:
        raise SystemExit("--pet-dir is required unless --input is provided.")

    pet_dir = Path(args.pet_dir).resolve()
    manifest_path = pet_dir / "pet.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8-sig"))
    spritesheet_path = manifest.get("spritesheetPath") or "spritesheet.webp"
    input_path = (pet_dir / spritesheet_path).resolve()
    try:
        input_path.relative_to(pet_dir)
    except ValueError as error:
        raise SystemExit("pet.json spritesheetPath must resolve inside --pet-dir.") from error
    return input_path


def resolve_output(input_path: Path, args: argparse.Namespace) -> Path:
    if args.in_place:
        return input_path
    if args.output:
        return Path(args.output).resolve()
    return input_path.with_name(f"{input_path.stem}.cleaned.webp")


def pixel_distance(a: Color, b: Color) -> float:
    return math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2)


def rgb_to_hsv(color: Color) -> tuple[float, float, float]:
    r = color.r / 255
    g = color.g / 255
    b = color.b / 255
    max_value = max(r, g, b)
    min_value = min(r, g, b)
    delta = max_value - min_value
    hue = 0.0
    if delta:
        if max_value == r:
            hue = 60 * (((g - b) / delta) % 6)
        elif max_value == g:
            hue = 60 * ((b - r) / delta + 2)
        else:
            hue = 60 * ((r - g) / delta + 4)
    return hue, 0 if max_value == 0 else delta / max_value, max_value


def common_cutout_hue(hue: float) -> bool:
    return 80 <= hue <= 175 or 245 <= hue <= 325


def transparent_neighbor(alpha, x: int, y: int, radius: int, threshold: int) -> bool:
    width, height = alpha.size
    for dy in range(-radius, radius + 1):
        for dx in range(-radius, radius + 1):
            if dx == 0 and dy == 0:
                continue
            nx = x + dx
            ny = y + dy
            if nx < 0 or ny < 0 or nx >= width or ny >= height:
                return True
            if alpha.getpixel((nx, ny)) <= threshold:
                return True
    return False


def detect_fringe_colors(
    image: Image.Image,
    *,
    radius: int,
    transparent_alpha: int,
    min_alpha: int,
    max_colors: int,
) -> list[Color]:
    rgba = image.convert("RGBA")
    alpha = rgba.getchannel("A")
    pixels = rgba.load()
    buckets: dict[tuple[int, int, int], dict[str, float]] = defaultdict(lambda: {"count": 0, "r": 0, "g": 0, "b": 0, "score": 0.0})

    for y in range(rgba.height):
        for x in range(rgba.width):
            r, g, b, a = pixels[x, y]
            if a < min_alpha or not transparent_neighbor(alpha, x, y, radius, transparent_alpha):
                continue
            color = Color(r, g, b)
            hue, saturation, value = rgb_to_hsv(color)
            if saturation < 0.28 or value < 0.2 or not common_cutout_hue(hue):
                continue
            key = (round(r / 16), round(g / 16), round(b / 16))
            bucket = buckets[key]
            bucket["count"] += 1
            bucket["r"] += r
            bucket["g"] += g
            bucket["b"] += b
            bucket["score"] += saturation * value

    ranked = sorted(buckets.values(), key=lambda bucket: bucket["score"], reverse=True)
    return [
        Color(
            round(bucket["r"] / bucket["count"]),
            round(bucket["g"] / bucket["count"]),
            round(bucket["b"] / bucket["count"]),
        )
        for bucket in ranked[:max_colors]
        if bucket["count"]
    ]


def spill_channels(key: Color) -> list[int]:
    values = [key.r, key.g, key.b]
    strongest = max(values)
    if strongest < 128:
        return []
    return [index for index, value in enumerate(values) if value >= strongest - 48 and value >= 96]


def despill_rgb(color: Color, key: Color) -> Color:
    channels = [float(color.r), float(color.g), float(color.b)]
    spill = spill_channels(key)
    if not spill:
        return color
    anchors = [index for index in range(3) if index not in spill]
    cap = max((channels[index] for index in anchors), default=min(channels)) + 8
    for index in spill:
        channels[index] = min(channels[index], cap)
    return Color(*(max(0, min(255, round(value))) for value in channels))


def clean_edges(
    image: Image.Image,
    *,
    targets: Iterable[Color],
    tolerance: int,
    radius: int,
    transparent_alpha: int,
    min_alpha: int,
    edge_contract: int,
) -> tuple[Image.Image, dict[str, int]]:
    rgba = image.convert("RGBA")
    alpha = rgba.getchannel("A")
    pixels = rgba.load()
    target_list = list(targets)
    removed = 0
    despilled = 0
    transparent_rgb = 0

    for y in range(rgba.height):
        for x in range(rgba.width):
            r, g, b, a = pixels[x, y]
            if a == 0:
                if r or g or b:
                    pixels[x, y] = (0, 0, 0, 0)
                    transparent_rgb += 1
                continue
            if a < min_alpha or not transparent_neighbor(alpha, x, y, radius, transparent_alpha):
                continue

            color = Color(r, g, b)
            matches = [(target, pixel_distance(color, target)) for target in target_list]
            matches = [(target, distance) for target, distance in matches if distance <= tolerance]
            if not matches:
                continue

            target, distance = min(matches, key=lambda item: item[1])
            if distance <= tolerance * 0.72:
                pixels[x, y] = (0, 0, 0, 0)
                removed += 1
                continue

            clean = despill_rgb(color, target)
            pixels[x, y] = (clean.r, clean.g, clean.b, max(0, min(255, round(a * 0.65))))
            despilled += 1

    if edge_contract:
        contracted_alpha = rgba.getchannel("A")
        for _ in range(edge_contract):
            contracted_alpha = contracted_alpha.filter(ImageFilter.MinFilter(3))
        rgba.putalpha(contracted_alpha)
        pixels = rgba.load()
        for y in range(rgba.height):
            for x in range(rgba.width):
                if pixels[x, y][3] == 0 and pixels[x, y][:3] != (0, 0, 0):
                    pixels[x, y] = (0, 0, 0, 0)
                    transparent_rgb += 1

    return rgba, {"removedPixels": removed, "despilledPixels": despilled, "cleanedTransparentRgbPixels": transparent_rgb}


def checkerboard(size: tuple[int, int], cell: int = 16) -> Image.Image:
    image = Image.new("RGBA", size, (255, 255, 255, 255))
    draw = ImageDraw.Draw(image)
    for y in range(0, size[1], cell):
        for x in range(0, size[0], cell):
            if (x // cell + y // cell) % 2:
                draw.rectangle((x, y, x + cell - 1, y + cell - 1), fill=(196, 196, 196, 255))
    return image


def composite_on(image: Image.Image, color: tuple[int, int, int, int] | None) -> Image.Image:
    rgba = image.convert("RGBA")
    base = checkerboard(rgba.size) if color is None else Image.new("RGBA", rgba.size, color)
    base.alpha_composite(rgba)
    return base


def edge_preview(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    alpha = rgba.getchannel("A")
    edge = ImageChops.difference(alpha.filter(ImageFilter.MaxFilter(3)), alpha.filter(ImageFilter.MinFilter(3)))
    preview = composite_on(rgba, (26, 26, 26, 255))
    overlay = Image.new("RGBA", rgba.size, (255, 0, 0, 0))
    overlay.putalpha(edge.point(lambda value: 220 if value > 0 else 0))
    preview.alpha_composite(overlay)
    return preview


def write_diagnostic(before: Image.Image, after: Image.Image, out: Path) -> None:
    scale = 1
    width, height = before.size
    columns = len(DIAGNOSTIC_BACKGROUNDS) + 1
    rows = 2
    cell_w = width * scale
    cell_h = height * scale
    sheet = Image.new("RGBA", (columns * cell_w, rows * cell_h), (20, 20, 20, 255))
    draw = ImageDraw.Draw(sheet)

    for row, (label_prefix, image) in enumerate((("before", before), ("after", after))):
        previews = [composite_on(image, bg) for _, bg in DIAGNOSTIC_BACKGROUNDS]
        previews.append(edge_preview(image))
        labels = [name for name, _ in DIAGNOSTIC_BACKGROUNDS] + ["edge"]
        for column, (preview, label) in enumerate(zip(previews, labels)):
            x = column * cell_w
            y = row * cell_h
            sheet.alpha_composite(preview.resize((cell_w, cell_h), Image.Resampling.NEAREST), (x, y))
            text = f"{label_prefix} {label}"
            draw.rectangle((x + 6, y + 6, x + 10 + len(text) * 7, y + 22), fill=(0, 0, 0, 190))
            draw.text((x + 8, y + 8), text, fill=(255, 255, 255, 255))

    out.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out)


def save_image(image: Image.Image, output: Path) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    suffix = output.suffix.lower()
    if suffix == ".png":
        image.save(output)
    elif suffix == ".webp":
        image.save(output, lossless=True, exact=True, method=6)
    else:
        raise SystemExit("--output must end in .png or .webp.")


def main() -> int:
    args = parse_args()
    input_path = resolve_input(args)
    output_path = resolve_output(input_path, args)
    if not input_path.exists():
        raise SystemExit(f"Input not found: {input_path}")

    before = Image.open(input_path).convert("RGBA")
    targets = [parse_hex_color(value) for value in args.fringe] or detect_fringe_colors(
        before,
        radius=args.radius,
        transparent_alpha=args.transparent_alpha,
        min_alpha=args.min_alpha,
        max_colors=args.max_auto_colors,
    )
    after, stats = clean_edges(
        before,
        targets=targets,
        tolerance=args.tolerance,
        radius=args.radius,
        transparent_alpha=args.transparent_alpha,
        min_alpha=args.min_alpha,
        edge_contract=args.edge_contract,
    )

    backup = None
    if args.in_place and not args.no_backup:
        backup = input_path.with_suffix(f"{input_path.suffix}.bak")
        shutil.copyfile(input_path, backup)

    save_image(after, output_path)
    if args.diagnostic_out:
        write_diagnostic(before, after, Path(args.diagnostic_out).resolve())

    print(json.dumps({
        "input": str(input_path),
        "output": str(output_path),
        "backup": str(backup) if backup else None,
        "targets": [color_hex(color) for color in targets],
        **stats,
    }, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
