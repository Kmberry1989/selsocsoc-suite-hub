# Selfie Social Society — Suite Hub

One installable launcher for the Selfie Social Society editor suite: all seven
editors, the NPC Showcase, and the main game — plus a Shared Assets shelf that
reads the cross-editor NPC manifest.

## Editor URLs

`registry.json` is the single source of truth for launcher cards:

```json
{ "entries": [ { "id": "...", "name": "...", "purpose": "...", "url": "...", "icon": "🎮" } ] }
```

- Set `url` to the editor's live deployment URL to make its card openable.
- Leave `url` as `null` while an editor is still deploying — the hub shows an
  honest "Deploying…" state instead of a broken link.

## Shared assets

The hub fetches the NPC manifest at
`https://raw.githubusercontent.com/Kmberry1989/selsocsoc/main/assets/npc/manifest.json`
and renders the cast as a browsable strip. A 404 shows a "syncing…" state.

## PWA

`manifest.webmanifest` + `sw.js` (app-shell caching) + icons in `icons/`.
Installable on Mac via the browser's install / "Add to Dock" flow.

## Deploy

Static site on Vercel, auto-deploys from `main`.
