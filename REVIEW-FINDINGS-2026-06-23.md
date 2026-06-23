# Lint Catcher — Comprehensive Review Findings

**Date:** 2026-06-23  ·  **Reviewer pass:** whole-repo (Steps 1–4, dimensions A–J)
**Tool under review:** `tools/asf-yaml-validator/index.html` (`SCHEMA_DATE = 2026-06-22`)
**Upstream re-fetched today:** `apache/infrastructure-asfyaml/main/README.md` + `infra.apache.org/asf-yaml.html`

No files were changed. This is a report only. Every claim below is backed by something I ran or read; where I'm inferring (e.g. the non-public server parser), I say so.

---

## 1. Verdict banner

**WARN · 1 FAIL-class (now RESOLVED, see F1) · 7 WARN · 7 INFO · self-test green (validator 19/19 · builder emit 6/6 · round-trip 20/20 · edit 2/2).**

> **Update 2026-06-23 (post-review):** **F1 is implemented** — the engine now emits a `yaml11-bool` advisory WARN on unquoted `yes/no/on/off`, shipped with three fixtures (`warn-yaml11-bool`, `warn-yaml11-bool-discussions`, `good-yaml11-quoted`); validator suite is now 19/19. See F1 for the as-built note.
>
> **Cleanup also landed (verified):**
> - **W1/W2/P3 (single-source):** the ruleset raw/convenience key lists and the enum value arrays (`VOTE_MODES`, `LICENSE_MODES`, `SQUASH_MSG`, `MERGE_MSG`, `GHP_PATHS`) are now defined once in the logic block and referenced by both the engine and the form (the SCHEMA dropdowns are built from the same constants; `renderRulesets` reads `A.RULESET_RAW_KEYS`). The W1 divergence was resolved by aligning the form to the engine's 4-key list (no `enforcement`) — a pure refactor with **zero validation-behavior change** (still 19/19 · 28/28). Headless assertions confirm every dropdown equals its engine constant. *(If you'd instead prefer `enforcement` treated as a raw key so a convenience entry that sets it is flagged "mixed," that's a deliberate validation change with its own fixture — not done here.)*
> - **W4/W5 (companion schema):** added a `meta` definition (so the schema no longer rejects the engine-valid `good-meta`), bumped the snapshot to 2026-06-22. Re-validated with Ajv (draft 2020-12) against all 19 fixtures: every `good-*` is VALID, structural errors caught, semantic ones silent. The `$id` is left as `REPLACE_ME` by design (fill at hosting time).
> - **W3b / lead 4 (docs):** README now states top-level unknowns appear in Advanced while nested unknowns ride along unsurfaced, and that comments are dropped on re-emit. Schema README count refreshed to 19.
> - **W6 (contrast):** the green "Add +" CTA is now `#1a7f37` / hover `#1a7a35` (white text 5.08:1 / 5.41:1, clear AA). On re-examination the "INFO text 4.09:1" item was a **false flag** — `--info` is only a left-border color, never body text, so there was nothing to fix there.
>
> **Second cleanup round (verified, validator 23/23 · builder 32/32):**
> - **W3/P2 (nested sub-key typos):** added a WARN-only sub-key check that walks the parsed doc against the Builder's own `SCHEMA` descriptor (single source — no new key list). Catches `github.feature`→`features`, `notifications.commit`→`commits`, mistyped `custom_subjects` events, etc. Exempts the genuinely-open spots (raw `rulesets`, free-form maps like `commits_by_path`, and `pullrequests_bot_*` schemes) so it doesn't false-alarm — pinned by `good-notifications-bot`. Bonus: this also closes the *other* half of W3 — an unmodeled **nested** key (previously preserved-but-invisible) is now surfaced as a WARN instead of silently hidden. Trade-off, stated plainly: a genuinely-valid *future* nested key the schema doesn't model yet will draw a WARN ("probably a typo"); that's the moving-schema tax, and it's WARN-only so it can never block.
> - **I5 (pelican.autobuild):** now validated against the same `$foo/*` glob form as `staging.autostage` (was unchecked). WARN-only.
> - **#3 (committed verify script):** `scripts/verify.js` reproduces the whole self-test from the command line — validator + builder fixtures, embedded↔on-disk drift, and the single-source assertions — using **only Node builtins** (no install). Optional jsdom + ajv checks run if those dev-deps are present and skip cleanly otherwise. Exits non-zero on any failure, so it drops into CI/pre-commit.
> - Fixtures added: `warn-nested-subkey`, `good-notifications-bot`, `warn-pelican-autobuild`, `good-pelican` (+ matching round-trip entries). Suite: **23 validator / 32 builder**.

