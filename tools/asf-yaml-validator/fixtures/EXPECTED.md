# Fixture expectations — `asf-yaml-validator`

Each fixture is a `.asf.yaml` input with a single intended outcome. The number
next to it is the **overall verdict** the tool must produce (the worst severity
among its findings). The self-test in `index.html` runs every fixture through
the exact same rule engine the paste box uses and asserts these verdicts.

| Fixture | Overall verdict | Targets rule |
|---|---|---|
| `good-basic.yaml` | **PASS** | nothing should warn/fail (notifications + publish w/ whoami) |
| `good-full.yaml` | **PASS** | metadata+policy+review-based protection+merge buttons, all valid |
| `bad-yaml-syntax.yaml` | **FAIL** | `parse` — unclosed flow sequence |
| `bad-vote-mode.yaml` | **FAIL** | `policy.vote_mode` enum |
| `bad-vote-exclusive.yaml` | **FAIL** | `policy.vote_mode` ✕ `policy.manual_vote` mutual exclusion |
| `bad-merge-buttons.yaml` | **FAIL** | `enabled_merge_buttons` — none true |
| `warn-protected-contexts.yaml` | **WARN** | default-branch `required_status_checks.contexts` lockout |
| `bad-discussions.yaml` | **FAIL** | `features.discussions` without `notifications.discussions` |
| `warn-staging-no-whoami.yaml` | **WARN** | `staging` without `whoami` |
| `bad-collaborators-11.yaml` | **FAIL** | `collaborators` > 10 |
| `warn-deprecated.yaml` | **WARN** | deprecated `protected_tags` |
| `bad-doap-link.yaml` | **FAIL** | `doap` not https / not allowed domain |
| `warn-unknown-key.yaml` | **WARN** | unknown top-level key (`notifcations` typo) |
| `good-meta.yaml` | **PASS** | `meta` is a valid top-level section (environment select) |
| `bad-meta-type.yaml` | **FAIL** | `meta` must be a mapping, not a scalar |
| `good-rulesets-default.yaml` | **PASS** | default-branch protection via convenience ruleset (no raw keys) |

Verdict ordering: **FAIL > WARN > PASS**. A file with any FAIL is FAIL; a file
with at least one WARN and no FAIL is WARN; a file with only PASS/INFO is PASS.
