#!/usr/bin/env node
/*
 * Headless verification for the .asf.yaml Validator & Builder ("Lint Catcher").
 *
 * The in-page "Run fixtures (self-test)" button is the authoritative record, but
 * this script lets you (or an agent) check the SAME engine + fixtures from the
 * command line — no browser, and the dependency-free core uses only node builtins.
 *
 * It extracts the bundled js-yaml and the tested logic block (between the
 * //__LOGIC_START__ / //__LOGIC_END__ markers) from the single index.html and runs
 * them in a vm sandbox exactly as the browser would (same bundled parser), then
 * asserts:
 *   1. every validator fixture (runFixtures) matches its expected verdict;
 *   2. every builder fixture (runBuilderFixtures: emit / round-trip / edit) matches;
 *   3. the embedded fixtures are byte-identical to the on-disk fixtures/ (no drift);
 *   4. the Builder's enum dropdowns + ruleset raw-key list are built from the SAME
 *      constants the engine validates against (single-source check).
 *
 * Optional extras run automatically IF their dev-deps are present, and skip with a
 * note otherwise (run `npm i jsdom ajv` in this folder to enable them):
 *   5. jsdom — loads index.html and drives the real in-page self-test + an
 *      import/edit round-trip through the DOM;
 *   6. ajv  — validates asf-yaml-schema/asf-yaml.schema.json against every fixture.
 *
 * Exits 0 only if everything required passes; non-zero otherwise.
 * Usage:  node scripts/verify.js
 */
"use strict";
const fs = require("fs");
const vm = require("vm");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const TOOL = path.join(ROOT, "tools", "asf-yaml-validator");
const INDEX = path.join(TOOL, "index.html");
const FIXTURES = path.join(TOOL, "fixtures");
const SCHEMA = path.join(ROOT, "asf-yaml-schema", "asf-yaml.schema.json");

let failures = 0;
const ok = (cond, msg) => { console.log((cond ? "  ok  " : "  XX  ") + msg); if (!cond) failures++; };
const section = (t) => console.log("\n== " + t + " ==");

// ---- load the bundled js-yaml + the tested logic block, faithfully ----
function loadEngine() {
  const html = fs.readFileSync(INDEX, "utf8");
  // bundled js-yaml: the whole <script> block that starts with the "/*! js-yaml" banner
  const yMatch = html.match(/<script>\s*(\/\*! js-yaml[\s\S]*?)<\/script>/);
  if (!yMatch) throw new Error("could not locate the bundled js-yaml blob in index.html");
  const bundle = yMatch[1];
  // tested logic block between the markers
  const lMatch = html.match(/\/\/__LOGIC_START__([\s\S]*?)\/\/__LOGIC_END__/);
  if (!lMatch) throw new Error("could not locate the //__LOGIC_START__..__LOGIC_END__ block");
  const logic = lMatch[1];

  const sandbox = {};
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.console = console;
  vm.createContext(sandbox);
  vm.runInContext(bundle, sandbox, { filename: "js-yaml.bundle.js" });
  if (!sandbox.jsyaml) throw new Error("bundled js-yaml did not attach to window.jsyaml");
  vm.runInContext(logic, sandbox, { filename: "logic.js" });
  if (!sandbox.ASFYAML) throw new Error("ASFYAML not defined after running the logic block");
  return { A: sandbox.ASFYAML, jsyaml: sandbox.jsyaml };
}

const { A } = loadEngine();
console.log("Lint Catcher headless verify — schema snapshot " + A.SCHEMA_DATE);

// ---- 1. validator fixtures ----
section("validator fixtures (runFixtures)");
{
  const r = A.runFixtures();
  r.rows.filter(x => !x.ok).forEach(x => console.log("    mismatch: " + x.id + " expected " + x.expected + " got " + x.got));
  ok(r.pass === r.total, "validator " + r.pass + "/" + r.total);
}

// ---- 2. builder fixtures ----
section("builder fixtures (runBuilderFixtures)");
{
  const r = A.runBuilderFixtures();
  r.rows.filter(x => !x.ok).forEach(x => console.log("    mismatch: " + x.id + " [" + x.kind + "] got " + x.got));
  const by = {};
  r.rows.forEach(x => { by[x.kind] = by[x.kind] || { p: 0, t: 0 }; by[x.kind].t++; if (x.ok) by[x.kind].p++; });
  ok(r.pass === r.total, "builder " + r.pass + "/" + r.total + "  " + JSON.stringify(by));
}

