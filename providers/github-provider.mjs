import { fetchJson, githubHeaders } from '../core/http-client.mjs'
import { normalizeVersion } from '../core/version-normalizer.mjs'

function repoApiUrl(packageId, suffix = '') {
  return `https://api.github.com/repos/${packageId}${suffix}`
}

function versionFromTag(tagName) {
  return String(tagName ?? '').replace(/^v/i, '')
}

function platformFromAsset(name) {
  const lower = name.toLowerCase()
  if (/(windows|win32|win64|\.msi|\.exe|\.zip$)/.test(lower)) return 'windows'
  if (/(darwin|macos|apple|\.dmg|\.pkg)/.test(lower)) return 'macos'
  if (/(linux|\.deb|\.rpm|\.appimage|\.tar\.gz|\.tgz)/.test(lower)) return 'linux'
  return 'unknown'
}

function architectureFromAsset(name) {
  const lower = name.toLowerCase()
  if (/(arm64|aarch64)/.test(lower)) return 'arm64'
  if (/(x64|x86_64|amd64)/.test(lower)) return 'x64'
  if (/(x86|i386|i686)/.test(lower)) return 'x86'
  return null
}

function typeFromAsset(name) {
  const match = name.toLowerCase().match(/\.(msi|exe|zip|dmg|pkg|deb|rpm|appimage|tar\.gz|tgz)$/)
  return match ? match[1] : 'release-asset'
}

export class GitHubProvider {
  id = 'github'
  cache = new Map()

  supports(_tool, source) {
    return source?.manager === 'github' && /^[^/\s]+\/[^/\s]+$/.test(source.packageId ?? '')
  }

  async repo(source) {
    const key = `repo:${source.packageId}`
    if (!this.cache.has(key)) {
      this.cache.set(key, fetchJson(repoApiUrl(source.packageId), { headers: githubHeaders() }))
    }
    const repo = await this.cache.get(key)
    this.cache.set(key, repo)
    return repo
  }

  async releases(source) {
    const key = `releases:${source.packageId}`
    if (!this.cache.has(key)) {
      this.cache.set(key, fetchJson(repoApiUrl(source.packageId, '/releases?per_page=30'), { headers: githubHeaders() }))
    }
    const releases = await this.cache.get(key)
    this.cache.set(key, releases)
    return releases
  }

  async getPackageDetails(tool, source) {
    const repo = await this.repo(source)
    return {
      name: repo.name ?? tool.name,
      publisher: repo.owner?.login ?? null,
      author: repo.owner?.login ?? null,
      description: repo.description ?? tool.description ?? null,
      homepage: repo.homepage || repo.html_url || source.links?.homepage || tool.links?.homepage || null,
      downloadUrl: source.links?.download ?? tool.links?.download ?? null,
      releaseNotesUrl: `${repo.html_url}/releases`,
      license: repo.license?.spdx_id ?? null,
      licenseUrl: repo.license?.url ?? null,
      tags: repo.topics ?? [],
      htmlUrl: repo.html_url ?? null
    }
  }

  async getVersions(_tool, source) {
    const releases = await this.releases(source)
    return releases
      .filter((release) => release.tag_name && !release.draft)
      .map((release, index) => normalizeVersion(versionFromTag(release.tag_name), index, {
        prerelease: Boolean(release.prerelease),
        channel: release.prerelease ? 'prerelease' : 'stable',
        releaseDate: release.published_at ?? null,
        changelogUrl: release.html_url ?? null
      }))
  }

  buildCommands() {
    return []
  }

  buildDownloads(tool, source, _details, versions) {
    const releases = this.cache.get(`releases:${source.packageId}`)
    if (!releases || typeof releases.then === 'function') {
      return [{
        id: 'releases',
        version: versions[0]?.version ?? null,
        platform: 'cross-platform',
        architecture: null,
        type: 'download-page',
        url: source.links?.releases ?? tool.links?.releases ?? source.links?.download ?? tool.links?.download ?? null,
        urlType: 'download-page',
        direct: false,
        sha256: null,
        sizeBytes: null
      }]
    }

    return releases
      .filter((release) => release.tag_name && !release.draft)
      .flatMap((release) => release.assets.map((asset) => ({
        id: asset.name,
        version: versionFromTag(release.tag_name),
        platform: platformFromAsset(asset.name),
        architecture: architectureFromAsset(asset.name),
        type: typeFromAsset(asset.name),
        url: asset.browser_download_url ?? null,
        urlType: asset.browser_download_url ? 'direct-installer' : 'download-page',
        direct: Boolean(asset.browser_download_url),
        sha256: null,
        sizeBytes: Number.isFinite(asset.size) ? asset.size : null
      })))
      .slice(0, 80)
  }
}
