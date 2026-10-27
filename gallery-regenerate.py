#!/usr/bin/env python3
"""Regenerate gallery-data.json from the live game assets.

The Suite Hub Gallery is a build-time snapshot, not a live read: it goes
stale whenever the game adds, renames, or removes an asset file. Do NOT
hand-edit gallery-data.json's 294 entries — regenerate it instead.

Usage (from this directory, with the game repo checked out):
    python3 gallery-regenerate.py [--game ~/workspace/selsocsoc] [--dry-run]

How it works:
  * Categories are taken from the existing gallery-data.json (the curated
    list: sprites, textures, outfit-textures, npc-faces, npc-outfits,
    garden-art, inventory, menu-layout, painting-art, fishing-art,
    menu-wallpaper). New top-level asset folders are NOT swept in
    automatically — add a category to the list deliberately, or it would
    pull in unrelated art (accessories, props, per-NPC folders, …).
  * Files are image files only (png/webp/jpg/jpeg) under each category
    folder in <game>/assets/<category>/, searched recursively — e.g.
    inventory art lives in inventory/items/, not directly in inventory/.
  * URLs point at the live game deployment, https://selsocsoc.vercel.app/
    assets/<path>, matching the schema gallery.html already renders:
    { generatedFrom, count, items: [{ path, name, category, url }] }.
  * Output is sorted by path, so diffs between regenerations show only
    real additions/removals/renames.

After regenerating, review `git diff gallery-data.json` before committing
or deploying — a sudden drop in count usually means the game path was
wrong, not that the game lost assets.
"""
import argparse
import json
import sys
from pathlib import Path

BASE_URL = "https://selsocsoc.vercel.app/assets/"
IMAGE_EXTS = {".png", ".webp", ".jpg", ".jpeg"}
DEFAULT_CATEGORIES = [
    "sprites", "textures", "outfit-textures", "npc-faces", "npc-outfits",
    "garden-art", "inventory", "menu-layout", "painting-art", "fishing-art",
    "menu-wallpaper",
]


def main() -> int:
    here = Path(__file__).resolve().parent
    ap = argparse.ArgumentParser()
    ap.add_argument("--game", default=str(Path.home() / "workspace" / "selsocsoc"))
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    game_assets = Path(args.game) / "assets"
    if not game_assets.is_dir():
        print(f"game assets not found: {game_assets}", file=sys.stderr)
        return 1

    out_path = here / "gallery-data.json"
    categories = DEFAULT_CATEGORIES
    if out_path.exists():
        try:
            existing = json.loads(out_path.read_text())
            seen = []
            for item in existing.get("items", []):
                if item.get("category") and item["category"] not in seen:
                    seen.append(item["category"])
            if seen:
                categories = seen
        except (json.JSONDecodeError, OSError):
            pass

    items = []
    for category in categories:
        folder = game_assets / category
        if not folder.is_dir():
            print(f"warning: category folder missing, skipped: {folder}")
            continue
        for f in sorted(folder.rglob("*")):
            if f.is_file() and f.suffix.lower() in IMAGE_EXTS:
                rel = f.relative_to(game_assets).as_posix()
                items.append({
                    "path": rel,
                    "name": f.name,
                    "category": category,
                    "url": BASE_URL + rel,
                })
    items.sort(key=lambda i: i["path"])
    data = {
        "generatedFrom": "selsocsoc assets/ (png/webp/jpg)",
        "count": len(items),
        "items": items,
    }
    if args.dry_run:
        print(f"would write {len(items)} items across {len(categories)} categories")
        return 0
    out_path.write_text(json.dumps(data, indent=1) + "\n")
    print(f"wrote {out_path} — {len(items)} items")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
