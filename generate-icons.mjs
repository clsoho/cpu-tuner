import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  const table = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) { c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); }
    table[i] = c;
  }
  for (let i = 0; i < buf.length; i++) { crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8); }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type);
  const combined = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4); crcBuf.writeUInt32BE(crc32(combined));
  return Buffer.concat([len, combined, crcBuf]);
}

const CYAN_BG = [0x00, 0xd4, 0xaa, 0xff];
const WHITE = [0xff, 0xff, 0xff, 0xff];

function fillCircle(buf, w, cx, cy, r, color) {
  for (let y = -r; y <= r; y++) {
    for (let x = -r; x <= r; x++) {
      if (x*x + y*y <= r*r) {
        const o = ((cy + y) * w + (cx + x)) * 4;
        buf[o] = color[0]; buf[o+1] = color[1]; buf[o+2] = color[2]; buf[o+3] = color[3];
      }
    }
  }
}

function fillRing(buf, w, cx, cy, outerR, innerR, color) {
  for (let y = -outerR; y <= outerR; y++) {
    for (let x = -outerR; x <= outerR; x++) {
      const d2 = x*x + y*y;
      if (d2 <= outerR*outerR && d2 >= innerR*innerR) {
        const o = ((cy + y) * w + (cx + x)) * 4;
        buf[o] = color[0]; buf[o+1] = color[1]; buf[o+2] = color[2]; buf[o+3] = color[3];
      }
    }
  }
}

function drawThickLine(buf, w, x0, y0, x1, y1, thick, color) {
  const dx = Math.abs(x1-x0), dy = Math.abs(y1-y0);
  const sx = x0<x1?1:-1, sy = y0<y1?1:-1;
  let err = dx-dy, x = x0, y = y0;
  while (true) {
    for (let ty = -Math.floor(thick/2); ty <= Math.floor(thick/2); ty++)
      for (let tx = -Math.floor(thick/2); tx <= Math.floor(thick/2); tx++)
        fillPx(buf, w, x+tx, y+ty, color[0], color[1], color[2], color[3]);
    if (x === x1 && y === y1) break;
    const e2 = 2*err;
    if (e2 > -dy) { err -= dy; x += sx; }
    if (e2 < dx) { err += dx; y += sy; }
  }
}

function fillPx(buf, w, x, y, r, g, b, a) {
  if (x < 0 || x >= w || y < 0 || y >= w) return;
  const o = (y * w + x) * 4;
  buf[o] = r; buf[o+1] = g; buf[o+2] = b; buf[o+3] = a;
}

function makePngBytes(w, h, drawer) {
  const raw = Buffer.alloc(h * (w * 4 + 1));
  let pos = 0;
  for (let y = 0; y < h; y++) {
    raw[pos++] = 0;
    for (let x = 0; x < w; x++) {
      raw[pos++] = 0; raw[pos++] = 0; raw[pos++] = 0; raw[pos++] = 0;
    }
  }
  drawer(raw, w, h);
  const compressed = zlib.deflateSync(raw);
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    makeChunk('IHDR', (() => { const b = Buffer.alloc(13); b.writeUInt32BE(w, 0); b.writeUInt32BE(h, 4); b[8] = 8; b[9] = 6; return b; })()),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0))
  ]);
}

