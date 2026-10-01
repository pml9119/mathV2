import { readFileSync } from "node:fs";
const f = process.argv[2];
const c = readFileSync(f, "utf8");
console.log("file bytes:", c.length);
const open = '<script type="application/bento+json" id="bento-doc">';
const close = "</" + "script>";
const i = c.indexOf(open);
const j = c.indexOf(close, i);
console.log("doc block:", i >= 0 ? "found at " + i : "MISSING");
console.log("doc close at:", j);
const j2 = c.indexOf(close, j + 1);
console.log("second close (should be -1):", j2);
const json = c.slice(i + open.length, j);
try {
  const doc = JSON.parse(json);
  console.log("JSON OK, slides:", doc.slides.length, "| title:", doc.title);
} catch (err) {
  console.log("JSON PARSE FAIL:", err.message);
}
const rt = c.indexOf('id="bento-rt"');
console.log("bento-rt block:", rt >= 0 ? "found" : "MISSING");