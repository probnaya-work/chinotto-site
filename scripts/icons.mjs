#!/usr/bin/env node
/**
 * Draws the Chinotto icon set from the identity size ladder.
 *
 * The ladder is the asset: each rung is drawn at its own size, never scaled
 * from another. Picking the wrong rung is the only way to get this wrong.
 *
 *   >= 40px   three dots, stroke 2.5
 *   24-39px   two dots,   stroke 3.5
 *   <= 20px   one dot,    stroke 6
 *
 * The application icon is its own drawing: the three-dot rung with the stroke
 * taken to 3 so the ring holds at icon scale, occupying 0.62 of the tile.
 *
 * Favicons take the <=20px rung at 16 and the 24-39px rung at 32, both on the
 * ink field, so one drawing serves a light and a dark browser chrome.
 *
 * No dependencies: PNG is encoded here, and ICO is a container around PNGs.
 *
 * Run: pnpm icons
 */
import { writeFileSync, rmSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public");

const MARK = [0xe6, 0xe6, 0xe3];
const INK = [0x14, 0x14, 0x16];

/** The rungs, in the 64-unit space every drawing of the mark uses. */
const RUNGS = {
  three: { ring: { r: 28, stroke: 2.5 }, dots: [[23, 8], [38, 4.5], [47.5, 2.5]] },
  two: { ring: { r: 28, stroke: 3.5 }, dots: [[23, 9], [40, 5]] },
  one: { ring: { r: 27, stroke: 6 }, dots: [[27, 11]] },
  // The application icon: three dots, ring taken to stroke 3.
  app: { ring: { r: 28, stroke: 3 }, dots: [[23, 8], [38, 4.5], [47.5, 2.5]] },
};

const SS = 8; // supersampling factor

/**
 * @param size   pixel size of the square
 * @param rung   key of RUNGS
 * @param inset  fraction of the tile the mark occupies (1 = full bleed)
 */
function render(size, rung, { inset = 1 } = {}) {
  const { ring, dots } = RUNGS[rung];
  const n = size * SS;
  const cover = new Float64Array(size * size);

  // Map pixel space into the 64-unit design space, honouring the inset.
  const span = 64 / inset;
  const origin = (64 - span) / 2;

  for (let py = 0; py < n; py++) {
    const y = origin + ((py + 0.5) / n) * span;
    for (let px = 0; px < n; px++) {
      const x = origin + ((px + 0.5) / n) * span;
      const onRing = Math.abs(Math.hypot(x - 32, y - 32) - ring.r) <= ring.stroke / 2;
      const onDot = dots.some(([cy, r]) => Math.hypot(x - 32, y - cy) <= r);
      if (onRing || onDot) cover[((py / SS) | 0) * size + ((px / SS) | 0)] += 1;
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
      raw[i] = Math.round(INK[0] * (1 - a) + MARK[0] * a);
      raw[i + 1] = Math.round(INK[1] * (1 - a) + MARK[1] * a);
      raw[i + 2] = Math.round(INK[2] * (1 - a) + MARK[2] * a);
      raw[i + 3] = 255;
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

const hex = (c) => "#" + c.map((n) => n.toString(16).padStart(2, "0")).join("");

/** The scalable favicon carries the same rung its raster siblings do at tab size. */
function svg(rung) {
  const { ring, dots } = RUNGS[rung];
  const circles = dots
    .map(([cy, r]) => `  <circle cx="32" cy="${cy}" r="${r}" fill="${hex(MARK)}" />`)
    .join("\n");
  return `<svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <rect width="64" height="64" fill="${hex(INK)}" />
  <circle cx="32" cy="32" r="${ring.r}" stroke="${hex(MARK)}" stroke-width="${ring.stroke}" fill="none" />
${circles}
</svg>
`;
}

const write = (name, buf) => {
  writeFileSync(join(OUT, name), buf);
  console.log(`${name.padEnd(24)} ${String(buf.length).padStart(6)} bytes`);
};

write("favicon.svg", Buffer.from(svg("one"), "utf8"));
write("favicon-16.png", render(16, "one"));
write("favicon-32.png", render(32, "two"));
write("apple-touch-icon.png", render(180, "app", { inset: 0.62 }));
write(
  "favicon.ico",
  ico([
    { size: 16, data: render(16, "one") },
    { size: 32, data: render(32, "two") },
  ]),
);

// The ink field carries both browser chromes, so the light pair is retired.
for (const stale of ["favicon-light-16.png", "favicon-light-32.png"]) {
  rmSync(join(OUT, stale), { force: true });
  console.log(`${stale.padEnd(24)} removed`);
}
