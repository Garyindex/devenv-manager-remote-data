import { fetchJson } from '../core/http-client.mjs'
import { normalizeVersionList } from '../core/version-normalizer.mjs'

const DEFAULT_BUCKETS = [
  'ScoopInstaller/Main',
  'ScoopInstaller/Extras',
  'ScoopInstaller/Versions',
  'ScoopInstaller/Java',
  'ScoopInstaller/Nonportable'
]

function manifestUrl(bucket, manifestName) {
  return `https://raw.githubusercontent.com/${bucket}/master/bucket/${encodeURIComponent(manifestName)}.json`
}

function installCommand(packageId) {
  return ['scoop', 'install', packageId]
}

function command(action, argv) {
  return {
    action,
    manager: 'scoop',
    platform: 'windows',
    requiresAdmin: false,
    supportsVersion: false,
    shell: 'argv',
    command: argv,
    template: argv
  }
}

export class ScoopProvider {
  id = 'scoop'
  cache = new Map()

  supports(_tool, source) {
    return source?.manager === 'scoop' && Boolean(source.packageId)
  }

  async manifest(source) {
    const manifestName = source.metadata?.manifest ?? source.packageId
    const candidates = source.metadata?.rawUrl
      ? [{ id: 'custom', url: source.metadata.rawUrl }]
      : (source.metadata?.bucket ? [source.metadata.bucket] : DEFAULT_BUCKETS)
          .map((bucket) => ({ id: bucket, url: manifestUrl(bucket, manifestName) }))
    const errors = []
    for (const candidate of candidates) {
      try {
        if (!this.cache.has(candidate.url)) {
          this.cache.set(candidate.url, fetchJson(candidate.url))
        }
        const data = await this.cache.get(candidate.url)
        this.cache.set(candidate.url, data)
        return { bucket: candidate.id, data }
      } catch (error) {
        errors.push(`${candidate.id}: ${error.message ?? String(error)}`)
      }
    }
    throw new Error(errors.join('; '))
  }

  async getPackageDetails(tool, source) {
    const { bucket, data } = await this.manifest(source)
    const description = data.description ?? tool.description ?? null
    return {
      name: data.name ?? tool.name,
      publisher: bucket,
      author: bucket,
      summary: description,
      description,
      longDescription: description,
      descriptionSource: 'scoop',
      homepage: data.homepage ?? source.links?.homepage ?? tool.links?.homepage ?? null,
      downloadUrl: Array.isArray(data.url) ? data.url[0] : data.url ?? source.links?.download ?? tool.links?.download ?? null,
      releaseNotesUrl: source.links?.releases ?? tool.links?.releases ?? null,
      license: typeof data.license === 'string' ? data.license : data.license?.identifier ?? null,
      licenseUrl: data.license?.url ?? null,
      tags: ['scoop', bucket],
      installerSha256: Array.isArray(data.hash) ? data.hash[0] : data.hash ?? null
    }
  }

  async getVersions(_tool, source) {
    const { data } = await this.manifest(source)
    return normalizeVersionList([data.version])
  }

  buildCommands(_tool, source) {
    return [
      command('install', installCommand(source.packageId)),
      command('update', ['scoop', 'update', source.packageId]),
      command('uninstall', ['scoop', 'uninstall', source.packageId])
    ]
  }

  buildDownloads(tool, source, details, versions) {
    return [{
      id: 'default',
      version: versions[0]?.version ?? null,
      platform: 'windows',
      architecture: null,
      type: 'scoop-manifest',
      url: details.downloadUrl ?? source.links?.download ?? tool.links?.download ?? null,
      urlType: details.downloadUrl ? 'direct-installer' : 'download-page',
      direct: Boolean(details.downloadUrl),
      sha256: details.installerSha256 ?? null,
      sizeBytes: null
    }]
  }
}
