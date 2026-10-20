// Regenerate skills/index.json from the skill folders shipped in this package.
// Use after adding, removing, or renaming a skill folder, or after editing a
// SKILL.md frontmatter. Network sync of upstream content is a separate step.
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const skillsRoot = join(root, 'skills')
const manifestPath = join(skillsRoot, 'index.json')
const i18nPath = join(root, 'i18n', 'zh.json')

const BUCKETS = ['engineering', 'productivity']
const NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const KNOWN_KEYS = new Set(['name', 'description', 'disable-model-invocation', 'argument-hint', 'metadata'])

function unquote(raw) {
  const value = raw.trim()
  if (value.startsWith('"') && value.endsWith('"')) return JSON.parse(value)
  if (value.startsWith("'") && value.endsWith("'")) return value.slice(1, -1).replace(/''/g, "'")
  return value
}

function parseFrontmatter(file) {
  const text = readFileSync(file, 'utf8')
  if (!text.startsWith('---\n')) throw new Error(`${file}: missing leading '---'`)
  const end = text.indexOf('\n---\n', 3)
  if (end === -1) throw new Error(`${file}: missing closing '---'`)
  const fields = new Map()
  for (const line of text.slice(4, end).split('\n')) {
    if (line === '' || line.startsWith('#') || line.startsWith(' ')) continue
    const match = /^([A-Za-z0-9_-]+):(.*)$/.exec(line)
    if (match === null) throw new Error(`${file}: unparseable frontmatter line ${JSON.stringify(line)}`)
    if (!KNOWN_KEYS.has(match[1])) throw new Error(`${file}: unexpected frontmatter key '${match[1]}'`)
    fields.set(match[1], unquote(match[2]))
  }
  return fields
}

function collect() {
  const entries = []
  for (const bucket of BUCKETS) {
    const bucketDir = join(skillsRoot, bucket)
    if (!existsSync(bucketDir)) continue
    for (const name of readdirSync(bucketDir).sort()) {
      const skillFile = join(bucketDir, name, 'SKILL.md')
      if (!existsSync(skillFile)) continue
      const fields = parseFrontmatter(skillFile)
      if (!NAME_RE.test(name)) throw new Error(`${skillFile}: folder name is not a valid skill name`)
      if (fields.get('name') !== name) throw new Error(`${skillFile}: name '${fields.get('name')}' differs from folder '${name}'`)
      const description = fields.get('description')
      if (!description) throw new Error(`${skillFile}: missing description`)
      const argumentHint = fields.get('argument-hint')
      entries.push({
        name,
        bucket,
        dir: `${bucket}/${name}`,
        description,
        invocation: { modelInvocable: true, userInvocable: true },
        upstreamModelInvocable: fields.get('disable-model-invocation') !== 'true',
        ...(argumentHint ? { argumentHint } : {}),
      })
    }
  }
  return entries
}

function loadDescriptions() {
  let parsed
  try {
    parsed = JSON.parse(readFileSync(i18nPath, 'utf8'))
  } catch (error) {
    throw new Error(`${i18nPath}: ${error instanceof Error ? error.message : String(error)}`)
  }
  const skills = parsed?.skills
  if (skills === null || typeof skills !== 'object' || Array.isArray(skills)) {
    throw new Error(`${i18nPath}: "skills" must be an object keyed by skill name`)
  }
  return skills
}

function requireDescriptions(entries, descriptions) {
  const names = new Set(entries.map((entry) => entry.name))
  const missing = entries
    .filter((entry) => typeof descriptions[entry.name] !== 'string' || descriptions[entry.name].trim() === '')
    .map((entry) => entry.name)
  const unknown = Object.keys(descriptions).filter((name) => !names.has(name))
  if (missing.length > 0) throw new Error(`${i18nPath}: missing Chinese description for: ${missing.join(', ')}`)
  if (unknown.length > 0) throw new Error(`${i18nPath}: entries for skills that do not ship: ${unknown.join(', ')}`)
  return new Map(entries.map((entry) => [entry.name, descriptions[entry.name].trim()]))
}

const previous = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : undefined
const collected = collect()
if (collected.length === 0) throw new Error('no skills found')

// Keep the established order, append new skills at the end.
const previousOrder = new Map((previous?.skills ?? []).map((entry, index) => [entry.name, index]))
collected.sort((left, right) => {
  const a = previousOrder.get(left.name) ?? Number.MAX_SAFE_INTEGER
  const b = previousOrder.get(right.name) ?? Number.MAX_SAFE_INTEGER
  return a - b || left.name.localeCompare(right.name)
})

const descriptions = requireDescriptions(collected, loadDescriptions())
const skills = collected.map((entry) => ({
  name: entry.name,
  bucket: entry.bucket,
  dir: entry.dir,
  description: entry.description,
  descriptionZh: descriptions.get(entry.name),
  invocation: entry.invocation,
  upstreamModelInvocable: entry.upstreamModelInvocable,
  ...(entry.argumentHint ? { argumentHint: entry.argumentHint } : {}),
}))

const manifest = {
  name: JSON.parse(readFileSync(join(root ?? here, 'package.json'), 'utf8')).name,
  upstream: previous?.upstream ?? {
    repo: 'https://github.com/mattpocock/skills',
    license: 'MIT',
  },
  invocationPolicy: {
    modelInvocable: true,
    userInvocable: true,
    note: 'All shipped skills are both model- and user-invocable; upstream disable-model-invocation is recorded in upstreamModelInvocable.',
  },
  count: skills.length,
  skills,
}

writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
console.log(`wrote ${manifestPath}: ${manifest.count} skills`)
