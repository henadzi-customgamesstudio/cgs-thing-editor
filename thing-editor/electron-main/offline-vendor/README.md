# offline-vendor

Local copies of the engine runtime libs that builds normally import from CDN
(see `../build-config.js`). Used when a project sets `"offlineBuild": true` in
its thing-project.json — the bundle then works with no internet at runtime
(e.g. the MFC event-box LAN deployment).

Byte-exact downloads (2026-06-11) of the same files the CDN aliases point to:

| File | Source |
|---|---|
| `pixi.min.mjs` | https://cdn.jsdelivr.net/npm/pixi.js@7.2.4/dist/pixi.min.mjs (sourceMappingURL comment stripped) |
| `three.module.min.js` | https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.min.js |
| `three.core.min.js` | https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.core.min.js (imported by three.module.min.js as `./three.core.min.js`) |
| `howler.min.js` | https://cdn.jsdelivr.net/npm/howler@2.2.3/dist/howler.min.js |

When bumping a CDN version in build-config.js, re-download the matching files
here.
