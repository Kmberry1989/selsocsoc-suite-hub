# Gallery regeneration

`gallery-data.json` is a snapshot, not a live read. It goes stale when the
game adds, renames, or removes an asset file. **Do not hand-edit its
entries** — regenerate it:

```sh
python3 gallery-regenerate.py --dry-run   # preview only
python3 gallery-regenerate.py             # rewrites gallery-data.json
git diff gallery-data.json                # review before committing
```

The script (documented in its own header) walks the game repo at
`~/workspace/selsocsoc/assets/`, covers the 11 curated categories already
in the file, and builds live URLs on `https://selsocsoc.vercel.app/assets/`.
It was verified 2026-10-27 to reproduce the then-current 294 entries
exactly, so a future diff should show only real additions, removals, and
renames. A sudden count drop usually means the game path was wrong, not
that the game lost assets.
