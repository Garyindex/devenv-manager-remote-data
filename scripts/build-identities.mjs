import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const catalogPath = path.join(repoRoot, 'data/catalog-tools.json')
const outputPath = path.join(repoRoot, 'data/identities.json')

const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'))
const previous = fs.existsSync(outputPath)
  ? JSON.parse(fs.readFileSync(outputPath, 'utf8'))
  : { identities: [] }
const previousById = new Map((previous.identities ?? []).map((identity) => [identity.stableId, identity]))

function sourceAliases(tool) {
  return Object.fromEntries((tool.sources ?? [])
    .filter((source) => source.packageId)
    .map((source) => [source.manager, [source.packageId]]))
}

function mergeIdentity(tool) {
  const existing = previousById.get(tool.id) ?? {}
  return {
    stableId: tool.id,
    currentId: tool.id,
    currentName: tool.name,
    categoryId: tool.categoryId,
    previousIds: existing.previousIds ?? [],
    previousNames: existing.previousNames ?? [],
    aliases: [...new Set([...(tool.aliases ?? []), ...(existing.aliases ?? [])])],
    packageAliases: {
      ...sourceAliases(tool),
      ...(existing.packageAliases ?? {})
    },
    lifecycle: {
      status: tool.lifecycle?.status ?? existing.lifecycle?.status ?? 'active',
      deprecated: Boolean(tool.lifecycle?.deprecated ?? existing.lifecycle?.deprecated),
      renamedFrom: existing.lifecycle?.renamedFrom ?? null,
      renamedTo: existing.lifecycle?.renamedTo ?? null,
      replacedBy: tool.lifecycle?.replacedBy ?? existing.lifecycle?.replacedBy ?? null
    },
    identityConfidence: existing.identityConfidence ?? 'high'
  }
}

const output = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  purpose: 'Stable tool identity and rename mapping for DevEnv Manager online metadata.',
  identities: catalog.tools.map(mergeIdentity)
}

fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`)
console.log(`Wrote ${path.relative(repoRoot, outputPath)} with ${output.identities.length} identities.`)
