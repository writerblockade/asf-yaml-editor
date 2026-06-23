# Build Spec — Tool #4: `.asf.yaml` GUI Builder (extends the Validator)

**Status:** planned, not yet built. Prepared 2026-06-19.
**Builds on:** `tools/asf-yaml-validator/` (Tool #3). This is an *extension of that
tool*, not a new one.

## What this adds
A GUI for **creating, editing, and validating** an `.asf.yaml` file: form
controls (dropdowns, toggles, list editors) that emit valid YAML, validated live
by the engine Tool #3 already ships. You fill in a form, you get correct
`.asf.yaml` text to copy into your repo — and the same PASS/WARN/FAIL report runs
on it as you type.

## Locked decisions (from sign-off)
1. **Architecture — one file, two tabs.** Add a **Build** tab to the existing
   `tools/asf-yaml-validator/index.html` alongside the current **Validate** tab.
   The builder reuses `ASFYAML.lintAsfYaml` directly; the rule engine stays
   single-source. No second copy of the engine.
2. **Coverage — full schema.** Every documented `.asf.yaml` key is reachable in
   the builder. See the interpretation note below.
3. **Edit — round-trip import.** Paste an existing `.asf.yaml`, parse it into the
   form, edit, re-emit. Keys the form doesn't model are **preserved verbatim**,
   never dropped.

### Interpretation of "full coverage" (confirm at build time — not a silent pivot)
Bespoke widgets for all ~40+ keys *including* deep nesting (raw rulesets
payloads, `environments`, the 18 `custom_subjects` event types) is
disproportionate and brittle against a moving schema. The plan therefore reads
"full coverage" as: **every key is reachable and round-trips losslessly**, with a
tiered UI —
- **Rich controls** (dropdowns/toggles/typed fields) for the common keys projects
  actually edit.
- **Structured generic editors** (repeatable list / key→value map builders) for
  the advanced/nested keys.
- **Advanced raw-YAML escape hatch** as the final catch-all, so nothing is ever
  unrepresentable or silently lost.

If you want literally-every-nested-field-as-a-dropdown instead, say so before the
build starts; it roughly doubles the effort and the maintenance surface.

---

## Constraint fit (why a builder still obeys the charter)
A builder **generates text**. It does not write to a repo, commit, call GitHub,
or touch production. Worst case is identical in kind to Tool #3: *"it produced a
wrong report/file,"* which the user then reviews and validates in the same
window. So it remains **read-only / report-generating**, **no backend**, **one
self-contained offline file**, **no storage**.

New surfaces to keep clean:
- **Copy to clipboard** (`navigator.clipboard.writeText`) is allowed — it copies
  generated text, mutates nothing. Primary output is still an on-screen
  read-only textarea.
- **Download `.asf.yaml`** is optional and user-initiated; if included, it saves
  *generated text the user asked for*, never touches their repo. Acceptable, but
  keep it secondary to copy/paste. Flag it in the README either way.
- Still **no** `localStorage`/`sessionStorage`/`fetch`/network/beacon. The
  forbidden-pattern scan from Tool #3 must still pass on the combined file.

---

## THE BUILD PROMPT (paste this to execute)

> **Task:** Extend `tools/asf-yaml-validator/index.html` with a **Build** tab: a
> GUI that creates/edits/validates `.asf.yaml`. Keep it one self-contained file.
>
> **Before writing logic — re-ground against live policy.** Do NOT trust this
> spec's field list or any model memory. Fetch the current schema from
> `apache/infrastructure-asfyaml` (raw README on `main`) and reconcile the field
> inventory in the appendix against it. Record a fresh **schema snapshot date**.
> If the live schema and this spec disagree, the live schema wins — note the
> delta and proceed; if a disagreement changes scope, STOP and ask.
>
> **Hard constraints (non-negotiable):** read-only / generates text only — never
> mutate a repo, never call the network at runtime; one self-contained `.html`,
> all CSS/JS inline, `js-yaml` stays bundled inline (no CDN); no
> localStorage/sessionStorage/any storage, state in memory; offline by
> double-click. Reuse the existing `ASFYAML.lintAsfYaml` engine — do not fork it.
>
> **Method — fixtures first (how the owner verifies without reading code):**
> 1. Write the builder fixtures BEFORE the builder logic (see Fixtures section):
>    emit fixtures, import/round-trip fixtures, and no-data-loss fixtures. Reuse
>    all 13 existing validator fixtures as import fixtures.
> 2. Implement `buildYaml(model)` and `importYaml(text)` in the **DOM-independent
>    logic block** (so the headless verifier can test them), plus the form UI in
>    the separate DOM block.
> 3. Add the builder fixtures to the existing self-test panel and a headless
>    `verify.js` path. The tool is "correct" only when: all validator fixtures
>    still pass, every emit fixture produces YAML that re-imports to the same
>    model AND validates to its expected verdict, and every import/round-trip
>    fixture survives import→emit→import deep-equal with **zero dropped keys**.
>
> **UX requirements:**
> - Two tabs: **Validate** (existing, unchanged) and **Build** (new).
> - Form grouped by top-level block (`project`, `notifications`, `staging`,
>   `publish`, `pelican`, `jekyll`, `github`, `jenkins`). Enums render as
>   `<select>` dropdowns; booleans as toggles; lists as add/remove row editors;
>   maps as key→value row editors.
> - Live output: a read-only YAML pane + **Copy** button, refreshed on every
>   change, with the **same** PASS/WARN/FAIL report rendered beneath it from the
>   shared engine. The builder should actively surface footguns as the user
>   builds (e.g. default-branch required `contexts`, discussions without a notif
>   target).
> - Deprecated keys carry a deprecation badge and point to the replacement;
>   infra-ticket-only keys (default-branch change, Jira notification schemes) are
>   shown read-only/informational so users don't think editing them here does
>   anything.
> - **Import:** paste box → parse → populate form; any key not modeled by a
>   control lands in the **Advanced raw YAML** area and is merged back verbatim on
>   emit.
>
> **Deliverables (all inside `tools/asf-yaml-validator/`):** the updated
> `index.html`; new builder fixtures under `fixtures/` (e.g. a `builder/`
> subfolder) with their expected outcomes; updated `README.md` documenting the
> Build tab, the new schema snapshot date, how the builder was tested, and
> out-of-scope. Update `fixtures/EXPECTED.md`.
>
> **When done:** report validator fixtures X/X still green, builder fixtures Y/Y
> passing, confirm the no-network/no-storage scan still passes on the combined
> file, and say how to open and try the Build tab. Fix any failure before
> declaring done.

---

## Appendix A — Architecture & build mechanics

**Tabs.** A simple in-page tab switcher (in-memory state, no storage). Default to
Validate so existing behavior is unchanged on open.

**Shared engine.** The builder calls `window.ASFYAML.lintAsfYaml(emittedText,
opts)` and renders the existing report component. The optional inputs from Tool
#3 (default branch, repo name, branch-this-file-lives-in, CI check names) should
be reachable from the Build tab too, since they drive the lockout / committee /
non-default-branch checks.

**Pure logic block (DOM-independent, testable in node).** Extend the existing
`//__LOGIC_START__ … //__LOGIC_END__` IIFE with:
- `buildYaml(model) -> string` — deterministic key ordering; uses the bundled
  `jsyaml.dump`. Order top-level blocks as listed above; within a block, follow
  the schema's documented order.
- `importYaml(text) -> { model, raw, error }` — parse, split into modeled `model`
  vs. unmodeled `raw` (verbatim subtree), so emit can re-merge.
- `BUILDER_FIXTURES` — embedded the same way validator fixtures are.
- `runBuilderFixtures()` — mirrors `runFixtures()`.

**Build pipeline.** The Tool #3 scaffold (a `index.template.html` with
`/*__JSYAML__*/` and `/*__FIXTURES_JSON__*/` markers, a `gen.js` injector, and a
`verify.js` headless runner) lived in scratch, not in the repo. Reconstruct it
from the current `index.html` (the inline js-yaml and the embedded fixtures are
both still in the file) rather than hand-editing an 80 KB file blind. Keep
`gen.js`/`verify.js` in scratch; only `index.html`, `fixtures/`, `README.md` ship.

