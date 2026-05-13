/**
 * Regenerate favicons from PNG at repo root: favicon-source.png
 *
 *   npm install sharp --no-save
 *   node _build-favicons-from-source.cjs
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

function buildIco(png16, png32) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(2, 4);
  const images = [png16, png32];
  const entries = [];
  let offset = 6 + 16 * images.length;
  for (let i = 0; i < images.length; i++) {
    const png = images[i];
    const w = i === 0 ? 16 : 32;
    const e = Buffer.alloc(16);
    e[0] = w === 256 ? 0 : w;
    e[1] = w === 256 ? 0 : w;
    e[2] = 0;
    e[3] = 0;
    e.writeUInt16LE(0, 4);
    e.writeUInt16LE(0, 6);
    e.writeUInt32LE(png.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += png.length;
    entries.push(e);
  }
  return Buffer.concat([header, ...entries, ...images]);
}

const root = __dirname;
const srcPath = path.join(root, 'favicon-source.png');

(async () => {
  if (!fs.existsSync(srcPath)) {
    console.error('Missing favicon-source.png in repo root.');
    process.exit(1);
  }
  const meta = await sharp(srcPath).metadata();
  const w = meta.width || 0;
  const h = meta.height || 0;
  if (!w || !h) throw new Error('Could not read source dimensions');

  const side = Math.min(w, Math.round(h * 0.42));
  const left = Math.max(0, Math.round((w - side) / 2));
  const top = 0;

  const base = await sharp(srcPath)
    .extract({ left, top, width: side, height: side })
    .png({ compressionLevel: 9 })
    .toBuffer();

  const buf16 = await sharp(base).resize(16, 16).png({ compressionLevel: 9 }).toBuffer();
  const buf32 = await sharp(base).resize(32, 32).png({ compressionLevel: 9 }).toBuffer();
  const buf180 = await sharp(base).resize(180, 180).png({ compressionLevel: 9 }).toBuffer();
  const ico = buildIco(buf16, buf32);

  fs.writeFileSync(path.join(root, 'favicon-16x16.png'), buf16);
  fs.writeFileSync(path.join(root, 'favicon-32x32.png'), buf32);
  fs.writeFileSync(path.join(root, 'apple-touch-icon.png'), buf180);
  fs.writeFileSync(path.join(root, 'favicon.ico'), ico);

  console.log('OK → favicon.ico, favicon-16x16.png, favicon-32x32.png, apple-touch-icon.png');
  console.log(`Crop: ${side}x${side} top-center from ${w}x${h}`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
