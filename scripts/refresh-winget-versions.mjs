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

function parseShowDetails(output) {
  const details = {}
  for (const line of output.split(/\r?\n/)) {
    const match = line.match(/^\s*([^:]+):\s*(.+?)\s*$/)
    if (!match) continue
    const key = match[1].trim().toLowerCase().replace(/[^a-z0-9]+([a-z0-9])/g, (_, ch) => ch.toUpperCase())
    details[key] = match[2].trim()
  }
  return {
    publisher: details.publisher ?? null,
    moniker: details.moniker ?? null,
    description: details.description ?? null,
    homepage: details.homepage ?? null,
    license: details.license ?? null,
    licenseUrl: details.licenseUrl ?? null,
    privacyUrl: details.privacyUrl ?? null,
    author: details.author ?? null,
    tags: details.tags ? details.tags.split(/\s*,\s*/).filter(Boolean) : [],
    installerType: details.installerType ?? null,
    installerUrl: details.installerUrl ?? details.downloadUrl ?? null,
    installerSha256: details.installerSha256 ?? null,
    releaseDate: details.releaseDate ?? null,
    releaseNotes: details.releaseNotes ?? null,
    releaseNotesUrl: details.releaseNotesUrl ?? null
  }
}

function parseVersions(output) {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !/^(found|version|[-\s]+$)/i.test(line))
    .filter((line) => /^[vV]?\d+(?:[.\-+_][A-Za-z0-9]+)*$/.test(line))
}

async function getPackageDetails(packageId) {
  const result = await run('winget', [
    'show',
    '--id',
    packageId,
    '--exact',
    '--source',
    'winget',
    '--accept-source-agreements'
  ])
  if (!result.ok) return { details: null, error: result.output || `winget exited with ${result.code}` }
  return { details: parseShowDetails(result.output), error: null }
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
    const versionResult = wingetCheck.ok ? await getVersions(packageId) : { versions: [], error: 'winget unavailable' }
    const detailResult = wingetCheck.ok ? await getPackageDetails(packageId) : { details: null, error: 'winget unavailable' }
    if ((versionResult.error || detailResult.error) && wingetCheck.ok) {
      status = status === 'ok' ? 'partial' : status
      if (versionResult.error) errors.push(`${packageId} versions: ${versionResult.error}`)
      if (detailResult.error) errors.push(`${packageId} details: ${detailResult.error}`)
    }
    const versions = versionResult.versions.slice(0, 20)
    const details = detailResult.details ?? {}
    const versionCommands = versions.slice(0, 8).map((version) => ({
      id: version,
      label: version,
      version,
      command: baseInstallCommand(packageId, version),
      needsAdmin: tool.needsAdmin,
      source: 'winget'
    }))
    packages.push({
      packageId,
      source: 'winget',
      name: tool.name,
      category: tool.category,
      required: tool.required,
      needsAdmin: tool.needsAdmin,
      notes: tool.notes,
      publisher: details.publisher ?? null,
      homepage: details.homepage ?? null,
      downloadUrl: details.installerUrl ?? null,
      releaseNotesUrl: details.releaseNotesUrl ?? null,
      license: details.license ?? null,
      licenseUrl: details.licenseUrl ?? null,
      installerType: details.installerType ?? null,
      installerSha256: details.installerSha256 ?? null,
      tags: details.tags ?? [],
      description: details.description ?? null,
      latestVersion: versions[0] ?? null,
      availableVersions: versions,
      installCommands: [
        {
          id: 'default',
          label: 'Default',
          version: null,
          command: baseInstallCommand(packageId),
          needsAdmin: tool.needsAdmin,
          source: 'winget'
        },
        ...versionCommands
      ]
    })
  }

  tools.push({
    toolId: tool.id,
    name: tool.name,
    category: tool.category,
    required: tool.required,
    needsAdmin: tool.needsAdmin,
    notes: tool.notes,
    packageId: tool.wingetId,
    packages,
    homepage: packages[0]?.homepage ?? null,
    downloadUrl: packages[0]?.downloadUrl ?? null,
    releaseNotesUrl: packages[0]?.releaseNotesUrl ?? null,
    publisher: packages[0]?.publisher ?? null,
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
  purpose: 'online data for DevEnv Manager one-click install and tool metadata',
  totalConfiguredTools: wingetTools.length,
  totalScannedTools: selectedTools.length,
  tools,
  errors
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true })
fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`)
console.log(`Wrote ${path.relative(repoRoot, outputPath)} with status ${status}.`)
