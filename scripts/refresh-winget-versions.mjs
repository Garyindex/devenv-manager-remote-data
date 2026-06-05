import { execFile } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const dataPath = path.join(repoRoot, 'data/environment-tools.json')
const outputPath = path.join(repoRoot, 'data/online/install-versions.json')
const limitArg = process.argv.includes('--limit')
  ? Number(process.argv[process.argv.indexOf('--limit') + 1])
  : null

function run(command, args, timeoutMs = 25_000) {
  return new Promise((resolve) => {
    execFile(command, args, { timeout: timeoutMs, windowsHide: true }, (error, stdout, stderr) => {
      resolve({
        ok: !error,
        code: error?.code ?? 0,
        output: `${stdout ?? ''}${stderr ?? ''}`.trim()
      })
    })
  })
}

function baseInstallCommand(packageId, version = null) {
  const command = [
    'winget',
    'install',
    '--id',
    packageId,
    '--exact',
    '--source',
    'winget',
    '--accept-package-agreements',
    '--accept-source-agreements'
  ]
  if (version) command.splice(6, 0, '--version', version)
  return command
}

function parseVersions(output) {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !/^(found|version|[-\s]+$)/i.test(line))
    .filter((line) => /^[vV]?\d+(?:[.\-+_][A-Za-z0-9]+)*$/.test(line))
}

async function getVersions(packageId) {
  const result = await run('winget', [
    'show',
    '--id',
    packageId,
    '--exact',
    '--source',
    'winget',
    '--versions',
    '--accept-source-agreements'
  ])
  if (!result.ok) return { versions: [], error: result.output || `winget exited with ${result.code}` }
  return { versions: parseVersions(result.output), error: null }
}

const config = JSON.parse(fs.readFileSync(dataPath, 'utf8'))
const wingetTools = config.tools.filter((tool) => tool.wingetId && tool.wingetId.trim().length > 0)
const selectedTools = Number.isInteger(limitArg) && limitArg > 0 ? wingetTools.slice(0, limitArg) : wingetTools
const errors = []
const tools = []

let status = 'ok'
const wingetCheck = os.platform() === 'win32' ? await run('winget', ['--version'], 8_000) : { ok: false, output: 'winget is only available on Windows.' }

if (!wingetCheck.ok) {
  status = 'unavailable'
  errors.push(wingetCheck.output)
}

for (const tool of selectedTools) {
  const packageIds = [
    tool.wingetId,
    ...(tool.versionOptions ?? []).map((option) => option.wingetId)
  ].filter(Boolean)
  const uniquePackageIds = [...new Set(packageIds)]
  const packages = []

  for (const packageId of uniquePackageIds) {
    const result = wingetCheck.ok ? await getVersions(packageId) : { versions: [], error: 'winget unavailable' }
    if (result.error && wingetCheck.ok) {
      status = status === 'ok' ? 'partial' : status
      errors.push(`${packageId}: ${result.error}`)
    }
    const versions = result.versions.slice(0, 20)
    packages.push({
      packageId,
      latestVersion: versions[0] ?? null,
      availableVersions: versions,
      installCommands: [
        {
          id: 'default',
          label: 'Default',
          command: baseInstallCommand(packageId),
          needsAdmin: tool.needsAdmin
        },
        ...versions.slice(0, 8).map((version) => ({
          id: version,
          label: version,
          command: baseInstallCommand(packageId, version),
          needsAdmin: tool.needsAdmin
        }))
      ]
    })
  }

  tools.push({
    toolId: tool.id,
    name: tool.name,
    packageId: tool.wingetId,
    packages,
    latestVersion: packages[0]?.latestVersion ?? null,
    availableVersions: packages[0]?.availableVersions ?? [],
    installCommands: packages[0]?.installCommands ?? []
  })
}

const output = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  source: 'winget',
  platform: os.platform(),
  status,
  totalConfiguredTools: wingetTools.length,
  totalScannedTools: selectedTools.length,
  tools,
  errors
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true })
fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`)
console.log(`Wrote ${path.relative(repoRoot, outputPath)} with status ${status}.`)

