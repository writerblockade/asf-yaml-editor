# Offline `.asf.yaml` Validator & Builder

A single-file, offline tool for an Apache `.asf.yaml` file, with two tabs:

- **Validate** — paste a file, get a grouped **PASS / WARN / FAIL** report a
  non-expert can read.
- **Build** — a GUI that *creates and edits* an `.asf.yaml` from labelled
  controls (dropdowns, toggles, list/map editors), emits the YAML live, and
  validates it with the same engine as you build. It can also **import** an
  existing file to edit — by pasting it, or by **fetching it from a repo**
  (owner/repo + branch).

It runs in your browser tab — no server, no build step, no storage. It only ever
**produces text for you to copy**; it never writes to your repo or commits. By
default it makes **no** network calls. The one exception is the opt-in **Import
from a repo** button, which does a read-only GET of a public `.asf.yaml` you ask
for (and, if your browser blocks that — common from `file://` — falls back to
showing the exact URL and a `curl` one-liner to fetch it yourself).

**Open it:** double-click `index.html`. That's it. (Works from `file://`; no
internet connection needed for validating/building — `js-yaml` is bundled inline.
Only **Import from a repo** reaches the network.)

> **Not a guarantee of acceptance.** This is an independent, *unofficial*
> re-implementation of the checks in Apache's **public** `.asf.yaml` schema
> ([apache/infrastructure-asfyaml](https://github.com/apache/infrastructure-asfyaml)),
> which upstream itself labels a work in progress ("omissions, factually
> incorrect items, and placeholders"). It is **not** the server-side code ASF
> runs to apply your config. A clean result means "no obvious problems," not
> "guaranteed valid." It is not legal or policy advice. When in doubt,
> **test on a non-default branch first.**

## What it checks

**Structure / schema**

- The file parses as YAML at all (otherwise FAIL, with line/column).
- The top level is a mapping; known keys (`meta`, `project`, `notifications`,
  `staging`, `publish`, `pelican`, `jekyll`, `github`, `jenkins`) are recognised,
  and **unknown top-level keys are WARN, never FAIL** (the schema is incomplete)
  — this catches the classic `notifcations:` typo. (`meta` selects the
  `.asf.yaml` environment — see `docs/ASFYamlFeature.md`.)
- `project.metadata.key` and `project.metadata.committee` are present when a
  `project` block exists; if you supply a repo name, `committee` must prefix it.
- `project.metadata.doap` is `https` and lives under `apache.org` or
  `raw.githubusercontent.com/apache` (redirects are not followed upstream).
- Enums: `policy.vote_mode ∈ {manual, email, trusted}`,
  `policy.license_check_mode ∈ {Both, Lightweight, RAT}`,
  `enabled_merge_buttons.squash_commit_message` /`merge_commit_message` in their
  allowed sets, `ghp_path ∈ {/docs, /}`, `ghp_branch` = default branch or
  `gh-pages`.
- Mutual exclusivity: `policy.vote_mode` vs `policy.manual_vote`; convenience
  vs raw-payload syntax within a single `github.rulesets` entry.
- Limits: `collaborators` ≤ 10, `labels` ≤ 20, and at least one of
  `enabled_merge_buttons` squash/merge/rebase must be true.
- `staging.autostage` must be of the `$foo/*` form.

**Footguns / high-risk warnings (the real value)**

- **Lockout risk.** If `protected_branches.<branch>.required_status_checks`
  sets `contexts`/`checks`, the tool raises a prominent WARN quoting the
  official caution (see below). If you paste your real CI check names, it
  spell-checks each `context` against them and flags mismatches.
- `enabled_merge_buttons` with nothing enabled ⇒ FAIL.
- `features.discussions: true` without a `notifications.discussions` target ⇒ FAIL.
- `staging` / `publish` without `whoami` ⇒ WARN (won't run).
- `notifications` in a non-default branch ⇒ WARN (only applies on default).
- A `rulesets` convenience entry with `required_conversation_resolution` but no
  `required_pull_request_reviews` ⇒ FAIL.
- Deprecated keys ⇒ WARN: top-level `github.del_branch_on_merge` (moved under
  `pull_requests`), `github.protected_tags` (GitHub tag protection sunset Feb
  2024), and `jenkins` / `github_whitelist`.

Optional inputs (default branch, repo name, the branch the file lives in, and
your real CI check names) sharpen a few checks. They are all optional; leave
them blank if unsure.

## The lockout footgun, specifically

The upstream Branch protection docs warn, verbatim:

> The names of the required checks are not validated. … A typo in these
> settings for the default branch **will prevent you from modifying the
> `.asf.yaml` file itself.**

Because upstream doesn't validate check names (and this tool isn't the code that
applies them), it cannot confirm a check name is real — it can only (a) warn
loudly whenever `contexts`/`checks` are set on a (default) branch, and (b)
spell-check the names against a list you provide. This is the single most useful
thing it does.

## The Build tab (GUI)

Open **Build** to assemble an `.asf.yaml` without hand-writing YAML:

- **Every documented key has a labelled control.** Enums are dropdowns (e.g.
  `vote_mode`, `license_check_mode`, the merge-commit-message sets, `ghp_path`),
  booleans are tri-state selects (`(unset)` / `true` / `false`, so "explicitly
  false" is distinct from "absent"), and the nested blocks
  (`protected_branches`, `environments`, rulesets, `custom_subjects`,
  `commits_by_path`, recipients…) get repeatable list / named-group / key→value
  editors.
- **One carve-out:** the *raw* GitHub Rulesets API payload and any
  unknown/future keys are freeform by nature, so they're edited as raw YAML (a
  per-ruleset raw box, plus an **Advanced** section for unmodeled top-level
  keys) and preserved **verbatim** — nothing is ever silently dropped.
- **Live YAML + live validation.** The generated file and the same PASS/WARN/FAIL
  report update on every change, so footguns surface as you build (e.g. enabling
  `features.discussions` without a notification target shows the FAIL
  immediately; default-branch required checks show the lockout WARN).
- **Import to edit.** Paste an existing file (or click *Edit in Builder* from the
  Validate tab); the controls populate, and keys the form doesn't model ride
  along in the Advanced section and re-emit exactly.
- **Output is copy / download only.** A read-only pane with **Copy** and
  **Download .asf.yaml**. Both just hand you generated text — you commit it to
  your repo yourself. The tool never touches your repo.
- Deprecated keys carry a **deprecated** badge; default-branch-only and
  branch-specific blocks are labelled so you don't configure them in the wrong
  branch.

The four optional context inputs (default branch, repo name, the branch the file
lives in, real CI check names) are **shared by both tabs**, so the lockout
spell-check, committee-prefix, and non-default-branch checks also fire while you
build.

## Examples helper

Both tabs have an **examples** menu so you don't start from a blank page:

- **Validate → "Load an example ▾"** opens a searchable menu. *Starter templates*
  (minimal notify+publish, full project, meta/environment, **GitHub ruleset for
  default branch protection**) load a clean valid file; *See what a problem looks
  like* (a key typo, the status-check lockout, discussions with no target) load a
  deliberately broken file. Either way the
  example loads into the paste box **and validates immediately**, so you can see
  the PASS / WARN / FAIL report it produces.
- **Build → "Start from an example ▾"** loads a starter template straight into the
  form controls (the broken teaching cases are Validate-only).

Every example body is pulled **verbatim from the verified fixtures** (the only
edit is dropping the `# EXPECTED:` test header on load), so each one's verdict is
exactly what the in-page self-test asserts — nothing here invents schema keys.
The default-protection ruleset example mirrors the convenience syntax used in
[apache/infrastructure-github-merge-queue-notifier#1](https://github.com/apache/infrastructure-github-merge-queue-notifier/pull/1/files).

## Import from a repo (the one opt-in network feature)

Both tabs have an **Import from a repo** box: type `owner/repo` (or paste a
`github.com` / `raw.githubusercontent.com` URL) and a branch, and the tool builds
the `raw.githubusercontent.com/<owner>/<repo>/<branch>/.asf.yaml` URL and fetches
it — Validate drops it in the paste box and validates; Build imports it into the
form. This is the **only** thing in the tool that touches the network, it is a
read-only `GET`, and it is triggered explicitly by you. If the fetch is blocked
(opening the page from `file://` blocks cross-origin requests in most browsers) or
the file 404s, it falls back to showing the exact URL plus a `curl` one-liner so
you can fetch it yourself and paste. It never writes, commits, or changes anything.

## Policy / schema source

- **Schema source of truth:** `apache/infrastructure-asfyaml` — the published
  `.asf.yaml` documentation and schema.
  <https://github.com/apache/infrastructure-asfyaml>
- **Schema snapshot date:** **2026-06-22** (README on `main` re-fetched and
  reconciled that day; the rulesets convenience/raw schema was unchanged from the
  2026-06-19 snapshot).
- YAML parse **and serialize**: [`js-yaml` 4.1.0](https://github.com/nodeca/js-yaml),
  bundled inline (MIT). No network access at runtime.

The schema is explicitly a moving target, so this rule set is designed to be
refreshed: unknown keys never hard-fail, and every finding cites the schema
section it came from. Re-check the source above when upstream changes.

## How each rule was tested (the fixtures)

Fixtures were written **before** the logic. The `fixtures/` folder holds 16
known-good / known-bad `.asf.yaml` files, each with a `# EXPECTED:` header and
listed in `fixtures/EXPECTED.md`. The tool's **Run fixtures (self-test)** button
runs every fixture through the exact same engine the paste box uses and asserts
each produces its expected overall verdict (FAIL > WARN > PASS). The tool is
"correct" only when all 16 match.

| Fixture | Expected | Targets |
|---|---|---|
| `good-basic.yaml` | PASS | minimal valid file |
| `good-full.yaml` | PASS | metadata+policy+review protection+merge buttons |
| `bad-yaml-syntax.yaml` | FAIL | unparseable YAML |
| `bad-vote-mode.yaml` | FAIL | `vote_mode` enum |
| `bad-vote-exclusive.yaml` | FAIL | `vote_mode` ✕ `manual_vote` |
| `bad-merge-buttons.yaml` | FAIL | no merge button enabled |
| `warn-protected-contexts.yaml` | WARN | default-branch lockout |
| `bad-discussions.yaml` | FAIL | discussions without notif target |
| `warn-staging-no-whoami.yaml` | WARN | staging without `whoami` |
| `bad-collaborators-11.yaml` | FAIL | collaborators > 10 |
| `warn-deprecated.yaml` | WARN | deprecated `protected_tags` |
| `bad-doap-link.yaml` | FAIL | doap not https / wrong domain |
| `warn-unknown-key.yaml` | WARN | unknown top-level key (typo) |
| `good-meta.yaml` | PASS | `meta` environment select |
| `bad-meta-type.yaml` | FAIL | `meta` must be a mapping |
| `good-rulesets-default.yaml` | PASS | default-branch protection via convenience ruleset |

The same engine and fixtures are also verifiable headlessly with `node` (the
build/verify scripts live outside this folder); the in-page self-test is the
authoritative record for the owner. Current status: **16 / 16 passing.**

### How the Build tab was tested

The builder's data layer (`buildYaml` / `importYaml`) and its model-edit helpers
(`setPath` / `delPath`, now part of the tested logic block) are fixtures-first
too, in `fixtures/builder/` (see `fixtures/builder/EXPECTED.md`). The **Run
fixtures (self-test)** button runs three suites:

- **Emit fixtures** — a model object → emit → must validate to the expected
  verdict *and* re-import deep-equal (no loss in dump/parse). 6 fixtures.
- **Round-trip / no-data-loss** — a file → import → emit → import again must be
  **deep-equal** with zero keys dropped, and the validator verdict must be
  unchanged. 5 dedicated stress files (raw rulesets payload, environments,
  custom_subjects, unknown keys, kitchen-sink) **plus all parseable validator
  fixtures reused**, so the builder is proven lossless on the very files the
  validator is tested against.
- **Edit fixtures** (`edit-fixtures.json`) — replay a sequence of form edits
  through the same `setPath`/`delPath` the UI uses and assert the resulting model
  deep-equals expected. These guard the bug where editing a value **nested under
  an array** (a ruleset's `branches.includes`/`excludes`, a status-check entry)
  used to convert the containing array into an index-keyed object. 2 fixtures.

The remaining form-widget wiring is verified by behavior with a headless DOM
(jsdom) harness: import populates the controls, editing a control after import
preserves unknown top-level *and* nested keys, the emitted pane matches
`buildYaml`, **Import from a repo** builds the right raw URL and feeds both tabs
(with a working `file://` fallback), and live validation surfaces the expected
findings. Current status: **emit 6/6, round-trip 20/20, edit 2/2**, validator
**16/16** — all green in one self-test.

## Out of scope

- It **cannot guarantee acceptance** — this is an unofficial re-implementation
  of the public schema, not the server-side code ASF runs to apply your config.
- It does **not** write, commit, or apply the file; it generates text you copy
  or download and commit yourself.
- It does **not** contact GitHub, Gitbox, ATR, or any network resource on its
  own. The sole opt-in exception is the **Import from a repo** button you click,
  which does a read-only `GET` of a public `.asf.yaml`; it still never writes,
  commits, or applies anything.
- It **cannot confirm** that CI check names, branches, users, teams, or app IDs
  actually exist; it only spell-checks `contexts` against a list you paste.
- It does not validate deep GitHub Rulesets/Environment payload semantics beyond
  the convenience/raw mutual-exclusivity and the conversation-resolution rule;
  raw payloads are preserved but not deeply checked.
- It is **not** a substitute for testing changes on a non-default branch first.

## Files

- `index.html` — the tool (self-contained; open by double-clicking).
- `fixtures/` — the validator's known-good/known-bad inputs and `EXPECTED.md`.
- `fixtures/builder/` — the builder's emit + round-trip fixtures and their
  `EXPECTED.md`.
- `README.md` — this file.
