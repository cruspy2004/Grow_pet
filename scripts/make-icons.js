// Generates the packaging icons from the pet sprite.
//
//   npx electron scripts/make-icons.js
//
// Produces build/icon.png (1024x1024, used by the Linux AppImage and as the
// source for every other format) and build/icon.ico (multi-resolution, used by
// the Windows installer and executable). macOS .icns still needs iconutil on a
// Mac -- see build/README.md.
//
// The image is composited from raw pixels rather than rendered in a window: a
// BrowserWindow gets clamped to the display and scaled by the monitor's DPI,
// which silently produced a non-square icon.
const { app, nativeImage } = require('electron');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SPRITE = path.join(ROOT, 'assets', 'me-1.png');
const OUT_DIR = path.join(ROOT, 'build');
const SIZE = 1024;
const CORNER = 180;
const ICO_SIZES = [16, 24, 32, 48, 64, 128, 256];

// Plate gradient, sampled corner to corner. Dark enough that the sprite reads on
// a light taskbar, tinted so it is not a black square on a dark one.
const TOP = { r: 28, g: 43, b: 58 };
const BOTTOM = { r: 10, g: 15, b: 24 };

app.disableHardwareAcceleration();

// Signed distance to the rounded rectangle: negative inside, positive outside,
// zero on the edge. Used to anti-alias the corners instead of stair-stepping
// them. Naively branching on "inside the corner box" leaves a seam of exactly
// zero distance where the corner region meets the straight edges, which paints a
// half-transparent 1px frame inset by the radius.
function roundedRectDistance(x, y, size, radius) {
  const half = size / 2;
  const dx = Math.abs(x - half) - (half - radius);
  const dy = Math.abs(y - half) - (half - radius);
  return Math.min(Math.max(dx, dy), 0)
    + Math.hypot(Math.max(dx, 0), Math.max(dy, 0))
    - radius;
}

function drawPlate(out) {
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const t = (x + y) / (2 * SIZE);
      const coverage = Math.min(1, Math.max(0, 0.5 - roundedRectDistance(x, y, SIZE, CORNER)));
      const index = (y * SIZE + x) * 4;
      // nativeImage bitmaps are BGRA.
      out[index] = Math.round(TOP.b + (BOTTOM.b - TOP.b) * t);
      out[index + 1] = Math.round(TOP.g + (BOTTOM.g - TOP.g) * t);
      out[index + 2] = Math.round(TOP.r + (BOTTOM.r - TOP.r) * t);
      out[index + 3] = Math.round(coverage * 255);
    }
  }
}

// Nearest-neighbour so the pixel art stays crisp; anything smoother turns the
// sprite to mush at this scale.
function drawSprite(out, sprite) {
  const { width, height } = sprite.size;
  const scale = Math.floor((SIZE * 0.7) / height);
  const drawWidth = width * scale;
  const drawHeight = height * scale;
  const originX = Math.round((SIZE - drawWidth) / 2);
  const originY = Math.round((SIZE - drawHeight) / 2 + SIZE * 0.04);

  for (let y = 0; y < drawHeight; y += 1) {
    for (let x = 0; x < drawWidth; x += 1) {
      const destX = originX + x;
      const destY = originY + y;
      if (destX < 0 || destX >= SIZE || destY < 0 || destY >= SIZE) {
        continue;
      }
      const source = (Math.floor(y / scale) * width + Math.floor(x / scale)) * 4;
      // The source sprite carries a scatter of alpha 1-12 pixels that trace a
      // faint rectangle around it. Barely visible at 44px, an obvious frame once
      // blown up to 1024, so drop anything that close to transparent.
      if (sprite.data[source + 3] < 24) {
        continue;
      }
      const alpha = sprite.data[source + 3] / 255;
      const dest = (destY * SIZE + destX) * 4;
      for (let channel = 0; channel < 3; channel += 1) {
        out[dest + channel] = Math.round(
          sprite.data[source + channel] * alpha + out[dest + channel] * (1 - alpha)
        );
      }
      out[dest + 3] = Math.max(out[dest + 3], Math.round(alpha * 255));
    }
  }
}

// ICO container: a 6-byte header, then one 16-byte directory entry per image,
// then the PNG payloads. Windows has accepted PNG-compressed entries since Vista.
function buildIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // 1 = icon
  header.writeUInt16LE(images.length, 4);

  const directory = Buffer.alloc(16 * images.length);
  let offset = header.length + directory.length;

  images.forEach((image, index) => {
    const entry = index * 16;
    // 256 is stored as 0; the field is a single byte.
    directory.writeUInt8(image.size >= 256 ? 0 : image.size, entry);
    directory.writeUInt8(image.size >= 256 ? 0 : image.size, entry + 1);
    directory.writeUInt8(0, entry + 2); // palette size
    directory.writeUInt8(0, entry + 3); // reserved
    directory.writeUInt16LE(1, entry + 4); // colour planes
    directory.writeUInt16LE(32, entry + 6); // bits per pixel
    directory.writeUInt32LE(image.data.length, entry + 8);
    directory.writeUInt32LE(offset, entry + 12);
    offset += image.data.length;
  });

  return Buffer.concat([header, directory, ...images.map((image) => image.data)]);
}

app.whenReady().then(() => {
  const spriteImage = nativeImage.createFromPath(SPRITE);
  if (spriteImage.isEmpty()) {
    throw new Error(`could not read sprite at ${SPRITE}`);
  }
  const sprite = { data: spriteImage.getBitmap(), size: spriteImage.getSize() };

  const plate = Buffer.alloc(SIZE * SIZE * 4);
  drawPlate(plate);
  drawSprite(plate, sprite);

  const master = nativeImage.createFromBitmap(plate, { width: SIZE, height: SIZE });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const masterPath = path.join(OUT_DIR, 'icon.png');
  fs.writeFileSync(masterPath, master.toPNG());
  console.log(`icon.png  ${master.getSize().width}x${master.getSize().height}`);

  const images = ICO_SIZES.map((size) => ({
    size,
    data: master.resize({ width: size, height: size, quality: 'best' }).toPNG()
  }));

  const icoPath = path.join(OUT_DIR, 'icon.ico');
  fs.writeFileSync(icoPath, buildIco(images));
  console.log(`icon.ico  ${ICO_SIZES.join(', ')} (${fs.statSync(icoPath).size} bytes)`);

  app.exit(0);
});
