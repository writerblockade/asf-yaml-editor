# Build Spec — `.asf.yaml` Validator / Linter (Tool #3)

> Extracted verbatim from the original shared `Build-Specs-Tools-1-2-3.md` (prepared
> 2026-06-18, grounded in live policy fetched the same day: current `.asf.yaml` schema
> from `apache/infrastructure-asfyaml`). Tools #1 (CRA calculator) and #2 (SECURITY-policy
> checker) live in the original multi-tool project and are out of scope here. The companion
> builder lives in [`spec-builder-tool-4.md`](spec-builder-tool-4.md).

**Charter this follows:** read-only / report-only · no backend, no always-on service
(a static browser file or local script) · run by the people who need it, not hosted by
Infra · fixtures written first · clear pass/warn/fail output · one self-contained file
where possible. It is a **convenience pre-flight checker, not an authority** — it does not
replace the non-public production `.asf.yaml` interpreter, and it carries a visible
"snapshot date + source link" plus a "not legal advice / not a guarantee of acceptance" line.

---

## Purpose & the gap
The production `.asf.yaml` interpreter (`asfyaml.py`) is **non-public**, and the official docs explicitly warn that a typo in `protected_branches` required-check `contexts` "**will prevent you from modifying the `.asf.yaml` file itself**." There is no public offline validator. A pre-commit checker that catches schema errors and that specific lockout footgun is squarely on this project's mission and is uncontested.

## Form factor & constraint fit
Single self-contained **HTML file** — paste `.asf.yaml`, get a report. Client-side YAML parse (bundle `js-yaml` inline) + schema rules, **no network**. Optional tiny CLI variant. ✔ read-only ✔ no backend ✔ run by the project themselves before they commit.

## Inputs
The `.asf.yaml` text; optional: the branch name it lives in (to evaluate default-branch-only rules) and the repository name (to check the `committee`-prefix rule) and the project's real CI check names (to spell-check `contexts`).

## Checks (from the current live schema)
**A. Structure / schema**
- File parses as YAML (else FAIL with line/col).
- Known top-level keys: `project`, `notifications`, `staging`, `publish`, `pelican`, `jekyll`, `github`, `jenkins`(deprecated). **Unknown top-level key ⇒ WARN** (catches the classic `notifcations:` typo).
- Value types: `notifications.*` = address string (or list where allowed); `github.protected_branches` = dict or `~`; `github.collaborators` = list; etc.
- Enums valid: `policy.vote_mode ∈ {manual,email,trusted}`; `policy.license_check_mode ∈ {Both,Lightweight,RAT}`; `enabled_merge_buttons.squash_commit_message`/`merge_commit_message` in their allowed sets; `ghp_branch ∈ {default branch, gh-pages}`; `ghp_path ∈ {/docs, /}`.
- Mutual exclusivity: `policy.vote_mode` vs `policy.manual_vote`; convenience vs raw-payload syntax within one `rulesets` entry.
- Constraints: `collaborators` ≤ 10; `labels` ≤ 20; `enabled_merge_buttons` — at least one of squash/merge/rebase `true`.
- `project.metadata`: `key` and `committee` required when a `project` block is present; if repo name supplied, `committee` must prefix it.
- `staging.autostage` pattern must be `$foo/*` form.
- `project.metadata.doap` link must be `https` and under `apache.org` or `raw.githubusercontent.com/apache` (no redirects).

**B. Footgun / high-risk warnings (the real value)**
- **Lockout risk:** if `protected_branches.<defaultBranch>.required_status_checks.contexts`/`checks` is set ⇒ **prominent WARN** quoting the official caution; if real CI check names were supplied, spell-check each `context` against them and flag mismatches.
- `enabled_merge_buttons` all false ⇒ FAIL.
- `features.discussions: true` without a `notifications.discussions` target ⇒ FAIL (docs require it).
- `staging`/`publish` without `whoami` ⇒ WARN (won't run).
- `notifications` set in a non-default branch ⇒ WARN (only applies on default branch).
- Rulesets convenience entry with `required_conversation_resolution` but no `required_pull_request_reviews` ⇒ FAIL.
- Deprecated keys ⇒ WARN: top-level `github.del_branch_on_merge` (moved under `pull_requests`), `protected_tags`/tag protection, `jenkins.github_whitelist`.

## Output
Pass/warn/fail per rule with line numbers where the parser provides them, plus a summary banner. Readable by a non-expert, e.g. `FAIL · github.enabled_merge_buttons — at least one of squash/merge/rebase must be true`.

## Fixture suite (write these FIRST — file ⇒ expected verdict)
| Fixture | Expected |
|---|---|
| `good-basic.yaml` (notifications + publish w/ whoami) | PASS |
| `good-full.yaml` (project metadata+policy + protected_branches + merge buttons) | PASS |
| `bad-yaml-syntax.yaml` (broken indent) | FAIL (parse) |
| `bad-vote-mode.yaml` (`vote_mode: quick`) | FAIL (enum) |
| `bad-vote-exclusive.yaml` (`vote_mode` + `manual_vote`) | FAIL (mutually exclusive) |
| `bad-merge-buttons.yaml` (squash/merge/rebase all false) | FAIL |
| `warn-protected-contexts.yaml` (default branch w/ `contexts`) | WARN (lockout) |
| `bad-discussions.yaml` (discussions on, no discussions target) | FAIL |
| `warn-staging-no-whoami.yaml` | WARN |
| `bad-collaborators-11.yaml` (11 entries) | FAIL (>10) |
| `warn-deprecated.yaml` (`protected_tags`) | WARN (deprecated) |
| `bad-doap-link.yaml` (`doap: http://evil.com`) | FAIL (https + domain) |
| `warn-unknown-key.yaml` (`notifcations:` typo) | WARN (unknown top-level key) |

> Note: the shipped tool has since grown the suite (e.g. `good-meta.yaml`, `bad-meta-type.yaml`)
> and the builder's emit + round-trip fixtures. The in-page self-test is the authoritative
> record of current coverage.

## Out of scope
It cannot guarantee acceptance — the authoritative interpreter is non-public; it does not contact GitHub/Gitbox; it cannot confirm CI check names exist (only spell-checks against a user-supplied list); it is not a substitute for testing on a non-default branch first.

## Caveats
The schema source is explicitly "work in progress … omissions, factually incorrect items, and placeholders." So: unknown keys ⇒ WARN (never FAIL), carry a **schema snapshot date + link** to `apache/infrastructure-asfyaml`, and make the rule set easy to refresh.

## README outline
What it checks · the schema snapshot date + source · the lockout-footgun explanation · how each rule was tested (fixtures) · out-of-scope and "not a guarantee of acceptance."

---

## Shared scaffold note (from the original spec)
All the tools shared a tiny pattern worth reusing: a single-file HTML shell that takes
pasted/typed input, runs a list of `{id, severity, test, message, source}` rules, and renders
a grouped PASS/WARN/FAIL report with a summary line — fixtures loaded as a self-test ("run
fixtures" button that asserts each known input yields its expected verdict). That makes each
tool mostly a rules table + a fixtures table.
