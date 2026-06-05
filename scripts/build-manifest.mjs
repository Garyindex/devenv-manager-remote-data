import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

const datasets = [
  { id: 'environmentTools', path: 'data/environment-tools.json', schema: 'schemas/environment-tools.schema.json' },
  { id: 'catalogTools', path: 'data/catalog-tools.json', schema: 'schemas/catalog-tools.schema.json' },
  { id: 'scanRules', path: 'data/scan-rules.json', schema: 'schemas/scan-rules.schema.json' },
  { id: 'toolRequests', path: 'data/tool-requests.json', schema: null },
  { id: 'installVersions', path: 'data/online/install-versions.json', schema: 'schemas/install-versions.schema.json' }
]

function fileHash(relativePath) {
  const fullPath = path.join(repoRoot, relativePath)
  if (!fs.existsSync(fullPath)) return null
  const content = fs.readFileSync(fullPath)
  return {
    bytes: content.length,
    sha256: crypto.createHash('sha256').update(content).digest('hex')
  }
}

const manifest = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  repository: 'devenv-manager-remote-data',
  datasets: datasets
    .map((dataset) => {
      const hash = fileHash(dataset.path)
      if (!hash) return null
      return { ...dataset, ...hash }
    })
    .filter(Boolean)
}

const outputPath = path.join(repoRoot, 'data/online/manifest.json')
fs.mkdirSync(path.dirname(outputPath), { recursive: true })
fs.writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`)
console.log(`Wrote ${path.relative(repoRoot, outputPath)}`)