**Headless verify.** Extend `verify.js` to also extract `buildYaml`/`importYaml`
and run the builder fixtures under node with the same `/tmp/package` js-yaml.

---

## Appendix B — Full field inventory (2026-06-18 snapshot — RECONCILE LIVE)

Re-fetch and reconcile before building; treat this as the starting checklist, not
gospel. Control types: **enum**=dropdown, **bool**=toggle, **text/int**=field,
**list**=add/remove rows, **map**=key→value rows, **group**=nested sub-form,
**raw**=structured/advanced editor.

### `project`
| Key | Control | Validation tie-in / notes |
|---|---|---|
| `metadata.key` | text | required with a project block (`project-key-committee`) |
| `metadata.committee` | text | required; must prefix repo name (`committee-prefix`) |
| `metadata.name` / `description` / `short_description` | text | — |
| `metadata.homepage` / `lifecycle_page` / `download_page` / `bug_database` / `mailing_lists` | text (URL) | — |
| `metadata.repositories` / `standards` / `categories` / `programming_languages` | list | — |
| `metadata.doap` | text (URL) | https + apache.org/raw.githubusercontent.com/apache (`doap-link`); alternative to inline metadata |
| `policy.vote_mode` | enum `manual\|email\|trusted` | `vote-mode-enum`; mutually exclusive with `manual_vote` |
| `policy.manual_vote` | bool | `vote-exclusive` |
| `policy.min_hours` | int | — |
| `policy.license_check_mode` | enum `Both\|Lightweight\|RAT` | `license-check-mode` |
| `policy.preserve_download_files` | bool | — |
| `policy.source_artifact_paths` / `binary_artifact_paths` / `source_excludes_lightweight` / `source_excludes_rat` | list (globs) | — |
| `policy.file_tag_mappings` | map label→globs | — |
| `policy.release_checklist` | text (multiline) | — |
| `policy.*_subject` / `policy.*_template` (start_vote, vote_comment, finish_vote, announce_release) | text (multiline) | — |
| `policy.vote_recipients` / `announce_recipients` | group `to / cc[] / bcc[]` | — |
| `policy.github_repository_name` / `github_repository_branch` | text | — |
| `policy.github_compose_workflow_path` / `github_vote_workflow_path` / `github_finish_workflow_path` | list | — |
| `features.atr_sync` | bool | controls ATR sync |

