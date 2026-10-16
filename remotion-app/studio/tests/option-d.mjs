// End-to-end test of Option D and scoped references (npm run studio:test:d).
//
// D works straight from a fresh scene: type the idea, optionally attach references right in the D editor,
// save. The draft lives in edit.json (no lost text when switching tabs, scenes or reloading); the D editor
// and the References tab edit the same attachments; scope (idea / scene / project), role, influence and
// exclusions resolve predictably; the decision keeps a snapshot; repeated Apply is idempotent; an older
// request can never build over a newer decision; legacy projects migrate without losing anything.
//
//  1 D on a fresh scene, no reference, no A/B/C: saved verbatim (line breaks, punctuation, Turkish letters)
//  2 the draft survives a tab switch, a scene switch and a reload (it is in edit.json)
//  3 a reference attached from the D editor shows in the References tab (same entity); removing it there removes it in D; the asset stays
//  4 upload, link and project reference in D; a scene-level exclusion; the snapshot uses exactly the active ones
//  5 repeated Apply creates no second request
//  6 a changed D supersedes the old request; building the old one is refused
//  7 a failed request is superseded too and cannot be built later
//  8 an old request reopened by a race is refused ("out of date")
//  9 Claude Code's `show` prints the idea verbatim and "THIS SCENE WILL USE" with files, link and exclusions
// 10 undo restores the previous draft
// 11 a legacy D decision (refs/uploads only) migrates to an attachments snapshot, keeping its fields
// Usage: node studio/tests/option-d.mjs [--keep]
import { execSync, spawn, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require(path.join(execSync("npm root -g").toString().trim(), "playwright"));
const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const REPO = path.resolve(APP, "..");
const SCRIPTS = path.join(REPO, ".claude", "skills", "video-editing", "scripts");
const SLUG = "d-e2e";
const PORT = 3010;
const BASE = `http://127.0.0.1:${PORT}`;
const keep = process.argv.includes("--keep");
const tmp = mkdtempSync(path.join(os.tmpdir(), "d_e2e_"));
const env = { ...process.env, VV_SOUNDS_JSON: path.join(tmp, "sounds.json"), VV_SOUND_DOC: path.join(tmp, "sounds.md") };
const results = [];
const check = (n, ok, msg) => {
  results.push({ n, ok, msg });
  console.log(`${ok ? "PASS" : "FAIL"}  [${n}] ${msg}`);
};
const ed = (label, ...args) => {
  const r = spawnSync("python3", [path.join(SCRIPTS, "edit_decisions.py"), ...args], { cwd: REPO, env, encoding: "utf8" });
  console.log(`      [Claude Code] ${label}: edit_decisions.py ${args.slice(0, 4).join(" ")} -> exit ${r.status}`);
  return { ...r, out: (r.stdout ?? "") + (r.stderr ?? "") };
};
const docPath = path.join(APP, "src", "projects", SLUG, "edit.json");
const docOf = () => JSON.parse(readFileSync(docPath, "utf8"));
const segOf = (id) => docOf().segments.find((s) => s.id === id);
const reqsFor = (seg) => docOf().requests.filter((r) => r.segmentId === seg && r.type === "implement");

const D1 = "Başla: büyük beyaz başlık, sonra sağdan bir kart!\n\n– Kart sola çıkar; vurgu \"tek\" kelimede (ğüşiöç)…";

spawnSync("python3", [path.join(SCRIPTS, "edit_init.py"), "--slug", SLUG, "--remove"]);
rmSync(path.join(REPO, "work", SLUG), { recursive: true, force: true });
let r = spawnSync("python3", [path.join(SCRIPTS, "edit_init.py"), "--script-only", "--slug", SLUG, "--duration", "9"], { env, encoding: "utf8" });
if (r.status) throw new Error(r.stdout + r.stderr);
const png = path.join(tmp, "my-ref.png");
r = spawnSync("python3", ["-c", `from PIL import Image; Image.new("RGB", (64, 40), (30, 90, 220)).save(${JSON.stringify(png)})`]);
if (r.status) throw new Error(String(r.stderr));
try {
  await fetch(`${BASE}/api/projects`);
  throw new Error(`port ${PORT} is already in use: stop the running Studio (npm run studio) first`);
} catch (e) {
  if (String(e.message).startsWith("port")) throw e;
}
const vite = spawn(path.join(APP, "node_modules", ".bin", "vite"), ["--config", "vite.config.ts"], { cwd: APP, env, stdio: ["ignore", "pipe", "pipe"], detached: true });
let viteLog = "";
vite.stdout.on("data", (d) => (viteLog += d));
vite.stderr.on("data", (d) => (viteLog += d));
for (let i = 0; i < 60; i++) {
  try {
    if ((await fetch(`${BASE}/api/projects`)).ok) break;
  } catch {
    // not up yet
  }
  await new Promise((ok) => setTimeout(ok, 500));
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(e.message));
const shot = (name) => page.screenshot({ path: path.join(tmp, `${name}.png`) });
const waitFor = async (fn, what, timeout = 20000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    if (await fn()) return true;
    await page.waitForTimeout(250);
  }
  throw new Error(`timed out waiting for ${what}`);
};
const dText = () => page.getByTestId("d-text").inputValue();
const saved = (id, fn, what) => waitFor(() => fn(segOf(id)), what);
const openScene = async (id) => {
  await page.getByTestId(`seg-${id}`).click();
  await page.getByTestId("tab-creative").click();
  await waitFor(async () => (await page.getByTestId("creative-panel").locator("h2").first().innerText().catch(() => "")) === id, `the ${id} panel`);
};

