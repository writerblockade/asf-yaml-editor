# scripts/

Headless verification for the `.asf.yaml` Validator & Builder. These live
**outside** `tools/asf-yaml-validator/` on purpose — the tool itself stays a
single self-contained `index.html`; this is just a convenience for checking it
from a terminal (or from an agent session) without opening a browser.

## `verify.js`

```sh
node scripts/verify.js
```

Extracts the bundled `js-yaml` and the tested logic block (between the
`//__LOGIC_START__` / `//__LOGIC_END__` markers) straight out of `index.html`,
runs them in a sandbox exactly as the page does, and asserts:

1. every **validator** fixture (`runFixtures`) matches its expected verdict;
2. every **builder** fixture (`runBuilderFixtures` — emit / round-trip / edit) matches;
3. the **embedded** fixtures are byte-identical to the on-disk `fixtures/*.yaml` (no drift);
4. the Builder's enum dropdowns and ruleset raw-key list are the **same constants**
   the engine validates against (single-source check).

The core uses **only Node builtins — no install needed.** It exits non-zero if
anything fails, so it drops straight into CI or a pre-commit hook.

Two optional checks run automatically **if** their dev-deps are present and skip
with a note otherwise:

```sh
npm install            # installs jsdom + ajv (see package.json)
node scripts/verify.js # now also runs the jsdom + ajv checks
```

5. **jsdom** — loads `index.html`, drives the real in-page self-test button, and
   confirms an import preserves unknown nested + top-level keys through the DOM;
6. **ajv** — validates `asf-yaml-schema/asf-yaml.schema.json` against every
   `good-*` fixture (guards the schema against false positives).

The in-page **Run fixtures (self-test)** button remains the authoritative record;
this script just mirrors it for the command line.
