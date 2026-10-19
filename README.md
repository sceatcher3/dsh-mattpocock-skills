# dsh-mattpocock-skills-bundle

Matt Pocock's agent skills, packaged for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness).

This bundle ships the 27 skills that upstream [mattpocock/skills](https://github.com/mattpocock/skills) promotes in its own plugin manifest (`skills/engineering` and `skills/productivity`), keeps every skill body and companion resource file intact, and registers them in the Harness skill registry under one provider named `mattpocock-skills`.

## What it registers

- One skill provider: `mattpocock-skills`, source label `mattpocock-skills`, bundled precedence (rank 600).
- 27 skills, each under its upstream name, each with its own folder as the resource base directory.
- Every skill is both model-invocable (the `skill` tool and the session skill catalog) and user-invocable (`/skill-name` in the Web composer).

Because the provider sits at bundled precedence, a project skill (`.dsh/skills/<name>`) or user skill (`~/.dsh/skills/<name>`) with the same name takes priority. That is the supported way to override one skill without forking the package.

## Skills

Upstream marks user-invoked skills with `disable-model-invocation: true`. This port keeps every skill model-invocable, so the marker only records upstream's policy.

### Engineering

| Skill | Upstream |
| --- | --- |
| `ask-matt` | user |
| `diagnosing-bugs` | model |
| `grill-with-docs` | user |
| `triage` | user |
| `improve-codebase-architecture` | user |
| `setup-matt-pocock-skills` | user |
| `tdd` | model |
| `to-spec` | user |
| `to-tickets` | user |
| `wayfinder` | user |
| `implement` | user |
| `implement-spec` | user |
| `prototype` | model |
| `research` | model |
| `domain-modeling` | model |
| `codebase-design` | model |
| `code-review` | model |
| `pr` | model |
| `retro` | user |
| `wizard` | model |

### Productivity

| Skill | Upstream |
| --- | --- |
| `grill-me` | user |
| `grilling` | model |
| `handoff` | user |
| `teach` | user |
| `to-questionnaire` | user |
| `wait-what` | user |
| `writing-for-agents` | model |

Full descriptions live in each `skills/<bucket>/<name>/SKILL.md` frontmatter and in `skills/index.json`.

## Install

With the plugin manager tool, point `install_bundle` at this directory:

```
plugin_manager action=install_bundle target=<absolute path to dsh-mattpocock-skills-bundle>
```

After the first npm publish, it installs with the same command other plugins use:

```
dsh plugin --profile web add dsh-mattpocock-skills-bundle
```

Or use the Web UI: Settings, Plugins, Add, then install from a local directory. The row appears as `dsh-mattpocock-skills`; enable it if the install leaves it off.

The skill catalog is rebuilt on the next agent step, so a bundle that activates cleanly shows its skills in the session's available-skills list and in the `/` menu without a restart.

If the install answers `restart-required` with `module-comparison`, the running process could not compare loaded plugin modules with their files. The bundle is still written to the profile; restart DSH once and the new module loads. That is the expected path when installing this package into an already running profile.

Two details keep the provider visible after a restart:

- `list()` is async on purpose. The registry wraps each `provider.list()` call with an abort-aware helper that calls `.then()` on the result whenever the caller passes an `AbortSignal` (the `skill` tool always does). A synchronous array is silently dropped with `skill provider "mattpocock-skills" skipped`.
- Registration already invalidates the catalog cache, so `apply()` only calls `ctx.skills.registerProvider()`.

Offline verification against the real `@deepseek-ai/dsh-skill` registry passes: 27 skills listed, `tdd` loads its full 3440-character body, with and without an `AbortSignal`.

To remove it:

```
plugin_manager action=remove_bundle target=dsh-mattpocock-skills-bundle
```

### Install without npm

A public repository can be installed from Git, with no registry account at all:

```
dsh plugin --profile web add git+https://github.com/sceatcher3/dsh-mattpocock-skills.git
```

Pin a tag for a reproducible version:

```
dsh plugin --profile web add git+https://github.com/sceatcher3/dsh-mattpocock-skills.git#v0.2.0
```

Or install a release tarball by URL:

```
dsh plugin --profile web add https://github.com/sceatcher3/dsh-mattpocock-skills/releases/download/v0.2.0/dsh-mattpocock-skills-bundle-0.2.0.tgz
```

Both paths need the repository to be reachable: public for everyone, or pnpm credentials configured for a private repository.

### Install from GitHub

The repository is public:

```
plugin_manager action=install_bundle target=git+https://github.com/sceatcher3/dsh-mattpocock-skills.git
```

The plugin manager runs pnpm against the repository, so the Git URL must be reachable from the machine that installs it. Private repositories need credentials configured for pnpm; a public repository is the simplest way for other people to install the bundle.

## Invoking a skill

- Model: `skill({ name: "tdd" })`.
- User: type `/tdd` (or any skill name) in the composer.
- Both routes return the same instructions, wrapped with a resource base directory. Relative references inside a skill (`tests.md`, `scripts/hitl-loop.template.sh`) resolve against that directory.

## Layout

```
dsh-mattpocock-skills-bundle/
  index.js                 provider registration
  cordis.patch.yml         bundle patch (one insert row)
  package.json             dsh.bundle.patch, exports, icon
  icon.svg                 package artwork
  locale/en.json, zh.json  display title and description
  skills/index.json        generated skill manifest (27 entries)
  skills/engineering/...   upstream skill folders, verbatim
  skills/productivity/...  upstream skill folders, verbatim
  tools/                   manifest generator and upstream re-sync script
```

## Invocation policy

Upstream ships 16 of the 27 skills as user-invoked only, meaning the model cannot pick them. This port deliberately widens the policy: the model may choose any of them, and the user can still call every one by name. Each entry in `skills/index.json` records the original flag as `upstreamModelInvocable`.

To restore upstream behaviour, set `invocation.modelInvocable` to `false` for those entries in `skills/index.json` and restart the harness. Note that `tools/build-manifest.mjs` always writes the permissive policy, so re-running it resets a manual edit.

## Upstream content: kept and dropped

Kept:

- Every `SKILL.md` exactly as published, including the `pr` skill's nested `metadata.credits` and `CREDITS.md`.
- All companion resources referenced by skill bodies: formats, templates, scripts, and pattern documents.

Dropped:

- The `in-progress` (7 skills) and `misc` (4 skills) buckets. Upstream does not promote them in its own plugin manifest; its README calls `in-progress` beta material.
- Each skill's `agents/openai.yaml`. That file carries Codex and Claude Code display and invocation metadata; the Harness registry receives the same information from this package's manifest.
- Upstream `docs/`, marketplace manifests, and install instructions for other agents.

Where a skill mentions Claude Code conventions (`CLAUDE.md`, `.claude/`, sub-agents), the text is preserved as published. Several skills already read or write `AGENTS.md`, and `setup-matt-pocock-skills` explicitly accepts either file.

## Updating from upstream

```sh
git clone https://github.com/mattpocock/skills /tmp/mattpocock-skills
UPSTREAM_COMMIT=$(git -C /tmp/mattpocock-skills rev-parse HEAD) \
  node tools/sync-from-checkout.mjs /tmp/mattpocock-skills
```

The script reads the promoted skill list from the upstream `.claude-plugin/plugin.json`, copies those skill folders (minus `agents/`), and regenerates `skills/index.json`. To regenerate only the manifest from the folders already present, run `node tools/build-manifest.mjs` or `npm run manifest`.

Review the diff, confirm that `skills/index.json` lists the expected skills, then reinstall or restart the bundle.

## License and attribution

MIT. The skill instructions are Copyright (c) 2026 Matt Pocock, redistributed from [mattpocock/skills](https://github.com/mattpocock/skills) under the MIT License. The packaging code and icon are original contributions under the same license. See [LICENSE](LICENSE) and [NOTICE.md](NOTICE.md).
