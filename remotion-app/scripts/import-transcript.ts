// Import the user's own timestamped script into a project's edit.json, with the
// same parser and checks as the Studio (src/kit/project.ts).
//
//   npx tsx scripts/import-transcript.ts <slug> <file> [--replace] [--format srt|vtt|json|pasted]
//   npx tsx scripts/import-transcript.ts <slug> --check      # only list the timing issues
//
// The text and the timestamps are kept exactly as written. Missing or invalid
// timestamps are flagged, never guessed or "fixed": the user corrects them.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { EditDoc, Transcript } from "../src/kit/project";
import { detectFormat, fmtTime, parseTranscript, validateTranscript } from "../src/kit/project";

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(name);
const opt = (name: string) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const [slug, file] = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--format");
if (!slug || (!file && !flag("--check"))) {
  console.error("usage: npx tsx scripts/import-transcript.ts <slug> <file> [--replace] [--format srt|vtt|json|pasted] | <slug> --check");
  process.exit(2);
}
const docPath = path.resolve(__dirname, "..", "src", "projects", slug, "edit.json");
const doc = JSON.parse(readFileSync(docPath, "utf8")) as EditDoc;

const report = () => {
  const issues = validateTranscript(doc.transcript.segments, doc.source.sourceDurationSeconds);
  for (const s of doc.transcript.segments) {
    const tc = (t: number | null) => (t === null ? "--:--.--" : fmtTime(t));
    console.log(`${s.id}  ${tc(s.start)} - ${tc(s.end)}  ${s.text}`);
  }
  for (const i of issues) console.log(`${i.level.toUpperCase()}  ${i.id}: ${i.message}`);
  console.log(`${doc.transcript.segments.length} lines, ${issues.filter((i) => i.level === "error").length} errors, ${issues.filter((i) => i.level === "warning").length} warnings`);
  return issues;
};

if (file) {
  if (doc.transcript.segments.length && !flag("--replace")) {
    console.error("a script is already imported in edit.json - pass --replace to replace it");
    process.exit(1);
  }
  const raw = readFileSync(file, "utf8");
  const format = (opt("--format") as Transcript["importedFrom"] | undefined) ?? detectFormat(path.basename(file), raw);
  const segments = parseTranscript(format, raw);
  if (!segments.length) {
    console.error("no lines found in the script");
    process.exit(1);
  }
  doc.transcript = { origin: "user-script", importedFrom: format, importedAt: new Date().toISOString().slice(0, 19), segments };
  doc.updated = new Date().toISOString().slice(0, 19);
  writeFileSync(docPath, JSON.stringify(doc, null, 1) + "\n");
  console.log(`imported ${segments.length} lines (${format}) into ${path.relative(process.cwd(), docPath)}`);
}
const issues = report();
process.exit(issues.some((i) => i.level === "error") ? 1 : 0);
