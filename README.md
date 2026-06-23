# `.asf.yaml` Validator & Builder — project

Self-contained home for the offline Apache **`.asf.yaml`** Validator + Builder
("Lint Catcher") and everything around it. This folder is ready to become its own
project: point a new project at it and use `PROJECT-INSTRUCTIONS.md` as the
custom instructions.

## Run the tool
Open **`tools/asf-yaml-validator/index.html`** in a browser (works from
`file://`, no internet needed — `js-yaml` is bundled inline). Two tabs:
**Validate** (paste a file → PASS/WARN/FAIL report) and **Build** (a form that
creates/edits/round-trips an `.asf.yaml`, validated live by the same engine).

## What's here
- `PROJECT-INSTRUCTIONS.md` — charter/custom instructions for this project.
- `tools/asf-yaml-validator/` — the tool: `index.html`, its `README.md`,
  `fixtures/` (validator + builder), and `brand/` marks.
- `asf-yaml-schema/` — companion JSON Schema (`asf-yaml.schema.json`) + README;
  covers the *structural* half for schema-aware editors (a SchemaStore contribution).
- `docs/` — `spec-validator-tool-3.md`, `spec-builder-tool-4.md`, `ui-guidance.md`.
- `design/` — bespoke-SVG spec and UI sketches.
- `assets/icons/` — feather + tabler icon sets (design resources only; the tool
  is self-contained and loads none of them at runtime).

## Source of truth
The `.asf.yaml` schema/docs at `apache/infrastructure-asfyaml` (a published work
in progress). The tool carries a schema snapshot date and source link, and is
**not a guarantee of acceptance** — when in doubt, test on a non-default branch
first.

> This is a copy spun off from the parent "ASF Infra Tooling" project (which also
> holds two unrelated tools: a CRA reporting calculator and a SECURITY-policy
> checker). Nothing was deleted from the parent in making this copy.

## A personal note

*This part is unrelated to the tool and the Apache Software Foundation.* My sister
Brianna is going through treatment and recovery for cancer. The best way to
support me in this project is to support my sister. If you're able to provide
financial help, go to
[Team Bri: Joining Bri on her Healing Journey](https://www.gofundme.com/f/team-bri-joining-bri-on-her-healing-journey)
on GoFundMe. Obviously this is entirely optional. Thank you for reading!
