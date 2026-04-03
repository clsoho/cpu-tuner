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

function createPng(size) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA

  const raw = Buffer.alloc(size * (size * 4 + 1));
  let pos = 0;
  for (let y = 0; y < size; y++) {
    raw[pos++] = 0;
    for (let x = 0; x < size; x++) {
      raw[pos++] = 0x1E; raw[pos++] = 0x3A; raw[pos++] = 0x8A; raw[pos++] = 0xFF;
    }
  }

  const compressed = zlib.deflateSync(raw);
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0))
  ]);
}

function createIco(size) {
  const w = size, h = size;
  const pixelData = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      pixelData[o] = 0x8A; pixelData[o+1] = 0x3A; pixelData[o+2] = 0x1E; pixelData[o+3] = 0xFF;
    }
  }

  const bmpHeaderSize = 40;
  const buf = Buffer.alloc(6 + 16 + bmpHeaderSize + pixelData.length);
  let off = 0;
  buf.writeUInt16LE(0, off); off += 2;
  buf.writeUInt16LE(1, off); off += 2;
  buf.writeUInt16LE(1, off); off += 2;
  buf[off++] = w; buf[off++] = h; buf[off++] = 0; buf[off++] = 0;
  buf.writeUInt16LE(1, off); off += 2;
  buf.writeUInt16LE(32, off); off += 2;
  buf.writeUInt32LE(bmpHeaderSize + pixelData.length, off); off += 4;
  buf.writeUInt32LE(22, off); off += 4;
  // BMP info
  buf.writeUInt32LE(40, off); off += 4;
  buf.writeInt32LE(w, off); off += 4;
  buf.writeInt32LE(h * 2, off); off += 4;
  buf.writeUInt16LE(1, off); off += 2;
  buf.writeUInt16LE(32, off); off += 2;
  buf.writeUInt32LE(0, off); off += 4;
  buf.writeUInt32LE(pixelData.length, off); off += 4;
  buf.writeInt32LE(0, off); off += 4;
  buf.writeInt32LE(0, off); off += 4;
  buf.writeUInt32LE(0, off); off += 4;
  buf.writeUInt32LE(0, off); off += 4;
  // Pixels (bottom-up)
  for (let y = h - 1; y >= 0; y--) {
    pixelData.copy(buf, off, y * w * 4, (y + 1) * w * 4);
    off += w * 4;
  }
  return buf;
}

const outDir = path.join(__dirname, 'src-tauri', 'icons');
fs.mkdirSync(outDir, { recursive: true });

fs.writeFileSync(path.join(outDir, 'icon.ico'), createIco(32));
fs.writeFileSync(path.join(outDir, '32x32.png'), createPng(32));
fs.writeFileSync(path.join(outDir, '128x128.png'), createPng(128));
fs.writeFileSync(path.join(outDir, '128x128@2x.png'), createPng(256));

console.log('✅ Icons generated!');
