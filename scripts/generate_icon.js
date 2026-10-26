const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(buf) {
  let table = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type);
  const crcBuf = Buffer.alloc(4);
  const toCrc = Buffer.concat([typeBuf, data]);
  crcBuf.writeUInt32BE(crc32(toCrc), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function generateAxiomIcon(filePath, size = 512) {
  const width = size;
  const height = size;
  
  // Uncompressed scanlines: each row = 1 filter byte (0) + width * 4 bytes (RGBA)
  const rawData = Buffer.alloc(height * (1 + width * 4));
  
  const cx = width / 2;
  const cy = height / 2;
  const rOuter = size * 0.44;
  
  let offset = 0;
  for (let y = 0; y < height; y++) {
    rawData[offset++] = 0; // Filter: None
    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      // Default: transparent
      let r = 8, g = 9, b = 10, a = 0; // #08090a void
      
      // Rounded icon container (smooth squircle / dark pill)
      // distance from box with radius
      const boxHalf = size * 0.42;
      const cornerR = size * 0.18;
      const qx = Math.max(0, Math.abs(dx) - (boxHalf - cornerR));
      const qy = Math.max(0, Math.abs(dy) - (boxHalf - cornerR));
      const boxDist = Math.sqrt(qx * qx + qy * qy);
      
      if (boxDist <= cornerR) {
        // Inside rounded squircle
        a = 255;
        // Subtle carbon border
        if (boxDist >= cornerR - 3) {
          r = 35; g = 37; b = 42; // #23252a hairline border
        } else {
          r = 15; g = 16; b = 17; // #0f1011 carbon background
        }
        
        // Draw Axiom Greek Lambda / Precision Chevron glyph:
        // Left arm: from (cx - 100, cy + 110) to (cx, cy - 110)
        // Right arm: from (cx, cy - 110) to (cx + 100, cy + 110)
        // Crossbar: (cx - 40, cy + 30) to (cx + 40, cy + 30)
        // Check distance to line segments
        function distToSegment(px, py, x1, y1, x2, y2) {
          const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
          if (l2 === 0) return Math.hypot(px - x1, py - y1);
          let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
          t = Math.max(0, Math.min(1, t));
          return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
        }
        
        const d1 = distToSegment(x, y, cx - 90, cy + 105, cx, cy - 105);
        const d2 = distToSegment(x, y, cx, cy - 105, cx + 90, cy + 105);
        const d3 = distToSegment(x, y, cx - 45, cy + 35, cx + 45, cy + 35);
        const minGlyphDist = Math.min(d1, d2, d3);
        
        const strokeW = 16;
        if (minGlyphDist <= strokeW) {
          // Acid Lime #e4f222
          r = 228;
          g = 242;
          b = 34;
        } else if (minGlyphDist <= strokeW + 8) {
          // Glow / antialiasing
          const factor = 1 - (minGlyphDist - strokeW) / 8;
          r = Math.round(15 * (1 - factor) + 228 * factor);
          g = Math.round(16 * (1 - factor) + 242 * factor);
          b = Math.round(17 * (1 - factor) + 34 * factor);
        }
      }
      
      rawData[offset++] = r;
      rawData[offset++] = g;
      rawData[offset++] = b;
      rawData[offset++] = a;
    }
  }
  
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth: 8
  ihdr[9] = 6; // Color type: RGBA
  ihdr[10] = 0; // Compression: Deflate
  ihdr[11] = 0; // Filter: 0
  ihdr[12] = 0; // Interlace: 0
  
  const ihdrChunk = createChunk('IHDR', ihdr);
  const compressed = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', compressed);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));
  
  const pngBuffer = Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, pngBuffer);
  console.log(`Generated Axiom icon (${width}x${height}) at: ${filePath}`);
}

generateAxiomIcon(path.join(__dirname, 'apps/desktop/build/icon.png'), 512);
