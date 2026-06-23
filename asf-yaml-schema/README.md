# `.asf.yaml` JSON Schema — a SchemaStore contribution

A draft JSON Schema (draft 2020-12) for Apache's `.asf.yaml` repository-config file. Publishing this to
[SchemaStore](https://www.schemastore.org/) gives **every schema-aware editor (VS Code, JetBrains, etc.)
and CLI linter (lintel, etc.) live structural validation + autocomplete for `.asf.yaml` automatically** —
something none of them do today (SchemaStore has no `.asf.yaml` entry as of this writing).

- **File:** `asf-yaml.schema.json`
- **Source of truth:** the public docs at <https://github.com/apache/infrastructure-asfyaml> (snapshot **2026-06-22**)
- **Scope:** STRUCTURE only — key names, types, allowed values. It deliberately does **not** try to do
  cross-field or policy checks (JSON Schema can't express most of them); those belong to the companion
  **Lint Catcher** tool.

## What the schema catches vs. what Lint Catcher catches

Re-validated 2026-06-22 against Lint Catcher's full fixture suite (19 files) with Ajv (draft 2020-12), the
schema behaved exactly as intended — it caught the structural mistakes and correctly stayed silent on the
semantic ones, with **no false positives on any `good-*` fixture** (including `good-meta`, now that `meta`
is modelled). This is the clean division of labour:

| Fixture | Schema result | Owner |
| --- | --- | --- |
| `bad-vote-mode` (invalid enum) | ❌ caught — `vote_mode` not in [manual,email,trusted] | **Schema** |
| `bad-collaborators-11` (>10) | ❌ caught — `maxItems` | **Schema** |
| `warn-unknown-key` (`notifcations` typo) | ❌ caught — additional property | **Schema** |
| `bad-meta-type` (`meta` is a scalar) | ❌ caught — `meta` must be object | **Schema** |
| `warn-yaml11-bool*` (`yes`/`on` unquoted) | ❌ caught — string where boolean expected (YAML 1.2 parse) | **Schema** (bonus) |
| `bad-yaml-syntax` | caught by the YAML parser before schema | parser |
| `good-basic`, `good-full`, `good-meta`, `good-rulesets-default`, `good-yaml11-quoted` | ✅ valid (no false positives) | — |
| `bad-vote-exclusive` (vote_mode + manual_vote) | silent | **Lint Catcher** |
| `bad-merge-buttons` (all false) | silent | **Lint Catcher** |
| `bad-discussions` (discussions, no notif target) | silent | **Lint Catcher** |
| `bad-doap-link` (non-apache http URL) | silent | **Lint Catcher** |
| `warn-protected-contexts` (lockout footgun) | silent | **Lint Catcher** |
| `warn-staging-no-whoami` | silent | **Lint Catcher** |
| `warn-deprecated` (`protected_tags`) | silent (valid; deprecation noted in description) | **Lint Catcher** |

So the schema makes the structural classes of error "free" everywhere (and, because a schema-aware editor
parses with YAML 1.2, it even flags the `yes`/`on` boolean footgun as a type error); the remaining
semantic/footgun checks are uniquely Lint Catcher's job. The two are complementary, not competing.

## Use it today (before it's in SchemaStore)

Add a modeline to the top of an `.asf.yaml` and most editors will validate live:

```yaml
# yaml-language-server: $schema=https://raw.githubusercontent.com/REPLACE_ME/asf-yaml-schema/main/asf-yaml.schema.json
```

Or with lintel, map it in `lintel.toml`:

```toml
[schemas]
".asf.yaml" = "//asf-yaml.schema.json"
```

## Submitting to SchemaStore

1. Fork `github.com/SchemaStore/schemastore`.
2. Drop the schema in `src/schemas/json/asf-yaml.json`.
3. Add a catalog entry in `src/api/json/catalog.json`:
   ```json
   { "name": ".asf.yaml", "description": "Apache Software Foundation repository configuration",
     "fileMatch": [".asf.yaml"], "url": "https://json.schemastore.org/asf-yaml.json" }
   ```
4. Add a positive + negative test under `src/test/asf-yaml/` (you can reuse the Lint Catcher fixtures).
5. Open the PR. (Optionally also add it to the Lintel catalog at `github.com/lintel-rs/catalog`.)

## Before you submit — honest caveats

- Drafted from **public docs that are themselves a work-in-progress** ("omissions, factually incorrect
  items, and placeholders"). The authoritative interpreter (`asfyaml.py`) is non-public.
- `additionalProperties: false` is intentional (it's what catches typos), but it means a brand-new
  `.asf.yaml` feature would show as an "unknown key" until the schema is updated. Keep the snapshot date
  current.
- Replace the `$id` / `REPLACE_ME` URL placeholders with the real hosting location.
- This is a great thing to have a **real ASF Infra person sanity-check** against the private interpreter
  before it's submitted — they can confirm key names and spot anything the public docs get wrong.
