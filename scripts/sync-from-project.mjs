import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

function argValue(name) {
  const index = process.argv.indexOf(name)
  return index === -1 ? null : process.argv[index + 1] ?? null
}

const sourceRoot = argValue('--source') || process.env.DEVENV_MANAGER_PROJECT_ROOT
if (!sourceRoot) {
  console.error('Missing source project. Pass --source or set DEVENV_MANAGER_PROJECT_ROOT.')
  process.exit(1)
}

const sourceFiles = [
  ['src-tauri/environment-tools.json', 'data/environment-tools.json'],
  ['src-tauri/scan-rules.json', 'data/scan-rules.json']
]

for (const [sourceRelative, targetRelative] of sourceFiles) {
  const sourcePath = path.join(sourceRoot, sourceRelative)
  const targetPath = path.join(repoRoot, targetRelative)
  if (!fs.existsSync(sourcePath)) {
    console.error(`Missing source file: ${sourcePath}`)
    process.exit(1)
  }

  JSON.parse(fs.readFileSync(sourcePath, 'utf8'))
  fs.mkdirSync(path.dirname(targetPath), { recursive: true })
  fs.copyFileSync(sourcePath, targetPath)
  console.log(`Synced ${sourceRelative} -> ${targetRelative}`)
}

