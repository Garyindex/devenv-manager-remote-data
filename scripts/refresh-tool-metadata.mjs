import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildMetadataDelta } from '../core/delta-builder.mjs'
import { ProviderManager } from '../core/provider-manager.mjs'
import { ChocoProvider } from '../providers/choco-provider.mjs'
import { GitHubProvider } from '../providers/github-provider.mjs'
import { HomebrewProvider } from '../providers/homebrew-provider.mjs'
import { ScoopProvider } from '../providers/scoop-provider.mjs'
import { WingetProvider } from '../providers/winget-provider.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const catalogPath = path.join(repoRoot, 'data/catalog-tools.json')
const outputPath = path.join(repoRoot, 'data/online/install-versions.json')
const deltaPath = path.join(repoRoot, 'data/online/delta.json')

function numberArg(name, fallback) {
  const index = process.argv.indexOf(name)
  if (index === -1) return fallback
  const value = Number(process.argv[index + 1])
  return Number.isFinite(value) ? value : fallback
}

const limit = numberArg('--limit', null)
const maxConcurrency = numberArg('--max-concurrency', 8)
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'))
const previousOutput = fs.existsSync(outputPath)
  ? JSON.parse(fs.readFileSync(outputPath, 'utf8'))
  : null
const providers = [
  new WingetProvider(),
  new ScoopProvider(),
  new ChocoProvider(),
  new HomebrewProvider(),
  new GitHubProvider()
]
const manager = new ProviderManager(providers, { maxConcurrency })
const result = await manager.scan(catalog.tools, { limit })
const managers = Object.fromEntries(providers.map((provider) => {
  const configuredSources = result.jobs.filter((job) => job.provider.id === provider.id).length
  const scannedSources = result.selectedJobs.filter((job) => job.provider.id === provider.id).length
  return [provider.id, { configuredSources, scannedSources }]
}))

const output = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  purpose: 'Online cross-platform developer tool metadata for DevEnv Manager.',
  platform: os.platform(),
  status: result.errors.length > 0 ? 'partial' : 'ok',
  summary: {
    totalCatalogTools: catalog.tools.length,
    totalConfiguredTools: catalog.tools.length,
    totalPackageSources: result.jobs.length,
    totalScannedSources: result.selectedJobs.length,
    maxConcurrency,
    managers
  },
  tools: result.tools,
  errors: result.errors
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true })
fs.writeFileSync(deltaPath, `${JSON.stringify(buildMetadataDelta(previousOutput, output), null, 2)}\n`)
fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`)
console.log(`Wrote ${path.relative(repoRoot, deltaPath)}.`)
console.log(`Wrote ${path.relative(repoRoot, outputPath)} with status ${output.status}.`)
