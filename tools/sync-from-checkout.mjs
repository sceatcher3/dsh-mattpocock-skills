// Re-sync this package from a checkout of https://github.com/mattpocock/skills.
// Copies the promoted skills (the upstream .claude-plugin/plugin.json list) and
// regenerates skills/index.json. The upstream commit is read from UPSTREAM_COMMIT
// when set; otherwise the packaging commit is recorded.
// Usage: node tools/sync-from-checkout.mjs <upstream-checkout> [package-root]
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const upstreamRoot = process.argv[2]
const pkgRoot = process.argv[3] ?? join(here, '..')
if (upstreamRoot === undefined) {
  console.error('usage: node tools/sync-from-checkout.mjs <upstream-checkout> [package-root]')
  process.exit(2)
}

const SKIP_DIRS = new Set(['agents', '.git', 'node_modules'])
const NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const KNOWN_KEYS = new Set(['name', 'description', 'disable-model-invocation', 'argument-hint', 'metadata'])
const LINK_RE = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g

function fail(message) {
  console.error(`error: ${message}`)
  process.exitCode = 1
  throw new Error(message)
}

function unquote(raw) {
  const value = raw.trim()
  if (value.startsWith('"') && value.endsWith('"')) return JSON.parse(value)
  if (value.startsWith("'") && value.endsWith("'")) return value.slice(1, -1).replace(/''/g, "'")
  return value
}

function parseFrontmatter(file) {
  const text = readFileSync(file, 'utf8')
  if (!text.startsWith('---\n')) fail(`${file}: missing leading '---' frontmatter delimiter`)
  const end = text.indexOf('\n---\n', 3)
  if (end === -1) fail(`${file}: missing closing '---' frontmatter delimiter`)
  const block = text.slice(4, end)
  const body = text.slice(end + 5)
  const fields = new Map()
  for (const line of block.split('\n')) {
    if (!line || line.startsWith('#')) continue
    const match = /^([A-Za-z0-9_-]+):(.*)$/.exec(line)
    if (!match) {
      if (line.startsWith(' ')) continue // nested value (metadata.credits etc.)
      fail(`${file}: unparseable frontmatter line ${JSON.stringify(line)}`)
    }
    const key = match[1]
    const value = match[2].trim()
    if (!KNOWN_KEYS.has(key)) fail(`${file}: unexpected frontmatter key '${key}'`)
    if (value === '') { fields.set(key, ''); continue }
    fields.set(key, unquote(value))
  }
  return { fields, body }
}

function listFiles(dir, base = dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.name === '.DS_Store') continue
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue
      listFiles(full, base, out)
    } else if (entry.isFile()) {
      out.push(relative(base, full))
    }
  }
  return out
}

