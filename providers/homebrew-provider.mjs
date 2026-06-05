import { fetchJson } from '../core/http-client.mjs'
import { normalizeVersionList } from '../core/version-normalizer.mjs'

function apiUrl(kind, packageId) {
  return `https://formulae.brew.sh/api/${kind}/${encodeURIComponent(packageId)}.json`
}

function command(action, packageId, tool) {
  const verb = action === 'update' ? 'upgrade' : action
  const argv = ['brew', verb, packageId]
  return {
    action,
    manager: 'homebrew',
    platform: 'macos',
    requiresAdmin: Boolean(tool.requirements?.requiresAdmin),
    supportsVersion: false,
    shell: 'argv',
    command: argv,
    template: argv
  }
}

export class HomebrewProvider {
  id = 'homebrew'
  cache = new Map()

  supports(_tool, source) {
    return source?.manager === 'homebrew' && Boolean(source.packageId)
  }

  async fetchPackage(source) {
    const preferredKinds = source.metadata?.kind
      ? [source.metadata.kind]
      : ['formula', 'cask']
    const errors = []
    for (const kind of preferredKinds) {
      const key = `${kind}:${source.packageId}`
      try {
        if (!this.cache.has(key)) {
          this.cache.set(key, fetchJson(apiUrl(kind, source.packageId)))
        }
        const data = await this.cache.get(key)
        this.cache.set(key, data)
        return { kind, data }
      } catch (error) {
        errors.push(`${kind}: ${error.message ?? String(error)}`)
      }
    }
    throw new Error(errors.join('; '))
  }

  async getPackageDetails(tool, source) {
    const { kind, data } = await this.fetchPackage(source)
    return {
      name: data.full_name ?? data.name?.[0] ?? data.token ?? tool.name,
      publisher: data.tap ?? 'Homebrew',
      author: data.tap ?? 'Homebrew',
      description: data.desc ?? data.description ?? tool.description ?? null,
      homepage: data.homepage ?? source.links?.homepage ?? tool.links?.homepage ?? null,
      downloadUrl: kind === 'formula'
        ? data.urls?.stable?.url ?? source.links?.download ?? tool.links?.download ?? null
        : data.url ?? source.links?.download ?? tool.links?.download ?? null,
      releaseNotesUrl: source.links?.releases ?? tool.links?.releases ?? null,
      license: Array.isArray(data.license) ? data.license.join(' AND ') : data.license ?? null,
      licenseUrl: null,
      tags: [kind, ...(data.tap ? [data.tap] : [])],
      installerType: kind,
      installerSha256: kind === 'formula'
        ? data.urls?.stable?.checksum ?? null
        : data.sha256 ?? null
    }
  }

  async getVersions(_tool, source) {
    const { kind, data } = await this.fetchPackage(source)
    const versions = kind === 'formula'
      ? [data.versions?.stable, ...(data.versioned_formulae ?? [])]
      : [data.version]
    return normalizeVersionList(versions.filter((version) => version && version !== 'HEAD'))
  }

  buildCommands(tool, source) {
    return [
      command('install', source.packageId, tool),
      command('update', source.packageId, tool),
      command('uninstall', source.packageId, tool)
    ]
  }

  buildDownloads(tool, source, details, versions) {
    return [{
      id: 'default',
      version: versions[0]?.version ?? null,
      platform: 'macos',
      architecture: null,
      type: details.installerType ?? 'homebrew-package',
      url: details.downloadUrl ?? source.links?.download ?? tool.links?.download ?? details.homepage ?? null,
      urlType: details.downloadUrl ? 'direct-installer' : 'package-manager',
      direct: Boolean(details.downloadUrl),
      sha256: details.installerSha256 ?? null,
      sizeBytes: null
    }]
  }
}
