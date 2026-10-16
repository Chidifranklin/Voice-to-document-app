import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

// Minimal pure-node PNG generator using built-in zlib
function createPng(width, height, drawFn) {
  // RGBA buffer
  const buffer = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const [r, g, b, a] = drawFn(x, y, width, height);
      buffer[idx] = r;
      buffer[idx + 1] = g;
      buffer[idx + 2] = b;
      buffer[idx + 3] = a;
    }
  }

  // PNG scanlines with filter byte 0 (None)
  const scanlines = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) {
    const rowOffset = y * (width * 4 + 1);
    scanlines[rowOffset] = 0; // Filter byte: 0
    buffer.copy(scanlines, rowOffset + 1, y * width * 4, (y + 1) * width * 4);
  }

  const compressedData = zlib.deflateSync(scanlines);

  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth: 8
  ihdr[9] = 6; // Color type: 6 (RGBA)
  ihdr[10] = 0; // Compression: 0
  ihdr[11] = 0; // Filter: 0
  ihdr[12] = 0; // Interlace: 0
  const ihdrChunk = createChunk('IHDR', ihdr);

  // IDAT chunk
  const idatChunk = createChunk('IDAT', compressedData);

  // IEND chunk
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);

  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  const toCrc = Buffer.concat([typeBuf, data]);
  crcBuf.writeUInt32BE(crc32(toCrc), 0);

  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

// Icon design: Gradient indigo-to-violet (#4f46e5 to #7c3aed), with microphone and document wave
function iconDrawer(maskable = false) {
  return (x, y, w, h) => {
    const nx = x / w;
    const ny = y / h;
    const cx = 0.5;
    const cy = 0.5;
    const distFromCenter = Math.hypot(nx - cx, ny - cy);

    // If maskable, fill all edge. If normal icon, smooth rounded rect
    let alpha = 255;
    if (!maskable) {
      // Rounded corner radius: 22%
      const r = 0.22;
      const dx = Math.max(0, Math.abs(nx - 0.5) - (0.5 - r));
      const dy = Math.max(0, Math.abs(ny - 0.5) - (0.5 - r));
      const cornerDist = Math.hypot(dx, dy);
      if (cornerDist > r) {
        return [0, 0, 0, 0];
      }
    }

    // Rich gradient: Indigo (79, 70, 229) to Purple (124, 58, 237)
    let red = Math.round(79 + (nx * 30) + (ny * 40));
    let green = Math.round(70 - (ny * 20));
    let blue = Math.round(229 + (nx * 15));

    // Center icon graphic: microphone capsule and base
    // Safe scale for maskable: scaled to 0.7
    const scale = maskable ? 0.7 : 0.85;
    const px = (nx - 0.5) / scale + 0.5;
    const py = (ny - 0.5) / scale + 0.5;

    // Draw microphone capsule: centered at x=0.5, y between 0.30 and 0.50, radius 0.08
    const micX = px - 0.5;
    const inMicCapsule = Math.abs(micX) <= 0.07 && (py >= 0.28 && py <= 0.48);
    const micTopCap = Math.hypot(micX, py - 0.28) <= 0.07;
    const micBotCap = Math.hypot(micX, py - 0.48) <= 0.07;

    // Mic cradle / arc: circle outline at cx=0.5, cy=0.46, radius 0.12, width 0.02, py between 0.40 and 0.60
    const cradleDist = Math.hypot(micX, py - 0.46);
    const inCradle = cradleDist >= 0.10 && cradleDist <= 0.125 && py >= 0.42 && py <= 0.60;

    // Mic stand / stem: vertical line down to 0.68
    const inStem = Math.abs(micX) <= 0.02 && py >= 0.58 && py <= 0.68;
    // Mic base plate: horizontal line at 0.68
    const inBase = Math.abs(micX) <= 0.09 && py >= 0.68 && py <= 0.71;

    // Soundwaves / document horizontal lines on sides:
    // Left sound waves
    const inWaveL1 = Math.abs(px - 0.28) <= 0.015 && py >= 0.38 && py <= 0.54;
    const inWaveL2 = Math.abs(px - 0.22) <= 0.015 && py >= 0.42 && py <= 0.50;
    // Right sound waves
    const inWaveR1 = Math.abs(px - 0.72) <= 0.015 && py >= 0.38 && py <= 0.54;
    const inWaveR2 = Math.abs(px - 0.78) <= 0.015 && py >= 0.42 && py <= 0.50;

    if (inMicCapsule || micTopCap || micBotCap || inCradle || inStem || inBase || inWaveL1 || inWaveL2 || inWaveR1 || inWaveR2) {
      // Crisp white with subtle glow
      return [255, 255, 255, alpha];
    }

    return [red, green, blue, alpha];
  };
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Write PNG files
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), createPng(192, 192, iconDrawer(false)));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), createPng(512, 512, iconDrawer(false)));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), createPng(512, 512, iconDrawer(true)));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createPng(180, 180, iconDrawer(false)));
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), createPng(64, 64, iconDrawer(false)));

// Also create public/icon.svg for desktop tab
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4f46e5" />
      <stop offset="100%" stop-color="#7c3aed" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#bgGrad)" />
  <g fill="#ffffff">
    <!-- Mic capsule -->
    <rect x="220" y="140" width="72" height="110" rx="36" />
    <!-- Mic cradle -->
    <path d="M190 220 C 190 295, 322 295, 322 220" fill="none" stroke="#ffffff" stroke-width="20" stroke-linecap="round" />
    <!-- Mic stem -->
    <rect x="246" y="295" width="20" height="50" rx="6" />
    <!-- Mic base -->
    <rect x="210" y="345" width="92" height="18" rx="9" />
    <!-- Soundwaves -->
    <path d="M150 200 C 140 225, 140 255, 150 280" fill="none" stroke="#ffffff" stroke-width="14" stroke-linecap="round" />
    <path d="M120 215 C 112 232, 112 248, 120 265" fill="none" stroke="#ffffff" stroke-width="12" stroke-linecap="round" />
    <path d="M362 200 C 372 225, 372 255, 362 280" fill="none" stroke="#ffffff" stroke-width="14" stroke-linecap="round" />
    <path d="M392 215 C 400 232, 400 248, 392 265" fill="none" stroke="#ffffff" stroke-width="12" stroke-linecap="round" />
  </g>
</svg>`;
fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgContent, 'utf8');

console.log('Icons generated successfully.');