### `notifications`  *(default-branch only — warn via `notif-nondefault`)*
| Key | Control | Notes |
|---|---|---|
| `commits` / `issues` / `pullrequests` / `jobs` / `discussions` | text (address) | `discussions` target required if `github.features.discussions` (`discussions-notif`) |
| split: `issues_status` / `issues_comment` / `pullrequests_status` / `pullrequests_comment` | text | — |
| `jira_options` | multi-select → space-joined `link label worklog comment` | — |
| `commits_by_path` | map glob→address(es) | — |
| bot schemes `pullrequests_bot_<name>` / `issues_bot_<name>` | map | dynamic key name |

### `staging` / `publish`  *(branch-specific; need `whoami`)*
| Key | Control | Notes |
|---|---|---|
| `staging.profile` | text or `~` | — |
| `staging.whoami` | text | missing ⇒ `staging-whoami` WARN |
| `staging.autostage` | text `$foo/*` | `autostage-format` |
| `publish.whoami` | text | missing ⇒ `publish-whoami` WARN |
| `publish.hostname` | text | cannot be `$project.apache.org` |
| `publish.subdir` | text | — |
| `publish.type` | enum `blog` (or unset) | — |

### `pelican` / `jekyll`
| Key | Control | Notes |
|---|---|---|
| `pelican.whoami` / `target` / `theme` / `outputdir` | text | — |
| `pelican.autobuild` | text `$foo/*` | — |
| `pelican.notify` | text (address) | — |
| `pelican.minimum_page_count` | int | — |
| `jekyll.whoami` / `target` / `outputdir` | text | output branches must be `asf-site`/`asf-staging*` |

### `github`
| Key | Control | Validation tie-in / notes |
|---|---|---|
| `description` / `homepage` | text | default-branch only |
| `labels` | list | ≤ 20 (`labels-max`) |
| `collaborators` | list | ≤ 10 (`collaborators-max`) |
| `autolink_jira` | list (UPPERCASE) | — |
| `dependabot_alerts` / `dependabot_updates` | bool | — |
| `ghp_branch` | enum default-branch \| `gh-pages` | `ghp-branch` |
| `ghp_path` | enum `/docs` \| `/` | `ghp-path` |
| `del_branch_on_merge` | **DEPRECATED** | `deprecated-del-branch` → use `pull_requests` |
| `pull_requests.allow_auto_merge` / `allow_update_branch` / `del_branch_on_merge` | bool | — |
| `features.wiki` / `issues` / `projects` / `discussions` | bool | discussions ⇒ notif target |
| `enabled_merge_buttons.squash` / `merge` / `rebase` | bool | ≥1 true (`merge-buttons-none`) |
| `enabled_merge_buttons.squash_commit_message` | enum (4 values) | `squash-commit-message` |
| `enabled_merge_buttons.merge_commit_message` | enum (3 values) | `merge-commit-message` |
| `protected_branches.<branch>` | group (repeatable per branch) | lockout footgun lives here |
| ↳ `required_signatures` / `required_linear_history` / `required_conversation_resolution` | bool | — |
| ↳ `required_pull_request_reviews.*` (dismiss_stale_reviews, require_last_push_approval, require_code_owner_reviews, required_approving_review_count) | bool/int | — |
| ↳ `required_status_checks.strict` | bool | — |
| ↳ `required_status_checks.contexts` | list | **lockout** WARN + optional CI spell-check |
| ↳ `required_status_checks.checks` | list `{context, app_id}` | lockout WARN |
| `protected_tags` | **DEPRECATED** list | `deprecated-protected-tags` → rulesets `type: tag` |
| `custom_subjects.<event>` | map event→template (18 events + catchall, catchall_discussions) | template vars are fixed set |
| `copilot_code_review.enabled` / `review_drafts` / `review_on_push` | bool | conflicts with a `rulesets` Copilot entry |
| `rulesets[]` convenience | group: name, type, branches{includes[],excludes[]}, bypass_teams[], restrict_deletion, restrict_force_push, required_* , required_status_checks[{name,app_slug}] | `ruleset-conv-resolution`, `ruleset-mixed`, unique `name` |
| `rulesets[]` raw payload | **raw** editor: name, target, enforcement, conditions, rules[], bypass_actors[] | `ruleset-mixed` (no mixing styles) |
| `environments.<name>` | group: required_reviewers[{id,type}], wait_timer, prevent_self_review, deployment_branch_policy{protected_branches, policies[{name,type}]} | `protected_branches` xor `policies` |

