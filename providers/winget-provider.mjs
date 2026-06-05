import { execFile } from 'node:child_process'
import os from 'node:os'
import { normalizeVersionList } from '../core/version-normalizer.mjs'

function run(command, args, timeoutMs = 25_000) {
  return new Promise((resolve) => {
    execFile(command, args, { timeout: timeoutMs, windowsHide: true }, (error, stdout, stderr) => {
      resolve({
        ok: !error,
        code: error?.code ?? 0,
        output: cleanOutput(`${stdout ?? ''}${stderr ?? ''}`)
      })
    })
  })
}

function cleanOutput(output) {
  return output
    .replace(/\x1b\[[0-9;?]*[A-Za-z]/g, '')
    .split(/\r?\n/)
    .map((line) => line.replace(/^[\s\\|/\-]+$/, '').trimEnd())
    .filter((line) => line.trim().length > 0)
    .join('\n')
    .trim()
}

function parseKeyValueDetails(output) {
  const details = {}
  for (const line of output.split(/\r?\n/)) {
    const match = line.match(/^\s*([^:]+):\s*(.+?)\s*$/)
    if (!match) continue
    const key = match[1].trim().toLowerCase().replace(/[^a-z0-9]+([a-z0-9])/g, (_, ch) => ch.toUpperCase())
    details[key] = match[2].trim()
  }
  return details
}

function parseVersions(output) {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !/^(found|version|[-\s]+$)/i.test(line))
    .filter((line) => /^[vV]?\d+(?:[.\-+_][A-Za-z0-9]+)*$/.test(line))
}

function installCommand(packageId) {
  return [
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
}

function upgradeCommand(packageId) {
  return [
    'winget',
    'upgrade',
    '--id',
    packageId,
    '--exact',
    '--source',
    'winget',
    '--accept-package-agreements',
    '--accept-source-agreements'
  ]
}

function uninstallCommand(packageId) {
  return ['winget', 'uninstall', '--id', packageId, '--exact', '--source', 'winget']
}

function command(action, command, tool) {
  const template = action === 'install'
    ? [...command.slice(0, 6), '--version', '{{version}}', ...command.slice(6)]
    : command
  return {
    action,
    manager: 'winget',
    platform: 'windows',
    requiresAdmin: Boolean(tool.requirements?.requiresAdmin),
    supportsVersion: action === 'install',
    shell: 'argv',
    command,
    template
  }
}

export class WingetProvider {
  id = 'winget'

  supports(_tool, source) {
    return source?.manager === 'winget' && Boolean(source.packageId)
  }

  async getPackageDetails(tool, source) {
    if (os.platform() !== 'win32') throw new Error('winget is only available on Windows runners')
    const result = await run('winget', [
      'show',
      '--id',
      source.packageId,
      '--exact',
      '--source',
      'winget',
      '--disable-interactivity',
      '--accept-source-agreements'
    ])
    if (!result.ok) throw new Error(result.output || `winget exited with ${result.code}`)
    const details = parseKeyValueDetails(result.output)
    return {
      name: tool.name,
      publisher: details.publisher ?? null,
      author: details.author ?? null,
      description: details.description ?? null,
      homepage: details.homepage ?? source.links?.homepage ?? tool.links?.homepage ?? null,
      downloadUrl: details.installerUrl ?? details.downloadUrl ?? source.links?.download ?? tool.links?.download ?? null,
      releaseNotesUrl: details.releaseNotesUrl ?? source.links?.releases ?? tool.links?.releases ?? null,
      license: details.license ?? null,
      licenseUrl: details.licenseUrl ?? null,
      tags: details.tags ? details.tags.split(/\s*,\s*/).filter(Boolean) : [],
      installerType: details.installerType ?? null,
      installerUrl: details.installerUrl ?? null,
      installerSha256: details.installerSha256 ?? null
    }
  }

  async getVersions(_tool, source) {
    if (os.platform() !== 'win32') throw new Error('winget is only available on Windows runners')
    const result = await run('winget', [
      'show',
      '--id',
      source.packageId,
      '--exact',
      '--source',
      'winget',
      '--versions',
      '--disable-interactivity',
      '--accept-source-agreements'
    ])
    if (!result.ok) throw new Error(result.output || `winget exited with ${result.code}`)
    return normalizeVersionList(parseVersions(result.output).slice(0, 30))
  }

  buildCommands(tool, source) {
    return [
      command('install', installCommand(source.packageId), tool),
      command('update', upgradeCommand(source.packageId), tool),
      command('uninstall', uninstallCommand(source.packageId), tool)
    ]
  }

  buildDownloads(tool, source, details, versions) {
    const latestVersion = versions[0]?.version ?? null
    const url = details.installerUrl ?? details.downloadUrl ?? source.links?.download ?? tool.links?.download ?? details.homepage ?? tool.links?.homepage ?? null
    return [
      {
        id: 'default',
        version: latestVersion,
        platform: 'windows',
        architecture: null,
        type: details.installerType ?? 'package-manager',
        url,
        urlType: details.installerUrl ? 'direct-installer' : url ? 'download-page' : 'package-manager',
        direct: Boolean(details.installerUrl),
        sha256: details.installerSha256 ?? null,
        sizeBytes: null
      }
    ]
  }
}
