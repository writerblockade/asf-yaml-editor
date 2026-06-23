# Project: `.asf.yaml` Validator & Builder ("Lint Catcher")

> Paste this into the new project's custom instructions. It is adapted from the
> parent "ASF Infra Tooling" charter, narrowed to this one tool.

## What this project is
Maintaining and extending a single, standalone, deterministic tool that helps
Apache Software Foundation projects get their **`.asf.yaml`** right *before* they
commit it: an offline **Validator** (paste a file, get a PASS/WARN/FAIL report)
and a **Builder** (a form that creates/edits/round-trips an `.asf.yaml` and
validates it live with the same engine). Both tabs live in one self-contained
`tools/asf-yaml-validator/index.html`. A companion JSON Schema
(`asf-yaml-schema/`) covers the *structural* half for schema-aware editors.
The tool is compiled via agentic coding: the owner (an ASF Member) directs and
verifies by behavior but does not hand-write the code.

## Hard constraints (non-negotiable)
1. READ-ONLY / REPORT-GENERATING ONLY. The worst-case failure must be "it
   produced a wrong report," never "it broke something." The tool parses,
   validates, and prints. It must NOT write to or commit to any repo, or take any
   irreversible action. Output is text the user copies/downloads and commits
   themselves.
   - **Network carve-out (owner-approved 2026-06-22):** the one allowed network
     action is the opt-in **Import from a repo** feature — a user-triggered,
     read-only `GET` of a public `.asf.yaml` from `raw.githubusercontent.com`,
     used only to populate the paste box / form. It must stay read-only (no
     writes, commits, auth, or other endpoints), must degrade gracefully when the
     request is blocked (show the URL + a `curl` fallback), and the "never writes
     / never changes your repo" promise is unchanged. Everything else still makes
     **no** network calls; `js-yaml` remains bundled inline (no CDN).
2. ONE SELF-CONTAINED FILE, NO BACKEND, NO BUILD STEP. The tool is a single
   `index.html` that runs from `file://` with everything inlined (`js-yaml` is
   bundled inline; no CDN). No server, no database, no always-on service. If a
   change seems to "need" a server or shared state, STOP and challenge it.
3. NO BROWSER STORAGE. Keep all state in memory — no `localStorage` /
   `sessionStorage`. Settings are not persisted between sessions, by design.
4. RUN BY THE PEOPLE WHO NEED IT. A release manager / PMC member runs this
   themselves in a browser tab. Nothing here should require Infra to host or
   babysit it.

## Single-source the engine
The Builder must reuse the Validator's rule engine (`ASFYAML.lintAsfYaml`)
directly — there is exactly one copy of the rules. Don't fork or duplicate the
engine for the form. Import is lossless: keys the form doesn't model round-trip
**verbatim** (Advanced → unrecognized keys); nothing is silently dropped.

## Before changing what the tool checks: verify against live policy
Do NOT trust model memory about what `.asf.yaml` supports or what current policy
says — fetch the live source every time:
- `.asf.yaml` schema / docs: `apache/infrastructure-asfyaml` (the public schema is
  itself a work in progress: "omissions, factually incorrect items, and
  placeholders").
- Release / distribution / source-header / website policy: apache.org/legal and
  infra.apache.org.
If policy and model memory disagree, policy wins. Because the schema moves: an
unknown top-level key is a WARN, never a FAIL; every finding cites the schema
section it came from; and the tool carries a visible **schema snapshot date +
source link** so it's easy to refresh. Cautionary precedent: a release-artifact
validator was nearly built before discovering ATR already did it — confirm ASF
doesn't already cover a proposed check before adding it.

## Verification methodology (how we trust it without reading the code)
Fixtures first. Every rule has known-good / known-bad inputs in `fixtures/`
(validator) and `fixtures/builder/` (emit + lossless round-trip), each with its
expected verdict. The in-page **Run fixtures (self-test)** button runs every
fixture through the same engine the tabs use and asserts each matches; the tool
is "correct" only when all match. The owner verifies by behavior, not by reading
source line-by-line. When examples or checks are added, source their bodies from
the verified fixtures so verdicts stay grounded. Beyond the in-page self-test,
changes can be checked headlessly with `node` (engine) and `jsdom` (DOM/UI
wiring); always state how each change was tested. The lockout footgun (required
status-check `contexts` on the default branch, which can lock you out of editing
`.asf.yaml` itself) is the single highest-value warning — protect it.

## Working agreements (owner's standing rules)
- NO SILENT PIVOTS. If the approach needs to change, say so and get a yes first.
- EXPLICIT APPROVAL before any destructive/irreversible filesystem operation
  (move, delete, overwrite). Staged, checkpointed execution — pause at
  checkpoints rather than running unattended.
- Honest pushback over agreement. If an idea is weak, redundant, or risky, say so
  plainly, with reasons.

## Output defaults
- One self-contained `index.html`; clear PASS / WARN / FAIL output a non-expert
  can read; findings cite their rule + schema section.
- Ship fixtures alongside any new check, and keep the README's "what it checks /
  what's out of scope" current.
- Always carry the schema snapshot date, the source link, and the "not a
  guarantee of acceptance — test on a non-default branch first" disclaimer.

## Where things are
- `tools/asf-yaml-validator/` — the tool (index.html, README, fixtures/, brand/).
- `asf-yaml-schema/` — the companion JSON Schema + its README.
- `docs/` — `spec-validator-tool-3.md`, `spec-builder-tool-4.md`, `ui-guidance.md`.
- `design/` — bespoke-SVG spec + UI sketches.
- `assets/icons/` — feather + tabler icon sets (design resources; the tool itself
  is self-contained and does not load them at runtime).