The tool is fundamentally sound: the engine is faithfully reused by the Builder, the round-trip is genuinely lossless (verified through a real form edit, not just the data layer), every hard constraint holds (no storage, one opt-in GET, fully inlined, no eval), and the enums/limits/deprecations/DOAP rules all reconcile cleanly against today's upstream README. The one finding that rises to "wrong report" is a **YAML 1.1-vs-1.2 parser-semantics mismatch** that can flip a verdict in both directions. Everything else is drift, single-source hygiene, or polish.

---

## 2. How I verified

**Live policy (Step 1).** Fetched `https://raw.githubusercontent.com/apache/infrastructure-asfyaml/main/README.md` (full 57 KB, read in its entirety) and `https://infra.apache.org/asf-yaml.html`. Reconciled section-by-section against the engine's `KNOWN_TOP`, `VOTE_MODES`, `LICENSE_MODES`, `SQUASH_MSG`, `MERGE_MSG`, the `collaborators ≤ 10` / `labels ≤ 20` limits, the three deprecations, the DOAP allow-list, the committee-prefix rule, autostage form, the discussions/notification rule, and ruleset convenience-vs-raw exclusivity. Result: **the 2026-06-22 snapshot is accurate as of today** — no enum, limit, or deprecation has moved. (Couldn't fetch `docs/ASFYamlFeature.md`, which covers the top-level `meta` key — `raw.githubusercontent.com` timed out on that path — so `meta` is reconciled only indirectly.)

**Engine + builder, headless (Step 2).** Extracted the bundled js-yaml blob (line 393) and the logic block (`//__LOGIC_START__`…`//__LOGIC_END__`, lines 398–1266) and ran them under Node 22 in a `vm` sandbox with a fake `window` so the **genuinely-bundled parser** attaches as `window.jsyaml` (no npm js-yaml substituted). Called `runFixtures()` → **16/16**, `runBuilderFixtures()` → **28/28** (emit 6/6, round-trip 20/20, edit 2/2). Matches the documented baseline.

**DOM wiring with jsdom (Step 2).** Loaded the actual `index.html` in jsdom, clicked **Build**, imported a YAML containing a modeled field, an **unknown nested key** (`github.future_thing`), and an **unknown top-level key** (`zzz_custom`); confirmed: controls populated, editing `github.description` preserved **both** unknown keys, the output pane re-imports/re-emits deep-equal, live validation rendered, the Advanced "unrecognized keys" box surfaced the top-level unknown (but not the nested one), and the in-page self-test reported `Validator 16/16 · Builder 28/28`.

**Stress battery (Step 3A).** Ran ~50 hand-crafted inputs through the engine (empty/null/scalar/list roots, YAML bool traps, deep typos, duplicate keys, tabs, anchors, DOAP variants, committee/autostage/branch edge cases). Inputs and outputs are quoted in the findings.

**Fixture drift (Step 3H / lead 6).** Diffed all 16 embedded validator fixtures against `fixtures/*.yaml` → **byte-identical (0 drift)**. The 5 dedicated builder round-trip files → identical. Emit/edit JSON: semantic content (`model`, `expectVerdict`, `note`, `id`) deep-equal; the embedded copies merely add a `kind` discriminator and explicit `opts:{}` the per-typed disk JSON leaves implicit — **benign, not drift.**

**Security / a11y / constraints (Step 3 D/E/F).** Traced every `innerHTML` sink; computed WCAG contrast ratios for the real CSS color pairs; unit-tested `rawUrlFromSpec`; grepped for storage/network/CDN/eval.

---

## 3. Findings

Severity rubric: **FAIL** = wrong report / data loss / constraint or security breach · **WARN** = drift from live policy, missing fixture, a11y gap, fragile/duplicated code · **INFO** = polish, docs, nits.

### FAIL

