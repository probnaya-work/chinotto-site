#!/usr/bin/env node
/**
 * Rasterises the Chinotto mark — ring, upper dot, lower dot — into the icon set.
 *
 * The mark's geometry is the one in the finalized design (64-unit space:
 * ring r28, dot r9 at cy23, dot r5 at cy40). Small sizes take the heavier
 * stroke the handoff uses for its own small mark; 64px and up take 3.5.
 *
 * No dependencies: PNG is encoded here, and ICO is a container around PNGs.
 *
 * Run: node scripts/icons.mjs
 */
import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public");

const LIGHT = [0xe6, 0xe6, 0xe3];
const DARK = [0x16, 0x18, 0x1c];
const GROUND = [0x14, 0x14, 0x16];

const SS = 8; // supersampling factor

/** Signed distance to a filled disc, in 64-unit space. */
const disc = (x, y, cx, cy, r) => Math.hypot(x - cx, y - cy) - r;

/** Signed distance to a ring of the given stroke width. */
const ring = (x, y, cx, cy, r, w) => Math.abs(Math.hypot(x - cx, y - cy) - r) - w / 2;

function render(size, rgb, background) {
  const stroke = size >= 64 ? 3.5 : 6;
  const n = size * SS;
  const cover = new Float64Array(size * size);

  for (let py = 0; py < n; py++) {
    for (let px = 0; px < n; px++) {
      // sample centre, mapped into the 64-unit design space
      const x = ((px + 0.5) / n) * 64;
      const y = ((py + 0.5) / n) * 64;
      const inside =
        ring(x, y, 32, 32, 28, stroke) <= 0 ||
        disc(x, y, 32, 23, 9) <= 0 ||
        disc(x, y, 32, 40, 5) <= 0;
      if (inside) cover[((py / SS) | 0) * size + ((px / SS) | 0)] += 1;
    }
  }

  const raw = Buffer.alloc(size * (size * 4 + 1));
  const samples = SS * SS;
  for (let y = 0; y < size; y++) {
    const row = y * (size * 4 + 1);
    raw[row] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const a = cover[y * size + x] / samples;
      const i = row + 1 + x * 4;
      if (background) {
        raw[i] = Math.round(background[0] * (1 - a) + rgb[0] * a);
        raw[i + 1] = Math.round(background[1] * (1 - a) + rgb[1] * a);
        raw[i + 2] = Math.round(background[2] * (1 - a) + rgb[2] * a);
        raw[i + 3] = 255;
      } else {
        raw[i] = rgb[0];
        raw[i + 1] = rgb[1];
        raw[i + 2] = rgb[2];
        raw[i + 3] = Math.round(a * 255);
      }
    }
  }
  return png(size, raw);
}

const CRC = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return (buf) => {
    let c = -1;
    for (const b of buf) c = t[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ -1) >>> 0;
  };
})();

function chunk(type, data) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(CRC(Buffer.concat([head.subarray(4), data])), 0);
  return Buffer.concat([head, data, crc]);
}

function png(size, raw) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** ICO holding PNG payloads — the format every current browser reads. */
function ico(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(entries.length, 4);

  let offset = 6 + entries.length * 16;
  const dir = [];
  for (const { size, data } of entries) {
    const e = Buffer.alloc(16);
    e[0] = size >= 256 ? 0 : size;
    e[1] = size >= 256 ? 0 : size;
    e.writeUInt16LE(1, 4); // colour planes
    e.writeUInt16LE(32, 6); // bits per pixel
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    dir.push(e);
    offset += data.length;
  }
  return Buffer.concat([header, ...dir, ...entries.map((e) => e.data)]);
}

const write = (name, buf) => {
  writeFileSync(join(OUT, name), buf);
  console.log(`${name}  ${buf.length} bytes`);
};

// Marks for dark browser chrome.
write("favicon-32.png", render(32, LIGHT));
write("favicon-16.png", render(16, LIGHT));
// Marks for light browser chrome.
write("favicon-light-32.png", render(32, DARK));
write("favicon-light-16.png", render(16, DARK));
// Home-screen icon needs an opaque ground.
write("apple-touch-icon.png", render(180, LIGHT, GROUND));

write(
  "favicon.ico",
  ico([
    { size: 16, data: render(16, LIGHT) },
    { size: 32, data: render(32, LIGHT) },
  ]),
);
