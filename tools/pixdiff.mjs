// pixdiff.mjs — compare a/b frame pairs pixel by pixel (sampled) to prove SMIL animation.
// Usage: node tools/pixdiff.mjs <dir>
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { inflateSync } from "node:zlib";

/** Minimal PNG decode: supports 8-bit RGB/RGBA, no interlace (what CDP screenshots produce). */
function decodePng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error("not a png");
  let off = 8, w = 0, h = 0, bitDepth = 0, colorType = 0;
  const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString("ascii", off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === "IHDR") {
      w = data.readUInt32BE(0); h = data.readUInt32BE(4);
      bitDepth = data[8]; colorType = data[9];
      if (data[12] !== 0) throw new Error("interlaced png unsupported");
    } else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") break;
    off += 12 + len;
  }
  if (bitDepth !== 8) throw new Error("bitDepth " + bitDepth + " unsupported");
  const ch = colorType === 6 ? 4 : colorType === 2 ? 3 : colorType === 0 ? 1 : 0;
  if (!ch) throw new Error("colorType " + colorType + " unsupported");
  const raw = inflateSync(Buffer.concat(idat));
  const stride = w * ch;
  const out = Buffer.alloc(h * stride);
  let pos = 0;
  for (let y = 0; y < h; y++) {
    const ft = raw[pos++];
    const line = raw.subarray(pos, pos + stride); pos += stride;
    const cur = out.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? out.subarray((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x++) {
      const a = x >= ch ? cur[x - ch] : 0;
      const b = prev ? prev[x] : 0;
      const c = prev && x >= ch ? prev[x - ch] : 0;
      let v = line[x];
      if (ft === 1) v += a;
      else if (ft === 2) v += b;
      else if (ft === 3) v += (a + b) >> 1;
      else if (ft === 4) {
        const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
      }
      cur[x] = v & 0xff;
    }
  }
  return { w, h, ch, data: out };
}

const dir = process.argv[2] || "shots/solid";
const asJson = process.argv.includes("--json");
const files = readdirSync(dir).filter((f) => /-a\.png$/.test(f)).sort();
const THRESH = 14;   // per-channel tolerance
const STEP = 2;      // sample every N pixels
const results = [];
if (!asJson) console.log("pair".padEnd(22), "size", "  diffpx", "  verdict");
for (const fa of files) {
  const fb = fa.replace("-a.png", "-b.png");
  let A, B;
  try { A = decodePng(readFileSync(join(dir, fa))); B = decodePng(readFileSync(join(dir, fb))); }
  catch (e) { results.push({ pair: fa, skipped: e.message }); if (!asJson) console.log(fa.padEnd(22), "SKIP:", e.message); continue; }
  if (A.w !== B.w || A.h !== B.h) { results.push({ pair: fa, skipped: "size mismatch" }); if (!asJson) console.log(fa.padEnd(22), "size mismatch"); continue; }
  let diff = 0, total = 0;
  for (let y = 0; y < A.h; y += STEP) {
    for (let x = 0; x < A.w; x += STEP) {
      const i = (y * A.w + x) * A.ch;
      total++;
      if (Math.abs(A.data[i] - B.data[i]) > THRESH ||
          Math.abs(A.data[i + 1] - B.data[i + 1]) > THRESH ||
          Math.abs(A.data[i + 2] - B.data[i + 2]) > THRESH) diff++;
    }
  }
  // slide-07-a.png → 第 7 页
  const m = /slide-(\d+)-a\.png$/.exec(fa);
  results.push({ pair: fa, slide: m ? parseInt(m[1], 10) : null, size: A.w + "x" + A.h, diff, animated: diff > 0 });
  if (!asJson) console.log(fa.padEnd(22), (A.w + "x" + A.h).padEnd(10), String(diff).padStart(6), "  ", diff > 0 ? "动 ✓" : "静止");
}
if (asJson) {
  console.log(JSON.stringify({ dir, results }));
}