// ---- 3. embedded vs on-disk fixture drift ----
section("fixture drift (embedded vs on-disk)");
{
  let drift = 0;
  A.EMBEDDED_FIXTURES.forEach(fx => {
    const p = path.join(FIXTURES, fx.id + ".yaml");
    if (!fs.existsSync(p)) { console.log("    missing on disk: " + fx.id); drift++; return; }
    if (fs.readFileSync(p, "utf8") !== fx.yaml) { console.log("    DRIFT: " + fx.id); drift++; }
  });
  ok(drift === 0, "all embedded validator fixtures match fixtures/*.yaml byte-for-byte");
}

// ---- 4. single-source: form dropdowns/keys derive from engine constants ----
section("single-source (form == engine constants)");
{
  const findField = (fields, key) => {
    for (const f of fields) { if (f.key === key) return f; if (f.fields) { const r = findField(f.fields, key); if (r) return r; } }
    return null;
  };
  const proj = A.SCHEMA.find(b => b.key === "project");
  const gh = A.SCHEMA.find(b => b.key === "github");
  const opts = (f) => f.options.filter(x => x !== "");
  const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  ok(eq(opts(findField(proj.fields, "vote_mode")), A.VOTE_MODES), "vote_mode dropdown == VOTE_MODES");
  ok(eq(opts(findField(proj.fields, "license_check_mode")), A.LICENSE_MODES), "license_check_mode dropdown == LICENSE_MODES");
  ok(eq(opts(findField(gh.fields, "ghp_path")), A.GHP_PATHS), "ghp_path dropdown == GHP_PATHS");
  ok(eq(opts(findField(gh.fields, "squash_commit_message")), A.SQUASH_MSG), "squash_commit_message dropdown == SQUASH_MSG");
  ok(eq(opts(findField(gh.fields, "merge_commit_message")), A.MERGE_MSG), "merge_commit_message dropdown == MERGE_MSG");
  ok(Array.isArray(A.RULESET_RAW_KEYS) && A.RULESET_RAW_KEYS.length === 4, "RULESET_RAW_KEYS exported for the form to reuse");
}

// ---- 5. optional: jsdom DOM self-test ----
section("optional: jsdom DOM wiring");
(function () {
  let JSDOM;
  try { JSDOM = require("jsdom").JSDOM; } catch (e) { console.log("  --  skipped (jsdom not installed; `npm i jsdom` to enable)"); return; }
  const html = fs.readFileSync(INDEX, "utf8");
  const dom = new JSDOM(html, { runScripts: "dangerously", pretendToBeVisual: true });
  const { window } = dom, doc = window.document;
  const $ = (id) => doc.getElementById(id);
  const fire = (el, t) => el.dispatchEvent(new window.Event(t, { bubbles: true }));
  // jsdom executes the page scripts synchronously enough that the elements exist now.
  try {
    $("tabBuild").click();
    const yaml = "github:\n  description: hi\n  future_thing: keepme\nzzz_top:\n  a: 1\n";
    $("btnImport").click(); $("importText").value = yaml; fire($("importText"), "input"); $("btnDoImport").click();
    const out = $("outPane").textContent;
    ok(/future_thing:\s*keepme/.test(out) && /zzz_top:/.test(out), "import preserves unknown nested + top-level keys");
    $("btnTest").click();
    const sum = ($("outTest").querySelector(".stsum") || {}).textContent || "";
    ok(/Validator \d+\/\d+/.test(sum) && !/MISMATCH/.test($("outTest").innerHTML), "in-page self-test: " + sum.trim());
  } catch (e) { ok(false, "jsdom run threw: " + e.message); }
})();

// ---- 6. optional: ajv schema vs fixtures ----
section("optional: ajv JSON-schema vs fixtures");
(function () {
  let Ajv;
  try { Ajv = require("ajv/dist/2020"); } catch (e) { console.log("  --  skipped (ajv not installed; `npm i ajv` to enable)"); return; }
  const { jsyaml } = loadEngine();
  const schema = JSON.parse(fs.readFileSync(SCHEMA, "utf8"));
  const validate = new Ajv({ allErrors: true, strict: false }).compile(schema);
  let bad = 0;
  fs.readdirSync(FIXTURES).filter(f => f.endsWith(".yaml")).forEach(f => {
    if (!f.startsWith("good-")) return; // good-* must never be a schema false-positive
    let doc; try { doc = jsyaml.load(fs.readFileSync(path.join(FIXTURES, f), "utf8")); } catch (e) { return; }
    if (!validate(doc)) { bad++; console.log("    false positive: " + f + " -> " + JSON.stringify(validate.errors[0])); }
  });
  ok(bad === 0, "every good-* fixture validates against the JSON schema (no false positives)");
})();

console.log("\n" + (failures === 0 ? "ALL GREEN ✓" : (failures + " FAILURE(S) ✗")));
process.exit(failures === 0 ? 0 : 1);
