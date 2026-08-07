# Grow Buddy

**The pet that walks only as fast as you do toward your goal.**

Grow Buddy is a tiny desktop pet that sits on your screen at all times
and shows — at a glance — whether you're ahead or behind on any
date-bound goal. Money saved, kilos lost, pages written, hours studied.
One click logs +1. No dashboard. No typing. Your data stays on your
machine.

- **Free tier:** local-only, no account, no telemetry, no server.
- **Pro tier (opt-in, coming soon):** see friends' progress on the same
  bar via share codes.

---

## Install

Download the latest release for your OS from the
[releases page](https://github.com/haadheesheeraz/grow_buddy/releases/latest).

- **Windows:** `GrowBuddy-Setup-x.y.z.exe`. Windows 10 and 11. Until a
  code-signing cert is in place, SmartScreen may warn — click
  *More info → Run anyway*.
- **macOS:** `GrowBuddy-x.y.z-mac-arm64.dmg` (and x64). macOS 11+.
  Coming in the next release.
- **Linux:** `GrowBuddy-x.y.z-linux-x86_64.AppImage`. Run
  `chmod +x` and double-click.

## What you get

- A transparent, always-on-top pet that lives in the corner of your screen.
- A slim bar showing your **actual** position and a fixed **ideal-pace**
  line. Ahead = pet past the line. Behind = pet behind the line.
- **Click the pet** = log +1 step. **Caret dropdown** = -1.
- **Right-click** anywhere on the pet or bar to open the full panel.
- Multiple goals, sprite variants, per-goal bar color, custom start
  offset for the ideal line.
- Optional behind-pace desktop notifications and a configurable global
  hotkey (default `Ctrl+Alt+=`) that logs +1 from anywhere.
- Export/import your `goals.json` any time.

## Data

Everything is stored in a single JSON file in your OS user-data
directory:

- Windows: `%APPDATA%\Grow Buddy\goals.json`
- macOS: `~/Library/Application Support/Grow Buddy/goals.json`
- Linux: `~/.config/Grow Buddy/goals.json`

Logs (rotated at 1 MB) sit next to it under `logs/app.log`. No data
leaves your machine on the free tier.

## Development

```bash
git clone https://github.com/haadheesheeraz/grow_buddy
cd grow_buddy
npm install
npm start                      # launch the app
npm test                       # run compute + state tests
npm run pack                   # unpacked electron-builder build (dist/)
npm run dist:win               # signed installer, see build/README.md
```

### Repository layout

```
grow_buddy/
  main.js               Electron main process
  preload.js            IPC bridge (window.growBuddy)
  src/
    compute.js          Pure goal-metric math (unit-tested)
    state.js            Schema versioning + normalization (unit-tested)
    logger.js           Local rotating file logger
    proClient.js        Pro-tier snapshot push/pull
  renderer/
    widget.{html,css,js}   Transparent always-on-top widget
    panel.{html,css,js}    Full-panel goal CRUD, history, Pro, settings
    shared.js              Utilities shared by both renderers
  tests/
    compute.test.js     Node test runner: 13 metric tests
    state.test.js       Node test runner: 5 normalization tests
  server/               Cloudflare Workers + D1 backend for Pro tier
  web/                  Static landing page
  build/                electron-builder icons + entitlements
  assets/               Pet sprites (me-1..3, naruto-1..3)
  prd.txt               Product requirements
  design-doc.txt        Design document
```

### Contributing

Small, focused changes preferred. Before opening a PR:

- `npm test` passes.
- `npm start` launches without errors.
- Any behavior change is reflected in the README.

## License

MIT — see [LICENSE](./LICENSE).

## Privacy

See [PRIVACY.md](./PRIVACY.md). Short version: free tier is 100% local.
Pro tier only sends the specific fields you share, and only to the
people you gave a code to.

---

Built by [Muhammad Haadhee Sheeraz Mian](https://github.com/haadheesheeraz).
