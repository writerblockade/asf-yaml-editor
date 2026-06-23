# Builder fixture expectations

The Build tab is verified three ways, all run by the **Run fixtures (self-test)**
button (and headlessly by `verify.js`):

## Emit fixtures (`emit-fixtures.json`)
A model object → `buildYaml` → must (a) validate to the expected verdict, and
(b) re-import deep-equal to the original model (no loss in dump/parse).

| Fixture | Expected validator verdict |
|---|---|
| `emit-good-basic` | PASS |
| `emit-merge-ok` | PASS |
| `emit-policy-good` | PASS |
| `emit-merge-none` | FAIL |
| `emit-discussions-no-target` | FAIL |
| `emit-lockout` | WARN |

## Round-trip / no-data-loss fixtures (`roundtrip-*.yaml`)
A `.asf.yaml` → `importYaml` → `buildYaml` → `importYaml` again → must be
**deep-equal** to the first parse (zero keys dropped), and the validator verdict
must be unchanged between the original and the rebuilt text.

| Fixture | What it stresses |
|---|---|
| `roundtrip-rulesets-raw.yaml` | raw GitHub Rulesets API payload (the form's raw carve-out) |
| `roundtrip-environments.yaml` | nested `environments` reviewers + deployment policies |
| `roundtrip-custom-subjects.yaml` | `custom_subjects` map + `commits_by_path` list values + bot scheme |
| `roundtrip-unknown-keys.yaml` | unknown top-level key AND unknown sub-key inside `github` |
| `roundtrip-kitchen-sink.yaml` | broad file: ints, bools, nulls, lists, nested maps |

In addition, **all parseable validator fixtures** (every one except
`bad-yaml-syntax.yaml`, which is intentionally unparseable) are reused as
round-trip inputs (`rt-*`), so the builder is proven lossless on the same files
the validator is tested against.

## Edit fixtures (`edit-fixtures.json`)
A starting model → a replayed sequence of form edits (the same `setPath` / `delPath`
helpers the Builder UI uses, now part of the tested logic block) → must deep-equal
the expected model. These guard the class of bug where editing a value **nested
under an array** (e.g. a ruleset's `branches.includes`/`excludes`) silently turned
the containing array into an index-keyed object.

| Fixture | What it guards |
|---|---|
| `edit-ruleset-includes` | adding a convenience ruleset, then branch `includes`/`excludes` — the reported breakage |
| `edit-ruleset-tag-and-checks` | a tag ruleset with a status-check listgroup two array-levels deep, plus a delete that prunes the emptied map |

Current status: **emit 6/6, round-trip 20/20 (5 dedicated + 15 reused), edit 2/2**
— all matching. The validator's own **16/16** remain green in the same self-test.
