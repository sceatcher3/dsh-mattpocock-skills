/**
 * dsh-mattpocock-skills: Matt Pocock's agent skills for DeepSeek Harness.
 *
 * Registers the bundled skills as one skill provider ("mattpocock-skills") at
 * bundled precedence (rank 600), so a project or user skill with the same name
 * still wins. Bodies are read lazily from skills/index.json on demand.
 */
import { existsSync, readFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const skillsRoot = join(here, 'skills')
const manifestPath = join(skillsRoot, 'index.json')

const PROVIDER_NAME = 'mattpocock-skills'
const SOURCE = 'mattpocock-skills'
const BUNDLED_RANK = 600
const SKILL_NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function loadManifest() {
  let manifest
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  } catch (error) {
    throw new Error(`dsh-mattpocock-skills: cannot read ${manifestPath}: ${error instanceof Error ? error.message : String(error)}`)
  }
  const skills = manifest.skills
  if (!Array.isArray(skills) || skills.length === 0) {
    throw new Error(`dsh-mattpocock-skills: ${manifestPath} lists no skills`)
  }
  const problems = []
  for (const entry of skills) {
    if (typeof entry.name !== 'string' || !SKILL_NAME_RE.test(entry.name)) problems.push(`invalid name ${JSON.stringify(entry.name)}`)
    if (typeof entry.description !== 'string' || entry.description.trim() === '') problems.push(`${entry.name}: missing description`)
    if (typeof entry.dir !== 'string' || entry.dir.split('/').length !== 2) problems.push(`${entry.name}: invalid dir ${JSON.stringify(entry.dir)}`)
    else if (!existsSync(join(skillsRoot, entry.dir, 'SKILL.md'))) problems.push(`${entry.name}: missing ${entry.dir}/SKILL.md`)
  }
  if (problems.length > 0) {
    throw new Error(`dsh-mattpocock-skills: invalid skill manifest:\n  - ${problems.join('\n  - ')}`)
  }
  return manifest
}

const manifest = loadManifest()
const entriesByName = new Map(manifest.skills.map((entry) => [entry.name, entry]))
const bodies = new Map()

function stripFrontmatter(text) {
  if (!text.startsWith('---\n')) return text
  const end = text.indexOf('\n---\n', 3)
  return end === -1 ? text : text.slice(end + 5)
}

function candidateFor(entry) {
  const dir = join(skillsRoot, entry.dir)
  return {
    name: entry.name,
    description: entry.description,
    invocation: entry.invocation ?? { modelInvocable: true, userInvocable: true },
    source: SOURCE,
    provider: PROVIDER_NAME,
    rank: BUNDLED_RANK,
    locator: entry.dir,
    path: join(dir, 'SKILL.md'),
    resourceBase: { kind: 'directory', path: dir },
  }
}

const candidates = manifest.skills.map(candidateFor)

const provider = {
  name: PROVIDER_NAME,
  // Async on purpose: the registry wraps list() with waitWithAbort(promise, signal),
  // which calls .then() on the returned value. A plain array rejects that wrapper and
  // the provider is silently skipped whenever the caller passes an AbortSignal.
  async list() {
    return candidates
  },
  async get(candidate) {
    const entry = entriesByName.get(candidate.name)
    if (entry === undefined) return undefined
    let content = bodies.get(entry.dir)
    if (content === undefined) {
      const file = join(skillsRoot, entry.dir, 'SKILL.md')
      content = stripFrontmatter(await readFile(file, 'utf8'))
      bodies.set(entry.dir, content)
    }
    const dir = join(skillsRoot, entry.dir)
    return {
      name: entry.name,
      description: entry.description,
      ...(entry.whenToUse === undefined ? {} : { whenToUse: entry.whenToUse }),
      invocation: entry.invocation ?? { modelInvocable: true, userInvocable: true },
      source: SOURCE,
      provider: PROVIDER_NAME,
      path: join(dir, 'SKILL.md'),
      resourceBase: { kind: 'directory', path: dir },
      content,
    }
  },
}

/** Cordis plugin name. */
export const name = 'mattpocock-skills'
/** The skill registry service this provider feeds. */
export const inject = ['skills']

/**
 * Register the bundled skill provider. The factory is called once per registry
 * layer; the registry disposes it with this plugin's fiber.
 */
export function apply(ctx) {
  ctx.skills.registerProvider(() => provider)
  ctx.logger.info(`[dsh-mattpocock-skills] registered ${candidates.length} skills (upstream ${manifest.upstream?.version ?? 'unknown'})`)
}
