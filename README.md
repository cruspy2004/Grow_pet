# Grow Pet

Grow Pet is a desktop-resident Electron app with two surfaces:

- a compact always-on-top widget that shows the pet, a progress bar, a +1 button, and a one-item -1 dropdown
- a right-click panel for goal setup, stats, history correction, and startup settings

## Run locally

```bash
npm install
npm start
```

## Storage

All goal and step data is stored locally in the Electron user data directory as `goals.json`.

## Current behavior

- Left-click the pet to toggle the compact controls.
- Click `+1` to log one step immediately.
- Click the caret to reveal the single `-1` correction action.
- Right-click the pet or progress bar to open the full panel.