try {
  await page.goto(`${BASE}/?project=${SLUG}`);
  await page.getByTestId("script-input").fill(["[00:00.50 - 00:04.00] One idea changed everything", "[00:04.50 - 00:08.50] And here is how it works"].join("\n"));
  await page.getByTestId("import-script").click();
  await page.getByTestId("line-T001").waitFor();

  // ---------------------------------------------------------------- 1 D on a fresh scene
  await page.getByTestId("text-T001").click();
  await page.getByTestId("create-fullscreen").click();
  await waitFor(async () => /One idea changed/.test((await page.getByTestId("seg-text").textContent().catch(() => "")) ?? ""), "the S01 panel");
  await page.getByTestId("d-text").fill(D1);
  await page.getByTestId("choose-D").click();
  await waitFor(() => reqsFor("S01").length === 1, "the S01 request");
  const s1 = segOf("S01");
  const q1 = reqsFor("S01")[0];
  check(1, s1.decision?.custom === D1 && q1.brief.custom === D1 && q1.status === "pending" && (s1.decision.attachments ?? []).length === 0 && !Object.keys(s1.concepts ?? {}).length,
    "D on a fresh scene without references or A/B/C: decision and request keep the text byte for byte (line breaks, punctuation, ğüşiöç)");

  // ---------------------------------------------------------------- 2 the draft is kept
  await page.getByTestId("text-T002").click();
  await page.getByTestId("create-fullscreen").click();
  await waitFor(async () => /here is how it works/.test((await page.getByTestId("seg-text").textContent().catch(() => "")) ?? ""), "the S02 panel");
  const D2 = "A dark card slides in from the right,\nthen leaves to the left.";
  await page.getByTestId("d-text").fill(D2);
  await page.getByTestId("tab-references").click();
  await page.getByTestId("refs-panel").waitFor();
  await page.getByTestId("tab-creative").click();
  const afterTab = await dText();
  await openScene("S01");
  await openScene("S02");
  const afterScene = await dText();
  await saved("S02", (s) => s.dDraft?.text === D2, "the S02 draft in edit.json");
  await page.reload();
  await openScene("S02");
  const afterReload = await dText();
  check(2, afterTab === D2 && afterScene === D2 && afterReload === D2, "the D draft survives a tab switch, a scene switch and a reload (stored as seg.dDraft in edit.json)");

  // ---------------------------------------------------------------- 3 one entity, two views
  await page.getByTestId("d-ref-search").fill("glow");
  await page.locator('[data-testid^="d-ref-add-"]').first().waitFor();
  const hitId = (await page.locator('[data-testid^="d-ref-add-"]').first().getAttribute("data-testid")).replace("d-ref-add-", "");
  await page.locator(`[data-testid="d-ref-add-${hitId}"]`).click();
  await page.getByTestId(`d-att-${hitId}`).waitFor();
  await page.getByTestId("tab-references").click();
  const target = await page.getByTestId("refs-target").innerText();
  await page.getByTestId("refs-panel").locator("input").last().fill(hitId);
  await page.getByTestId(`ref-use-${hitId}`).first().waitFor();
  const btn = await page.getByTestId(`ref-use-${hitId}`).first().innerText();
  await page.getByTestId(`ref-use-${hitId}`).first().click();
  await page.getByTestId("tab-creative").click();
  const goneInD = (await page.getByTestId(`d-att-${hitId}`).count()) === 0;
  await saved("S02", (s) => !(s.dDraft?.attachments ?? []).some((a) => a.id === hitId), "the detach in edit.json");
  const stillInLib = (await (await fetch(`${BASE}/api/references?q=${hitId}&cat=`)).json()).some((x) => x.id === hitId);
  check(3, target.includes(hitId) && /remove from D/.test(btn) && goneInD && stillInLib,
    `${hitId} attached in the D editor shows in the References tab; "remove from D" there removes it in D; the reference stays in the library`);

  // ---------------------------------------------------------------- 4 upload, link, project reference, exclusion, snapshot
  await page.getByTestId("d-upload").setInputFiles(png);
  await page.locator(".upload-thumb").first().waitFor();
  await page.getByTestId("d-ref-url").fill("https://example.com/my-reference-video");
  await page.getByTestId("d-ref-url-add").click();
  await page.getByTestId("d-att-URL-1").waitFor();
  await page.getByTestId("tab-references").click();
  await page.getByTestId("refs-panel").locator("input").last().fill("FUL-072");
  await page.getByTestId("ref-project-FUL-072").first().click();
  await page.getByTestId("refs-panel").locator("input").last().fill("ONS-024");
  await page.getByTestId("ref-project-ONS-024").first().click();
  await page.getByTestId("tab-creative").click();
  await page.getByTestId("d-att-FUL-072").waitFor();
  await page.getByTestId("d-att-inherit-FUL-072").click();
  await page.getByTestId("d-att-role-ONS-024").selectOption("motion");
  await page.getByTestId("d-att-note-ONS-024").fill("take the glow on the peak only");
  await waitFor(async () => /FUL-072/.test(await page.getByTestId("d-summary-excluded").innerText().catch(() => "")), "the exclusion in the summary");
  const summary = await page.getByTestId("d-summary-refs").innerText();
  await saved("S02", (s) => (s.refExclude ?? []).includes("FUL-072"), "the exclusion in edit.json");
  await waitFor(() => (docOf().refs ?? []).length === 2, "the project references in edit.json");
  await page.getByTestId("choose-D").click();
  await waitFor(() => reqsFor("S02").length === 1, "the S02 request");
  const b2 = reqsFor("S02")[0].brief;
  const ids = (b2.attachments ?? []).map((a) => a.id);
  const ons = (b2.attachments ?? []).find((a) => a.id === "ONS-024");
  check(4, b2.custom === D2 && ids.some((x) => x.startsWith("UP-")) && ids.includes("URL-1") && ids.includes("ONS-024") && !ids.includes("FUL-072") && !ids.includes(hitId) &&
    (b2.excluded ?? []).includes("FUL-072") && ons?.from === "project" && ons?.role === "motion" && ons?.note === "take the glow on the peak only" && /ONS-024/.test(summary) &&
    (segOf("S01").decision.attachments ?? []).length === 0,
    `snapshot = upload + link + inherited ONS-024 (role motion, note kept); FUL-072 excluded for this scene only; S01's earlier decision keeps its own inputs (${ids.join(", ")})`);

  // ---------------------------------------------------------------- 5 repeated Apply
  await page.getByTestId("choose-D").click();
  await page.waitForTimeout(1500);
  const open5 = reqsFor("S02").filter((x) => x.status === "pending");
  check(5, reqsFor("S02").length === 1 && open5.length === 1 && segOf("S02").decision.requestId === open5[0].id, "saving the same D again is idempotent: still one request, nothing duplicated");

  // ---------------------------------------------------------------- 6 a newer decision wins
  const old6 = reqsFor("S02")[0].id;
  await page.getByTestId("d-text").fill(D2 + "\nMake the card blue.");
  await page.getByTestId("choose-D").click();
  await waitFor(() => reqsFor("S02").length === 2, "the second S02 request");
  writeFileSync(path.join(tmp, "b.json"), JSON.stringify({ beat: { kind: "KineticText", props: { text: "x", placement: "fullscreen", outAt: 3 } }, coverage: [], match: [] }));
  const stale = ed("build the superseded request", "built", SLUG, "--request", old6, "--file", path.join(tmp, "b.json"));
  check(6, docOf().requests.find((x) => x.id === old6).status === "cancelled" && stale.status !== 0 && /cancelled|out of date/.test(stale.out) && docOf().beats.length === 0,
    `a changed D supersedes ${old6} (cancelled); building it is refused, nothing written`);

  // ---------------------------------------------------------------- 7 failed requests are superseded too
  const cur7 = segOf("S02").decision.requestId;
  ed("mark it failed", "fail", SLUG, "--request", cur7, "--reason", "test: a build that failed");
  await page.getByTestId("d-text").fill(D2 + "\nMake the card green.");
  await page.getByTestId("choose-D").click();
  await waitFor(() => reqsFor("S02").length === 3, "the third S02 request");
  const late = ed("build the failed request later", "built", SLUG, "--request", cur7, "--file", path.join(tmp, "b.json"));
  check(7, docOf().requests.find((x) => x.id === cur7).status === "cancelled" && late.status !== 0 && docOf().beats.length === 0,
    `the failed ${cur7} is superseded by the new decision and can no longer build over it`);

  // ---------------------------------------------------------------- 8 a race that reopened an old request
  const d8 = docOf();
  d8.requests.find((x) => x.id === old6).status = "pending";
  writeFileSync(docPath, JSON.stringify(d8, null, 1));
  const race = ed("build an old request reopened by a race", "built", SLUG, "--request", old6, "--file", path.join(tmp, "b.json"));
  check(8, race.status !== 0 && /out of date/.test(race.out) && docOf().beats.length === 0, `an old request (${old6}) that is open again is refused as out of date; the newer decision stays`);

  // ---------------------------------------------------------------- 9 what Claude Code sees
  const cur9 = segOf("S02").decision.requestId;
  const show = ed("show", "show", SLUG, "--request", cur9);
  check(9, show.out.includes(D2 + "\nMake the card green.") && /THIS SCENE WILL USE/.test(show.out) && /ONS-024 .*motion .*project/.test(show.out) &&
    /URL-1 .*https:\/\/example.com\/my-reference-video/.test(show.out) && /UP-\S*my-ref\.png/.test(show.out) && /excluded \(do NOT use\): FUL-072/.test(show.out) &&
    /take the glow on the peak only/.test(show.out),
    "show prints the idea verbatim and THIS SCENE WILL USE: the upload file, the link, ONS-024 (motion, from project, with the note) and the exclusion");

  // ---------------------------------------------------------------- 10 undo
  await page.getByTestId("d-text").fill("first version");
  await page.waitForTimeout(900);
  await page.getByTestId("d-text").fill("second version");
  await page.waitForTimeout(900);
  await page.getByTestId("undo").click();
  await waitFor(async () => (await dText()) === "first version", "undo of the draft");
  check(10, (await dText()) === "first version", "undo brings back the previous D draft");

  // ---------------------------------------------------------------- 11 migration of a legacy project
  const d11 = docOf();
  delete d11.schema;
  delete d11.migrations;
  const s11 = d11.segments.find((s) => s.id === "S01");
  s11.decision.refs = ["ONS-024"];
  s11.decision.uploads = ["/tmp/legacy-ref.png"];
  delete s11.decision.attachments;
  writeFileSync(docPath, JSON.stringify(d11, null, 1));
  const loaded = (await (await fetch(`${BASE}/api/project/${SLUG}`)).json()).doc;
  const m = loaded.segments.find((s) => s.id === "S01").decision;
  check(11, loaded.schema === 2 && (loaded.migrations ?? []).length === 1 && m.custom === D1 && m.refs[0] === "ONS-024" && m.uploads[0] === "/tmp/legacy-ref.png" &&
    m.attachments.map((a) => a.id).join(",") === "ONS-024,UP-legacy-ref.png",
    "a legacy D decision gets an attachments snapshot from its refs/uploads; text, refs and uploads are kept (schema 2, migration recorded)");

  await shot("d-editor");
  check("errors", pageErrors.length === 0, `no page errors (${pageErrors.slice(0, 2).join(" | ")})`);
} catch (e) {
  check("run", false, String(e.stack ?? e));
  await shot("error").catch(() => {});
} finally {
  await browser.close();
  try {
    process.kill(-vite.pid, "SIGTERM");
  } catch {
    // already stopped
  }
  if (!keep) {
    spawnSync("python3", [path.join(SCRIPTS, "edit_init.py"), "--slug", SLUG, "--remove"]);
    rmSync(path.join(REPO, "work", SLUG), { recursive: true, force: true });
    rmSync(tmp, { recursive: true, force: true });
  }
}
const failed = results.filter((x) => !x.ok);
if (failed.length && viteLog) console.log("\n--- Studio server log (tail) ---\n" + viteLog.split("\n").slice(-30).join("\n"));
console.log(`\n${results.length - failed.length}/${results.length} checks passed${keep ? ` (kept: ${tmp}, project ${SLUG})` : ""}`);
process.exit(failed.length ? 1 : 0);
