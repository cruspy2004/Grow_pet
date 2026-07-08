# Grow Pet One-Pager

Grow Pet is a local-only Electron desktop app that keeps one goal visible at all times. The app has two surfaces: a compact floating widget for instant progress logging, and a full panel for goal setup, stats, history, and settings.

## How To Run

You must run the app from the Electron project folder, not from `d:\Grow_buddy`.

```bat
cd d:\Grow_buddy\Grow_pet
npm install
npm start
```

If you are already inside `d:\Grow_buddy`, first enter the app folder:

```bash
cd Grow_pet
npm install
npm start
```

`npm start` launches Electron. The widget appears as a transparent always-on-top window, and the full panel opens when you right-click the pet or the bar.

## What It Should Do

- Show a pet icon on the desktop at all times.
- Left-click the pet to toggle the compact controls.
- In compact mode, show only a progress bar, one `+1` button, one caret, and one `-1` menu item.
- Click `+1` to log one unit of progress immediately.
- Click the caret to reveal exactly one correction option: `-1`.
- Right-click the pet or bar to open the full control panel.
- Store everything locally with no server, no account, and no login.

## Architecture

- `main.js` is the Electron main process. It creates the widget window and the panel window, computes goal metrics, and saves state to the local JSON file.
- `preload.js` is the safe IPC bridge. It exposes a small `growPet` API to the renderer without turning on Node integration.
- `renderer/widget.html`, `widget.css`, and `widget.js` implement the desktop widget. This surface is intentionally tiny and only handles toggling, `+1`, `-1`, and the visual markers.
- `renderer/panel.html`, `panel.css`, and `panel.js` implement the full panel. This is where goal CRUD, settings, stats, and history editing live.

## Working Flow

1. The app loads local state from `goals.json` in Electron’s user data folder.
2. The active goal is selected and its metrics are computed in `main.js`.
3. The widget receives a snapshot through IPC and renders the actual and ideal positions on the bar.
4. A `+1` or `-1` action appends a step event, saves the file, and broadcasts the new snapshot back to both windows.
5. The panel can create goals, switch the active goal, edit history entries, delete entries, adjust startup settings, and update the auto-hide timeout.

## Data Model

- `Goal`: id, name, target, unitValue, startDate, deadline, active
- `StepEvent`: id, goalId, delta, timestamp
- `Settings`: autoHideSeconds, launchAtStartup

## Storage

All data is stored locally in a JSON file named `goals.json` under Electron’s app data directory. There is no backend and no cloud sync in v1.

## Repository Layout

- `main.js` - app process, state, calculations, persistence
- `preload.js` - IPC surface exposed to the UI
- `renderer/` - widget and panel HTML/CSS/JS
- `README.md` - this one-pager

## Notes

- The ideal pace line is linear.
- The widget is meant to stay visually minimal.
- The full panel is the only place where detailed calculations and editing live.