### `jenkins`  *(DEPRECATED)*
| Key | Control | Notes |
|---|---|---|
| `github_whitelist` | list | `deprecated-jenkins`; show as non-functional |

**Cross-cutting metadata the builder should encode per key:** `default-branch
only` vs `branch-specific`; `deprecated` (badge + replacement); `infra-ticket
only` (read-only). These drive contextual warnings using the existing
`branchName`/`defaultBranch` opts.

---

## Appendix C — Import / round-trip (no-data-loss is correctness-critical)
- `importYaml(text)` parses once; on parse error, surface it (reuse the existing
  parse-error finding) and do not wipe the form.
- Partition the parsed object: subtrees a control models → `model`; everything
  else (unknown keys, advanced nested payloads the UI didn't claim) → `raw`,
  stored verbatim.
- `buildYaml` merges `model` over `raw` deterministically. **Invariant:** for any
  input file, `importYaml` then `buildYaml` then `importYaml` again yields a
  deep-equal object and drops no top-level or nested key. This is the headline
  test.
- Emit canonical, stable YAML (sorted/ordered consistently) so output diffs are
  meaningful and the round-trip is idempotent.

---

## Appendix D — Fixtures (write FIRST)
Put builder fixtures under `fixtures/builder/`. Three classes:

| Class | Fixture idea | Expected |
|---|---|---|
| Emit | model: notifications + publish.whoami | emits → re-imports equal → validator **PASS** |
| Emit | model: enabled_merge_buttons all false | emits → validator **FAIL** (`merge-buttons-none`) |
| Emit | model: features.discussions true, no notif target | emits → validator **FAIL** (`discussions-notif`) |
| Emit | model: protected_branches.main.contexts set | emits → validator **WARN** (lockout) |
| Emit | model: policy.vote_mode `email` + min_hours 72 | emits → re-imports equal → **PASS** |
| Round-trip | **all 13 existing validator fixtures** | import→emit→import deep-equal, **0 keys dropped**, and validator verdict unchanged from Tool #3 |
| No-data-loss | file with raw rulesets payload | round-trips verbatim (lands in Advanced, survives emit) |
| No-data-loss | file with `environments` + `custom_subjects` + `commits_by_path` | every key survives round-trip |
| No-data-loss | file with an unknown/future key | preserved verbatim; still WARN-unknown in validator |

Self-test panel shows two tables: validator fixtures (must stay green) and
builder fixtures. Headless `verify.js` asserts both. "Correct" = both fully green.

---

## Appendix E — Out of scope (v1)
- Writing/committing the file, opening PRs, or contacting GitHub/Gitbox/ATR.
- Confirming that branches, users, teams, app IDs, or CI checks actually exist
  (still spell-check only, against a pasted list).
- Changing things `.asf.yaml` can't change (default-branch rename, Jira
  notification schemes) — surfaced read-only.
- Deep semantic validation of raw rulesets / environment payloads beyond what the
  Tool #3 engine already checks.

## Appendix F — Caveats / snapshot discipline
- Carry a visible **schema snapshot date + link** to `apache/infrastructure-asfyaml`
  (refresh on every build; the schema is explicitly WIP).
- "Not a guarantee of acceptance / not authoritative": the real interpreter is
  non-public. A built file that validates clean still means "no obvious
  problems," not "accepted."
- Dropdown option sets are hardcoded from the snapshot; when the schema moves,
  the option lists and the rule engine both need a refresh — keep them adjacent
  and easy to edit.

## Appendix G — Open items to confirm at build start
1. The "full coverage" interpretation above (tiered controls + raw fallback) vs.
   bespoke widgets for every nested field.
2. Include the optional **Download .asf.yaml** button, or copy-to-clipboard only?
3. Should the Build tab share Tool #3's optional-inputs row, or keep its own copy?
