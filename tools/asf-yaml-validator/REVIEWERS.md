# Trying out the `.asf.yaml` Validator & Builder — a note for reviewers

Thanks for taking a look. This is an **early feedback build**, not an official
release. It's an independent, **unofficial** re-implementation of the checks in
Apache's public `.asf.yaml` schema — it reads and reports only, and never writes
to or touches your repo.

**Schema snapshot:** 2026-06-22 (reconciled against
[apache/infrastructure-asfyaml](https://github.com/apache/infrastructure-asfyaml) `main`).

## Open it

- **Hosted:** <PAGES-URL-HERE> — easiest, and the "Import from a repo" button works.
- **Local:** clone the repo and open `tools/asf-yaml-validator/index.html` in any
  browser. Everything works offline except "Import from a repo" (browsers block the
  fetch from `file://` — it falls back to showing the URL + a `curl` one-liner).

Nothing to install. It's a single self-contained HTML file.

## 30-second trust check

Scroll to **Run fixtures (self-test)** and click it. It runs every built-in
known-good / known-bad example through the same engine the tabs use and shows
all green. If something's red, that's a bug — please tell me.

## What I'd love you to try

- **Validate** a real `.asf.yaml` from one of your repos — paste it, read the
  PASS / WARN / FAIL report. Do the findings match your understanding?
- **Build** one from scratch (Build tab), or **Import** an existing file and edit it.
- Poke the **rulesets** editor — add a branch/tag ruleset, add includes/excludes.
- Trigger the **status-check lockout warning** (a `required_status_checks.contexts`
  on your default branch) — that footgun warning is the feature I most want sanity-checked.
- Try **Import from a repo** (e.g. `apache/<your-repo>` + branch).

## The feedback I'm after

- **Wrong verdicts** — anything it flags that's actually fine, or passes that it shouldn't.
- **Missing/outdated checks** vs. current asfyaml behaviour.
- **Clarity** — is the report readable for a non-expert release manager? Is wording right?
- **Anything confusing or broken** in the UI.

## Please keep in mind

- A clean result means "no obvious problems," **not** "guaranteed valid" — it is
  not the server-side code Infra runs to apply your config.
- The upstream schema is itself a work in progress, so unknown keys are **warnings,
  never failures**, and each finding cites the schema section it came from.
- When in doubt, **test on a non-default branch first.**

## Where to send notes

<FEEDBACK-CHANNEL-HERE> — e.g. open an issue (label `feedback`) or a PR on the repo,
or reply on the thread where this was announced.