#### F1 — js-yaml (YAML 1.2) disagrees with the server's Python parser (YAML 1.1) on `yes/no/on/off/y/n`, flipping verdicts both ways  — ✅ RESOLVED 2026-06-23
> **As built:** implemented as an **advisory, quote-aware WARN** (not auto-coercion). A raw-text scan (`lintYaml11Bools`, in the logic block) flags every *unquoted* `yes/no/on/off` (case set `yes|Yes|YES|no|No|NO|on|On|ON|off|Off|OFF`; bare `y/n` excluded since the common Python loaders don't booleanize them) with a WARN explaining the YAML 1.1-vs-1.2 split and how to fix it. It deliberately does **not** rewrite the user's value — coercing would mean silently assuming the non-public server's parser, which conflicts with the tool's "reads and reports" charter. Consequence: `squash: yes` still shows the `merge-buttons-none` FAIL **plus** the explanatory WARN; if you'd rather the tool treat 1.1-true tokens as `true` at the two boolean checks (flipping that to a clean WARN), that's a small follow-up — say the word. Verified: `dependabot_alerts: yes` → WARN; `discussions: on` (no target) → WARN (previously a silent PASS); `description: "yes"` (quoted) → PASS (no false alarm).

- **Location:** engine parse path `lintAsfYaml` → `YAML.load` (line 438); shows up in `merge-buttons-none` (line 524) and `discussions-notif` (line 569).
- **Evidence (ran it):** The bundled js-yaml uses the YAML 1.2 core schema, where `yes/no/on/off/y/n` are **strings**, not booleans:
  - `github:\n  enabled_merge_buttons:\n    squash: yes` → tool verdict **FAIL** (`merge-buttons-none`, "at least one of squash/merge/rebase must be true"). Same for `squash: on`. `squash: true` correctly passes.
  - `github:\n  features:\n    discussions: yes` (no notification target) → tool verdict **PASS** — it silently **misses** the discussions-without-target footgun, because `discussions === true` is false for the string `"yes"`.
- **Impact:** The README confirms the interpreter is `asfyaml.py` (Python; "the whole logic is defined in the `asfyaml.py` file"). Standard Python YAML loaders (PyYAML/ruamel defaults) follow **YAML 1.1**, where `yes/on` resolve to `True`. So a project that writes `squash: yes` gets a **false FAIL** from a config the server accepts (the charter's explicit worst case — "it produced a wrong report"), and a project that writes `discussions: yes` gets a **false PASS** that hides a real misconfiguration.
- **Caveat (stated honestly):** `asfyaml.py` is non-public, so I can't confirm the exact loader/version. The divergence is near-certain for any stock Python YAML parser; if Infra has customized the resolver this could differ. Either way, the tool currently parses these tokens differently from how almost any Python YAML parser would.
- **Suggested fix (described, not applied):** Don't swap parsers. Add an engine lint that, after a successful parse, walks the source for scalar values that are bare `yes|no|on|off|y|n|Yes|No|On|Off|...` in boolean-position keys and emits a **WARN**: "This parses as a string here but the server's YAML reader will likely treat it as a boolean — quote it or write `true`/`false`." Cite "asfyaml schema · YAML 1.1 vs 1.2." Ship with fixtures (`squash: yes` → WARN not FAIL; `discussions: yes` → WARN). See Proposal P1.
- **Citation:** charter Hard-constraint 1 ("worst-case must be a wrong report, never worse" — and a wrong report is still the thing to avoid); upstream README "the whole logic is defined in the `asfyaml.py` file."

### WARN

#### W1 — Ruleset convenience/raw key lists are duplicated **and divergent** between engine and form (lead #1, dimension B)
- **Location:** engine `rawKeys = ["target","conditions","rules","bypass_actors"]` (line 582) vs DOM `RAWKEYS = ["target","conditions","rules","bypass_actors","enforcement"]` (line 1690, `renderRulesets`).
- **Evidence (ran it):** A ruleset whose only raw marker is `enforcement` (`- name: r1\n  enforcement: active`) is judged **convenience/clean** by the engine (PASS) but renders as a **raw payload** textarea in the Builder. Upstream confirms `enforcement` is raw-syntax ("`enforcement` is hardcoded to `active`" in convenience), so the form's list is actually the more-correct one — but the two disagree, and both hard-code rule knowledge that the charter says must live in exactly one place.
- **Impact:** Low functional risk today (real raw payloads always carry `target`+`conditions`+`rules`, so `hasRaw` is true regardless), but it's a genuine single-source violation: a convenience entry that also sets `enforcement` is "mixed" to the form yet "convenience" to the engine, and the next schema refresh has two lists to keep in sync.
- **Fix:** export one canonical `RULESET_RAW_KEYS` / `RULESET_CONV_KEYS` from the logic block and have `renderRulesets` reference it; decide whether `enforcement` belongs in the engine's raw set (recommended: yes). See P3.
- **Citation:** charter "Single-source the engine"; upstream README · Rulesets ("each entry must use exactly one style").

#### W2 — Enum value lists are duplicated between the engine constants and the Builder `SCHEMA` descriptor (dimension B/G)
- **Location:** `VOTE_MODES` (416), `LICENSE_MODES` (417), `SQUASH_MSG` (418), `MERGE_MSG` (419), and the `ghp_path` `/docs`/`/` check (560) each have a **second copy** in the form descriptor: `vote_mode` options (655), `license_check_mode` (658), `squash_commit_message`/`merge_commit_message` (717–718), `ghp_path` (712). The engine constants are **not** exported on `window.ASFYAML`, so the form can't reference them.
- **Impact:** They agree with upstream today, but a future enum change must be edited in two places or the dropdown and the validator silently diverge. Pure maintainability/refresh footgun.
- **Fix:** export the enum arrays from the logic block; build the dropdown `options` from them. See P3.
- **Citation:** charter "Single-source the engine"; "keep the next schema refresh from being harder than it should be."

#### W3 — Nested sub-key typos are silently ignored; the "unknown keys ride along in Advanced" claim is top-level only (dimension A + C + seeded proposal)
- **Location:** unknown-key check is top-level only (`KNOWN_TOP` loop, lines 451–455); the Advanced/extra box only collects keys not in `SCHEMA_TOP` (renderAdvancedExtra, line 1950).
- **Evidence (ran it):** `notifications:\n  commit: x@a.apache.org` (should be `commits`) → **PASS, no warning**. `github:\n  feature:\n    discussions: true` (should be `features`) → **PASS**. In jsdom, an unknown nested key (`github.future_thing`) **survives** import/edit/emit verbatim (good — no data loss) but appears in **no control and not in the Advanced box** — it is invisible to the user.
- **Impact:** The classic typo class the tool exists to catch (`notifcations:`) is caught at the top level but not one level down, where it's just as silent and damaging. Separately, the README ("keys the form doesn't model ride along in the Advanced section") overstates coverage: nested unknowns ride along **invisibly**, not in Advanced.
- **Fix:** (a) a conservative, WARN-only known-sub-key check for the common blocks (P2); (b) tighten the README wording to "unmodeled **top-level** keys appear in Advanced; unmodeled nested keys are preserved verbatim but not shown."
- **Citation:** upstream README · top-level keys / Notification settings / Repository features; charter "nothing is silently dropped" (upheld) vs README's Advanced-section claim (overstated).

#### W4 — Companion JSON Schema rejects the engine-valid `meta` block (dimension J)
- **Location:** `asf-yaml-schema/asf-yaml.schema.json` root `properties` (lines 8–17) lists 8 keys and sets `"additionalProperties": false` (line 7) — **no `meta`**. The engine treats `meta` as a known top-level key (`KNOWN_TOP`, line 415) and ships a passing `good-meta` fixture.
- **Evidence (read it):** With `additionalProperties:false` at the root and no `meta` property, a schema-aware editor would flag `good-meta.yaml` (which starts with `meta:`) as an unknown-property **error** — the opposite of the engine's PASS. The schema README's claim "`good-basic`, `good-full` → valid (no false positives)" predates the `good-meta`/`good-rulesets-default` fixtures and was last run against "13 files" (it's 16 now).
- **Impact:** The two halves of the project disagree on a real key; anyone using both gets contradictory signals.
- **Fix:** add a `meta` definition to the schema (or document why it's excluded), and re-run the schema against all 16 fixtures. See P4.
- **Citation:** companion schema lines 7–17; engine line 415; `fixtures/good-meta.yaml`.

#### W5 — Companion schema snapshot lags the tool, and its `$id` is still a placeholder (dimension J)
- **Location:** schema `description` says "snapshot **2026-06-19**" (line 5) and README repeats it (line 9); the tool/README snapshot is **2026-06-22**. The `$id` (line 3) and the use-it-today modeline (schema README line 42) still read `REPLACE_ME`.
- **Impact:** Content is unchanged between those dates (the tool's README notes the rulesets schema was unchanged), so this is low-risk, but the dates should track and a `REPLACE_ME` `$id` can't be published to SchemaStore as-is.
- **Fix:** bump the snapshot string; fill the real hosting URL before submission.
- **Citation:** dimension J; schema README "Keep the snapshot date current / Replace the `$id` placeholders."

#### W6 — Two minor color-contrast misses (dimension F)
- **Evidence (computed WCAG ratios against the actual CSS pairs):** the status **badges and summary banners are excellent** — light tints on dark fills, all **6.2–12.5:1** (well past AA). Two spots fall short of AA-normal (4.5:1): the green **"Add +" CTA** uses `#fff` on `--pass #2ea043` = **3.37:1** (passes AA-large only; it's a short bold-ish label so borderline), and **INFO-finding text** `#6e7681` on `--bg` = **4.09:1** (Advanced-mode only, lowest-priority text).
- **Fix:** darken the CTA green or use dark text on it; nudge the INFO text one step lighter (e.g. toward `--muted #9aa7b4`, which is 7.65:1).
- **Citation:** WCAG 2.1 SC 1.4.3 (contrast minimum). Note: this is the opposite of a systemic problem — the report palette itself is well above AA.

#### W7 — Upstream's `copilot_code_review` ⇄ `rulesets` overlap rule is not implemented (dimension A, drift)
- **Location:** engine has no check for it; the form models `copilot_code_review` (SCHEMA line 731) and `rulesets` independently.
- **Evidence (read upstream):** README · Copilot code review: "Validation fails if both `copilot_code_review` and `rulesets` overlap, either by managing a ruleset named `Copilot Code Review` or by defining a `copilot_code_review` rule type in `rulesets`." The tool would PASS such a file.
- **Impact:** Niche, but it's a documented server-side **FAIL** the tool misses. No fixture exists for it.
- **Fix:** optional new check (FAIL when a ruleset is named `Copilot Code Review` while `github.copilot_code_review` is present), with good/bad fixtures. Lower priority than P1–P3.
- **Citation:** upstream README · Copilot code review.

### INFO

- **I1 — Silent `catch{}` in the raw-YAML boxes.** `renderRulesets` raw textarea (line 1708) and the Advanced/extra textarea (line 1962) swallow parse errors and keep the prior model value. Data-safe and intended, but the per-ruleset raw box gives **no feedback** on a typo (the Advanced box at least discloses "on a parse error the previous value is kept", line 1957). Consider a small inline "unparseable YAML" hint on the raw-ruleset box. (Dimension G.)
- **I2 — `esc()` in an attribute context.** Line 1809 interpolates `esc(block.deprecated)` into a `title="..."` attribute; `esc()` escapes only `& < >`, not quotes. Currently fed **only controlled SCHEMA constants** (no quotes), so it is **not exploitable** — but it's the one spot where the text-node-safe `esc()` lands in an attribute. Keep that interpolation limited to controlled data, or add `"`/`'` escaping. (Dimension E.)
- **I3 — `vote_mode` + `manual_vote: false` still FAILs.** `vote-exclusive` (line 481) fires on key **presence**, so `vote_mode: email` with an explicit `manual_vote: false` reports FAIL even though the user has explicitly opted out of manual voting. Upstream says only "mutually exclusive" without defining presence-vs-value; couldn't confirm against the non-public server. Possibly over-strict; low impact.
- **I4 — committee-prefix is a `startsWith`, not segment-aware (lead #2).** `String(opts.repoName).indexOf(md.committee) !== 0` (line 467). Upstream's wording is "the committee must match the **start** of your repository name," which is exactly `startsWith` — so the tool is **faithful to the documented rule**. The boundary weakness (committee `co` "prefixes" repo `commons-foo`) is shared with upstream's own loose wording. A segment-aware check (`repo === committee || repo.startsWith(committee + "-")`) would be stricter but risks diverging from the non-public `asfyaml.py`. **Resolved: not a bug**; treat any tightening as owner's call. (Verified: `co`/`commons-foo` → PASS; `tooling`/`tooling-x` → PASS; `xtooling`/`tooling` → FAIL.)
- **I5 — `autostage` regex is correct; `pelican.autobuild` is unchecked (lead #3 resolved).** `^[^\/\s]+\/\*$` (line 499) matches upstream's "`$foo/*`, e.g. `site/*` or `feature/*`" — `$foo` is a placeholder, no literal `$` required, and `site/*`/`feature/*` pass while `site/sub/*` is rejected (upstream shows only single-segment). **Not a bug.** Minor gap: `pelican.autobuild` uses the same `$foo/*` form upstream but the engine doesn't validate it, and `publish.hostname`'s "cannot be your own `$project.apache.org`" rule isn't checked (can't, without the project name).
- **I6 — Stricter-than-server on duplicate keys and tabs.** Duplicate top-level keys and tab indentation → FAIL (parse) via js-yaml, whereas PyYAML would accept duplicates (last wins). Both are genuine bugs, so FAIL is defensible, but it's another js-yaml-vs-Python divergence worth a mental note alongside F1.
- **I7 — Stale counts in the schema README.** It says the suite is "13 files" / "13 fixtures" (lines 16, 24-ish); the validator suite is now 16. Refresh when convenient.

---

## 4. Feature & setting proposals (each gated against the hard constraints)

**P1 — YAML 1.1/1.2 boolean-ambiguity lint (HIGHEST VALUE).**
*Problem:* F1 — the tool's parser disagrees with the server's on `yes/no/on/off/y/n`, producing both false FAILs and false PASSes.
*Sketch:* after a clean parse, scan the raw text for scalar values matching `^(y|n|yes|no|on|off|true|false)$` (case-insensitive, the 1.1 token set) where js-yaml resolved them to a **string** but the key is boolean-position; emit WARN "parses as a string here; the server's YAML reader likely treats it as a boolean — quote it or use `true`/`false`."
*Constraint check:* pure engine logic, no network/storage/file/second-file. ✅
*ASF-already-covers?:* No — this is a pre-commit parser-semantics gap; no ASF/ATR tool lints it. ✅
*Test plan:* fixtures `warn-yaml11-bool-squash` (`squash: yes` → WARN, **not** FAIL) and `warn-yaml11-bool-discussions` (`discussions: yes` with no target → WARN); confirm `squash: true` still PASS.

**P2 — Conservative nested sub-key typo detection (the seed, endorsed with guardrails).**
*Problem:* W3 — one-level-down typos (`notifications.commit`, `github.feature`) pass silently.
*Sketch:* a curated, **WARN-only** known-sub-key map for the stable blocks (`notifications.*`, `github.*`, `github.features.*`, `enabled_merge_buttons.*`, `project.metadata.*`, `project.policy.*`); unknown sub-keys there → WARN "unknown sub-key … (the schema moves, but this is most often a typo)," never FAIL, each citing its block.
*Constraint check:* engine-only, WARN-only (respects "schema is a moving target"). ✅
*ASF-already-covers?:* No. ✅
*Honest caveat:* curate the allow-lists per block and keep them WARN-only so a future upstream addition can't hard-fail; the `notifications` block in particular allows free-form `_bot_*`/`_status`/`_comment` variants (upstream), so scope the check to blocks with closed sub-key sets and **exclude** notifications' pattern keys.
*Test plan:* `warn-nested-typo-notifications` (`commit:` → WARN), `good-notifications-bot-scheme` (`pullrequests_bot_dependabot:` → no false WARN).

**P3 — Single-source the ruleset key lists and enum lists (fixes W1 + W2).**
*Problem:* rule knowledge (raw/conv keys, enum values) lives in two places.
*Sketch:* export `RULESET_RAW_KEYS`, `RULESET_CONV_KEYS`, and the enum arrays from the logic block; have `renderRulesets` and the SCHEMA dropdowns reference them.
*Constraint check:* no new file, no behavior change for users. ✅
*Test plan:* a headless assertion (node) that the DOM-side lists are identical object references to the engine's; existing fixtures stay green.

**P4 — Companion-schema reconciliation (fixes W4 + W5).** Add a `meta` definition (or document the exclusion), bump the snapshot string to match the tool, fill the `$id`, re-run the schema over all 16 fixtures, and refresh the README's "13 files" table. Constraint-neutral (separate artifact). Test: schema validates all `good-*` fixtures and rejects all `bad-*` structural ones.

**Challenges to the remaining seeds (honest pushback):**
- **Jump-to-line:** only the parse FAIL carries a line/column today; the semantic findings don't track source positions, so this needs every `add()` to carry a node path first. Worth it only if findings start carrying locations — otherwise it's a single-finding feature. **Low priority.**
- **Export report as Markdown/JSON:** genuinely useful for pasting into a PR, and constraint-clean (Copy/Download plumbing already exists). **Endorse**, small; add one snapshot fixture so the format is pinned.
- **Drift/diff view (paste current `.asf.yaml`, show what the Builder would emit):** real value for spotting accidental changes, but it overlaps with simply round-tripping in the Build tab; **medium** — do it after P1–P3.
- **`meta.environment` / `environments` shape check:** small, constraint-clean, fixture-backed (string vs list). **Endorse** as a cheap add.
- **CI-strictness toggle (WARN→FAIL):** **skeptical.** This is a browser tab a human re-opens, not a CI gate; the no-storage rule means it can't persist, and a real pre-commit/CI use-case wants a CLI this tool deliberately isn't. The FAIL/WARN split is already visible. I'd **not** build this — it implies a use-case the tool's constraints don't serve, and risks people treating a non-persistent toggle as a gate.

---

## 5. Specific leads — resolved

1. **Ruleset raw-key list duplicated/divergent (`enforcement`)** → **CONFIRMED** (W1). Engine `rawKeys` (line 582) lacks `enforcement`; DOM `RAWKEYS` (line 1690) has it. An `enforcement`-only entry is "raw" to the form, "convenience"/clean to the engine. Real single-source violation; low functional impact. Upstream confirms `enforcement` is raw-syntax.
2. **`committee`-prefix substring test** → **NOT A BUG / owner's call** (I4). `indexOf(...)!==0` is `startsWith`, which matches upstream's literal wording "must match the **start** of your repository name." The `co`/`commons-foo` boundary weakness is shared with the documented rule; a segment-aware tightening risks diverging from the non-public server.
3. **`staging.autostage` regex vs `$foo/*`** → **NOT A BUG** (I5). `^[^\/\s]+\/\*$` correctly implements "`$foo/*`, e.g. `site/*` or `feature/*`"; `$foo` is a placeholder (no literal `$` needed), `site/*`/`feature/*` pass, multi-segment is rejected as upstream implies. Help text is adequate.
4. **Comment loss on round-trip** → **CONFIRMED & acceptable, but under-disclosed.** js-yaml drops comments on re-emit; the "lossless" claim is about **data**, and that holds (verified deep-equal). The README's round-trip language doesn't explicitly tell an import-then-export user their comments won't survive. Minor doc fix: state "comments are not preserved on re-emit" near the Build/Import section. (Folds into W3's doc tightening.)
5. **`isDefaultBranch` fallback** → **CONFIRMED, low risk** (works as designed). With no declared default branch, `main`/`master`/`trunk` are treated as default (`DEFAULTISH`, line 420). Verified: `notifications` on branch `trunk` with no `defaultBranch` opt → **no** non-default warning (treated as default); lockout on `production` with no opt → WARN but without the "(your default branch)" emphasis. A project whose real default is, say, `develop` could get a mislabeled default-branch-only finding — but the optional **default-branch input resolves it exactly**, and the heuristic is the only sane guess without it. Keep; perhaps nudge users to fill the default-branch field when it matters.
6. **Fixture drift (embedded vs on-disk)** → **NO DRIFT.** 16/16 validator fixtures byte-identical to `fixtures/*.yaml`; 5 dedicated builder round-trip files identical; emit/edit JSON semantically deep-equal (embedded copies add only a `kind` tag and explicit `opts:{}`). The `# EXPECTED:` header is carried verbatim in both, and `stripExpected` removes it only at example-load time.

---

## The single most important thing to fix first

**Implement P1 — the YAML 1.1-vs-1.2 boolean lint — to neutralize F1.** It is the only finding that makes Lint Catcher emit a *wrong report* (a false FAIL on a server-valid `squash: yes`, and a false PASS that hides the discussions-without-target footgun), which is precisely the failure mode the charter ranks worst. It's a contained, WARN-only engine addition that ships with two fixtures, breaks no constraint, and doesn't touch the parser. Everything else here is hygiene, drift, or polish that can follow.
