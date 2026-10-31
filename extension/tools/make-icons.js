/*
 * ClaimLens icon generator — produces PNG toolbar icons at 16/32/48/128px.
 * Run:  node extension/tools/make-icons.js
 * Requires no npm packages; uses the built-in zlib + a tiny PNG encoder.
 */
import { createWriteStream, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'icons');
mkdirSync(outDir, { recursive: true });

function encodePNG(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])) >>> 0, 0);
    return Buffer.concat([len, typeBuf, data, crc]);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const raw = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 4)] = 0;
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const o = y * (1 + width * 4) + 1 + x * 4;
      raw[o] = rgba[i];
      raw[o + 1] = rgba[i + 1];
      raw[o + 2] = rgba[i + 2];
      raw[o + 3] = rgba[i + 3];
    }
  }
  const idat = deflateSync(raw);
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const CRC_TABLE = (() => {
  const t = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return c ^ 0xffffffff;
}

const INK = [0x20, 0x25, 0x22];
const LIME = [0xd8, 0xf3, 0x6a];

function draw(size) {
  const rgba = Buffer.alloc(size * size * 4);
  const r = (x, y) => (y * size + x) * 4;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = r(x, y);
      rgba[i] = INK[0];
      rgba[i + 1] = INK[1];
      rgba[i + 2] = INK[2];
      rgba[i + 3] = 255;
    }
  }
  // rounded corner mask
  const rad = Math.round(size * 0.18);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = Math.min(x, size - 1 - x);
      const dy = Math.min(y, size - 1 - y);
      if (dx < rad && dy < rad) {
        const dist = Math.hypot(rad - dx, rad - dy);
        if (dist > rad) {
          const i = r(x, y);
          rgba[i + 3] = 0;
        }
      }
    }
  }
  // Draw a stylized lens / annotation mark:
  // a lime circle outline (the lens) with a diagonal check highlight line.
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size * 0.34;
  const innerR = size * 0.2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      const i = r(x, y);
      if (rgba[i + 3] === 0) continue;
      if (d > innerR && d < outerR) {
        const ring = Math.min(1, Math.abs(d - (outerR + innerR) / 2));
        const within = outerR - d < 1.5 || d - innerR < 1.5;
        if (within) {
          rgba[i] = LIME[0];
          rgba[i + 1] = LIME[1];
          rgba[i + 2] = LIME[2];
        }
      }
      // highlight bar across the lens
      const yh = Math.round(cy - size * 0.02);
      if (Math.abs(y - yh) <= 1 && x > cx - outerR * 0.7 && x < cx + outerR * 0.7) {
        const d2 = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
        if (d2 < outerR) {
          rgba[i] = LIME[0];
          rgba[i + 1] = LIME[1];
          rgba[i + 2] = LIME[2];
        }
      }
    }
  }
  return encodePNG(size, size, rgba);
}

[16, 32, 48, 128].forEach((s) => {
  const png = draw(s);
  const p = join(outDir, `icon${s}.png`);
  createWriteStream(p).end(png);
  console.log('wrote', p, png.length, 'bytes');
});
