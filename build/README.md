# Build resources

This folder holds packaging assets consumed by `electron-builder` (the
config lives in the root `package.json` under the `build` key).

## Files

| File | Used for | Notes |
|---|---|---|
| `icon.png` | Linux AppImage, base image | Should be at least 512×512, 24-bit. Currently a placeholder derived from `assets/me-1.png`; replace with the final brand icon before signed release. |
| `icon.ico` | Windows NSIS installer + exe icon | Multi-resolution ICO (16, 32, 48, 64, 128, 256). **Not yet generated.** |
| `icon.icns` | macOS DMG + app bundle | Standard macOS icon set. **Not yet generated.** |
| `entitlements.mac.plist` | macOS notarization | Minimal hardened-runtime entitlements for future Apple Developer signing. |

## Regenerating platform icons from `icon.png`

You need a 1024×1024 `icon.png` first. Then:

**Windows `.ico`** — with ImageMagick:
```bash
magick convert icon.png -define icon:auto-resize=16,32,48,64,128,256 icon.ico
```

**macOS `.icns`** — with `iconutil` on a Mac:
```bash
mkdir icon.iconset
sips -z 16 16     icon.png --out icon.iconset/icon_16x16.png
sips -z 32 32     icon.png --out icon.iconset/icon_16x16@2x.png
sips -z 32 32     icon.png --out icon.iconset/icon_32x32.png
sips -z 64 64     icon.png --out icon.iconset/icon_32x32@2x.png
sips -z 128 128   icon.png --out icon.iconset/icon_128x128.png
sips -z 256 256   icon.png --out icon.iconset/icon_128x128@2x.png
sips -z 256 256   icon.png --out icon.iconset/icon_256x256.png
sips -z 512 512   icon.png --out icon.iconset/icon_256x256@2x.png
sips -z 512 512   icon.png --out icon.iconset/icon_512x512.png
cp icon.png       icon.iconset/icon_512x512@2x.png
iconutil -c icns icon.iconset
rm -r icon.iconset
```

## Building installers

From the repo root:

```bash
npm install                    # installs electron-builder as a dev dep
npm run pack                   # unpacked, for local testing
npm run dist:win               # NSIS installer under dist/
npm run dist:mac               # DMG under dist/ (must be run on macOS)
npm run dist:linux             # AppImage under dist/
```

Signed releases require:
- **Windows:** a code-signing certificate (Comodo/Sectigo/SSL.com). Set
  `CSC_LINK` and `CSC_KEY_PASSWORD` env vars.
- **macOS:** an Apple Developer account. Set `APPLE_ID`,
  `APPLE_APP_SPECIFIC_PASSWORD`, and `APPLE_TEAM_ID` for notarization.

Unsigned Windows builds trigger SmartScreen; document this in your
download page.
