// inject-controller.mjs — inject animation-controller.js into the bento shell
// between <!-- animctl:START --> / <!-- animctl:END --> markers (idempotent).
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const target = process.argv[2] || join(ROOT, "conic-moving-point.bento.html");
const ctl = readFileSync(join(HERE, "animation-controller.js"), "utf8");
const html = readFileSync(target, "utf8");
const START = "<!-- animctl:START -->";
const END = "<!-- animctl:END -->";

// Remove any previous block, swallowing the whitespace that surrounds it so
// that repeated injections do not accumulate stray newlines (LF or CRLF).
const BOTH = /[ \t]*(?:\r?\n[ \t]*)*<!-- animctl:START -->[\s\S]*?<!-- animctl:END -->[ \t]*(?:\r?\n)?/;
const had = BOTH.test(html);
const out = had ? html.replace(BOTH, "") : html;
if (had) console.log("removed old controller block");

const block =
  START + "\n" +
  "<script>\n" + ctl.replace(/<\/script>/gi, "<\\/script>") + "\n</script>\n" +
  END + "\n";

const bodyEnd = out.toLowerCase().lastIndexOf("</body>");
if (bodyEnd < 0) throw new Error("no </body> in " + target);
// Normalise the trailing whitespace of the shell body start of our block: the
// shipped single-file shells carry a run of blank lines there, so pin it to a
// fixed count. This keeps re-injection byte-for-byte stable across runs.
const head = out.slice(0, bodyEnd).replace(/[ \t]*(?:\r?\n[ \t]*)*$/, "");
const next = head + "\n\n\n\n\n\n" + block + out.slice(bodyEnd);
writeFileSync(target, next, "utf8");
console.log("injected controller into", target, "| new size:", next.length);
