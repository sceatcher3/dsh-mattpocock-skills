# NOTICE

## Upstream skills

The skill instructions in `skills/` are redistributed from:

- Repository: https://github.com/mattpocock/skills
- Commit: 49dd158d1076134a641b33efb035946536778336 (2026-10-09)
- Upstream plugin version: 1.3.1
- License: MIT
- Copyright: Copyright (c) 2026 Matt Pocock

The upstream MIT license text is reproduced in `LICENSE`.

`skills/engineering/pr/CREDITS.md` credits the `show-me` pattern to Dex Horthy (Humanlayer). That file is preserved unchanged.

## Changes made by this package

- Copied the 27 skill folders listed in the upstream `.claude-plugin/plugin.json` (`skills/engineering` and `skills/productivity`).
- Excluded the `in-progress` and `misc` buckets, which upstream does not ship in its plugin, and each skill's `agents/` folder, which holds other agents' display metadata.
- Moved skill metadata into `skills/index.json` at build time. The `SKILL.md` files themselves are unmodified, including their YAML frontmatter.
- Set every skill to be both model-invocable and user-invocable in the Harness registry. Upstream's original `disable-model-invocation` flag is recorded per entry as `upstreamModelInvocable`.
- Added the Harness packaging: `index.js`, `cordis.patch.yml`, `package.json` exports, locale display metadata, icon, and build tools. These are original contributions.

No skill instruction text was edited.