function makeIcoBytes(w, h, drawer) {
  const raw = Buffer.alloc(h * w * 4);
  for (let i = 0; i < raw.length; i += 4) {
    raw[i] = 0; raw[i+1] = 0; raw[i+2] = 0; raw[i+3] = 0;
  }
  drawer(raw, w, h);

  const bgra = Buffer.alloc(raw.length);
  for (let i = 0; i < raw.length; i += 4) {
    const srcIdx = ((h - 1 - Math.floor(i/4/w)) * w + (i/4 % w)) * 4;
    bgra[i] = raw[srcIdx+2]; bgra[i+1] = raw[srcIdx+1]; bgra[i+2] = raw[srcIdx]; bgra[i+3] = raw[srcIdx+3];
  }

  const andLineBytes = Math.ceil(w / 32) * 4;
  const andMask = Buffer.alloc(h * andLineBytes, 0);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const srcIdx = (y * w + x) * 4;
      if (raw[srcIdx+3] < 128) {
        const bitIdx = y * andLineBytes * 8 + x;
        andMask[Math.floor(bitIdx / 8)] |= (1 << (7 - (bitIdx % 8)));
      }
    }
  }

  const bmpSize = 40;
  const total = bmpSize + bgra.length + andMask.length;
  const buf = Buffer.alloc(6 + 16 + total);
  let off = 0;
  buf.writeUInt16LE(0, off); off += 2;
  buf.writeUInt16LE(1, off); off += 2;
  buf.writeUInt16LE(1, off); off += 2;
  buf[off++] = w; buf[off++] = h;
  buf[off++] = 0; buf[off++] = 0;
  buf.writeUInt16LE(1, off); off += 2;
  buf.writeUInt16LE(32, off); off += 2;
  buf.writeUInt32LE(total, off); off += 4;
  buf.writeUInt32LE(22, off); off += 4;
  buf.writeUInt32LE(40, off); off += 4;
  buf.writeInt32LE(w, off); off += 4;
  buf.writeInt32LE(h * 2, off); off += 4;
  buf.writeUInt16LE(1, off); off += 2;
  buf.writeUInt16LE(32, off); off += 2;
  buf.writeUInt32LE(0, off); off += 4;
  buf.writeUInt32LE(bgra.length + andMask.length, off); off += 4;
  buf.writeInt32LE(0, off); off += 4;
  buf.writeInt32LE(0, off); off += 4;
  buf.writeUInt32LE(0, off); off += 4;
  buf.writeUInt32LE(0, off); off += 4;
  bgra.copy(buf, off); off += bgra.length;
  andMask.copy(buf, off);
  return buf;
}

function drawMainIcon(raw, w, h) {
  const cx = w/2, cy = h/2;
  const bgR = Math.floor(w * 0.46), r = Math.floor(w * 0.32);
  const innerR = Math.floor(r * 0.55), dotR = Math.max(1, Math.floor(w * 0.06));
  fillCircle(raw, w, cx, cy, bgR, CYAN_BG);
  fillRing(raw, w, cx, cy, innerR, Math.floor(innerR * 0.45), WHITE);
  fillCircle(raw, w, cx, cy, dotR + 1, WHITE);
  fillCircle(raw, w, cx, cy, dotR, CYAN_BG);
  const needleLen = Math.floor(innerR * 0.85);
  const angle = -Math.PI / 6;
  drawThickLine(raw, w, cx, cy, Math.floor(cx + Math.cos(angle)*needleLen), Math.floor(cy + Math.sin(angle)*needleLen), 2, WHITE);
}

function drawMetricCircle(raw, w, h, r, g, b) {
  const cx = w/2, cy = h/2;
  const radius = Math.floor(Math.min(w, h) * 0.44);
  fillCircle(raw, w, cx, cy, radius, [r, g, b, 0xff]);
}

const outDir = path.join(__dirname, 'src-tauri', 'icons');
fs.mkdirSync(outDir, { recursive: true });

// Main app icons
fs.writeFileSync(path.join(outDir, '32x32.png'), makePngBytes(32, 32, drawMainIcon));
fs.writeFileSync(path.join(outDir, '128x128.png'), makePngBytes(128, 128, drawMainIcon));
fs.writeFileSync(path.join(outDir, '128x128@2x.png'), makePngBytes(256, 256, drawMainIcon));
fs.writeFileSync(path.join(outDir, 'icon.ico'), makeIcoBytes(32, 32, drawMainIcon));

// Metric tray icons (16x16 colored circles)
fs.writeFileSync(path.join(outDir, 'temp.ico'), makeIcoBytes(16, 16, (rw, w, h) => drawMetricCircle(rw, w, h, 0xf8, 0x51, 0x49)));
fs.writeFileSync(path.join(outDir, 'freq.ico'), makeIcoBytes(16, 16, (rw, w, h) => drawMetricCircle(rw, w, h, 0x44, 0x93, 0xf8)));
fs.writeFileSync(path.join(outDir, 'power.ico'), makeIcoBytes(16, 16, (rw, w, h) => drawMetricCircle(rw, w, h, 0x3f, 0xb9, 0x50)));
fs.writeFileSync(path.join(outDir, 'temp.png'), makePngBytes(16, 16, (rw, w, h) => drawMetricCircle(rw, w, h, 0xf8, 0x51, 0x49)));
fs.writeFileSync(path.join(outDir, 'freq.png'), makePngBytes(16, 16, (rw, w, h) => drawMetricCircle(rw, w, h, 0x44, 0x93, 0xf8)));
fs.writeFileSync(path.join(outDir, 'power.png'), makePngBytes(16, 16, (rw, w, h) => drawMetricCircle(rw, w, h, 0x3f, 0xb9, 0x50)));

console.log('All icons regenerated!');