function checkLinks(skillFile, skillDir, entriesInPlugin) {
  const { body } = parseFrontmatter(skillFile)
  const problems = []
  for (const match of body.matchAll(LINK_RE)) {
    const target = match[1]
    if (/^(?:[a-z][a-z0-9+.-]*:|#|\/)/i.test(target)) continue
    if (target === 'link') continue // markdown template placeholder, not a real link
    const pathPart = decodeURI(target.split('#')[0])
    if (!pathPart) continue
    const resolved = join(skillDir, pathPart)
    if (!existsSync(resolved)) problems.push(`broken relative link ${target}`)
    else if (pathPart.endsWith('SKILL.md')) problems.push(`link to a SKILL.md (${target}): plugin skills are separate entries`)
  }
  // Non-fatal note: links that escape the skill dir would not ship.
  return problems
}

const pluginJson = JSON.parse(readFileSync(join(upstreamRoot, '.claude-plugin', 'plugin.json'), 'utf8'))
const repoPkg = JSON.parse(readFileSync(join(upstreamRoot, 'package.json'), 'utf8'))
const skillRels = pluginJson.skills.map((s) => s.replace(/^\.\//, '').replace(/\/$/, ''))
const entries = []
const warnings = []

for (const rel of skillRels) {
  const skillDir = join(upstreamRoot, rel)
  const skillFile = join(skillDir, 'SKILL.md')
  if (!existsSync(skillFile)) fail(`missing SKILL.md for plugin skill ${rel}`)
  const { fields } = parseFrontmatter(skillFile)
  const name = fields.get('name')
  const description = fields.get('description')
  if (!name || !NAME_RE.test(name)) fail(`${skillFile}: invalid skill name ${JSON.stringify(name)}`)

  if (!description) fail(`${skillFile}: missing description`)
  const disable = fields.get('disable-model-invocation') === 'true'
  const argumentHint = fields.get('argument-hint')
  const parts = rel.split('/')
  if (parts[0] !== 'skills' || parts.length !== 3) fail(`${rel}: expected skills/<bucket>/<name>`)
  const bucket = parts[1]
  if (name !== parts[2]) fail(`${skillFile}: name '${name}' does not match folder '${parts[2]}'`)
  if (bucket !== 'engineering' && bucket !== 'productivity') fail(`${rel}: unexpected bucket '${bucket}'`)
  entries.push({ name, bucket, dir: bucket + "/" + name, description, disableModelInvocation: disable, argumentHint: argumentHint || undefined })
  warnings.push(...checkLinks(skillFile, skillDir, skillRels).map((p) => `${rel}: ${p}`))
}

// Copy skill trees (dropping agents/ metadata and other non-shipped folders).
rmSync(join(pkgRoot, 'skills'), { recursive: true, force: true })
mkdirSync(join(pkgRoot, 'skills'), { recursive: true })
let fileCount = 0
let bytes = 0
for (const entry of entries) {
  const from = join(upstreamRoot, "skills", entry.dir)
  const to = join(pkgRoot, 'skills', entry.dir)
  mkdirSync(to, { recursive: true })
  for (const file of listFiles(from)) {
    const source = join(from, file)
    const target = join(to, file)
    mkdirSync(dirname(target), { recursive: true })
    cpSync(source, target)
    fileCount += 1
    bytes += statSync(target).size
  }
}

const manifest = {
  name: 'dsh-mattpocock-skills',
  upstream: {
    repo: 'https://github.com/mattpocock/skills',
    version: pluginJson.version,
    license: 'MIT',
    syncedFromCommit: process.env.UPSTREAM_COMMIT ?? '49dd158d1076134a641b33efb035946536778336',
    syncedAt: new Date().toISOString().slice(0, 10),
  },
  invocationPolicy: {
    modelInvocable: true,
    userInvocable: true,
    note: 'All shipped skills are both model- and user-invocable; upstream disable-model-invocation is recorded in upstreamModelInvocable.',
  },
  count: entries.length,
  skills: entries.map((entry) => ({
    name: entry.name,
    bucket: entry.bucket,
    dir: entry.dir,
    description: entry.description,
    invocation: { modelInvocable: true, userInvocable: true },
    upstreamModelInvocable: !entry.disableModelInvocation,
    ...(entry.argumentHint ? { argumentHint: entry.argumentHint } : {}),
  })),
}

writeFileSync(join(pkgRoot, 'skills', 'index.json'), `${JSON.stringify(manifest, null, 2)}\n`)

console.log(`upstream: ${upstreamRoot} (plugin version ${pluginJson.version}, package ${repoPkg.version})`)
console.log(`skills:   ${entries.length} (${entries.filter((e) => e.bucket === 'engineering').length} engineering, ${entries.filter((e) => e.bucket === 'productivity').length} productivity)`)
console.log(`files:    ${fileCount} copied, ${(bytes / 1024).toFixed(1)} KiB of skill material`)
console.log(`model-invocable upstream: ${entries.filter((e) => !e.disableModelInvocation).map((e) => e.name).join(', ')}`)
console.log(`upstream user-only: ${entries.filter((e) => e.disableModelInvocation).map((e) => e.name).join(', ')}`)
if (warnings.length) {
  console.log(`\n${warnings.length} link warning(s):`)
  for (const warning of warnings) console.log(`  - ${warning}`)
}
