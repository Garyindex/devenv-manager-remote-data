import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const outputPath = path.join(repoRoot, 'data/online/source-policy.json')

const policy = JSON.parse(fs.readFileSync(outputPath, 'utf8'))
policy.generatedAt = new Date().toISOString()

fs.writeFileSync(outputPath, `${JSON.stringify(policy, null, 2)}\n`)
console.log(`Wrote ${path.relative(repoRoot, outputPath)}`)
