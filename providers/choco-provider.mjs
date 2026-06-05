import { fetchText } from '../core/http-client.mjs'
import { normalizeVersionList } from '../core/version-normalizer.mjs'

function feedUrl(packageId) {
  return `https://community.chocolatey.org/api/v2/FindPackagesById()?id='${encodeURIComponent(packageId)}'`
}

function xmlText(entry, tag) {
  const match = entry.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'))
  return match ? decodeXml(match[1].trim()) : null
}

function decodeXml(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function entries(feed) {
  return feed.match(/<entry>[\s\S]*?<\/entry>/g) ?? []
}

function contentUrl(entry) {
  const match = entry.match(/<content[^>]+src="([^"]+)"/i)
  return match ? decodeXml(match[1]) : null
}

function command(action, packageId, argv, tool) {
  return {
    action,
    manager: 'choco',
    platform: 'windows',
    requiresAdmin: Boolean(tool.requirements?.requiresAdmin),
    supportsVersion: action === 'install',
    shell: 'argv',
    command: argv,
    template: action === 'install' ? ['choco', 'install', packageId, '--version', '{{version}}', '-y'] : argv
  }
}

export class ChocoProvider {
  id = 'choco'
  cache = new Map()

  supports(_tool, source) {
    return source?.manager === 'choco' && Boolean(source.packageId)
  }

  async feed(source) {
    const url = feedUrl(source.packageId)
    if (!this.cache.has(url)) {
      this.cache.set(url, fetchText(url))
    }
    const feed = await this.cache.get(url)
    this.cache.set(url, feed)
    return feed
  }

  async getPackageDetails(tool, source) {
    const feed = await this.feed(source)
    const first = entries(feed)[0]
    if (!first) throw new Error(`No Chocolatey package found for ${source.packageId}`)
    const summary = xmlText(first, 'd:Summary') ?? xmlText(first, 'summary') ?? null
    const longDescription = xmlText(first, 'd:Description') ?? null
    return {
      name: xmlText(first, 'd:Title') ?? xmlText(first, 'title') ?? tool.name,
      publisher: xmlText(first, 'd:Authors') ?? xmlText(first, 'name') ?? null,
      author: xmlText(first, 'd:Authors') ?? xmlText(first, 'name') ?? null,
      summary,
      description: summary ?? longDescription,
      longDescription,
      descriptionSource: 'choco',
      homepage: xmlText(first, 'd:ProjectUrl') ?? source.links?.homepage ?? tool.links?.homepage ?? null,
      downloadUrl: contentUrl(first) ?? source.links?.download ?? tool.links?.download ?? null,
      releaseNotesUrl: xmlText(first, 'd:ReleaseNotes') ?? source.links?.releases ?? tool.links?.releases ?? null,
      license: null,
      licenseUrl: xmlText(first, 'd:LicenseUrl') ?? null,
      tags: (xmlText(first, 'd:Tags') ?? '').split(/\s+/).filter(Boolean),
      installerSha256: xmlText(first, 'd:PackageHash') ?? null
    }
  }

  async getVersions(_tool, source) {
    const feed = await this.feed(source)
    return normalizeVersionList(entries(feed).map((entry) => xmlText(entry, 'd:Version')).slice(0, 30))
  }

  buildCommands(tool, source) {
    return [
      command('install', source.packageId, ['choco', 'install', source.packageId, '-y'], tool),
      command('update', source.packageId, ['choco', 'upgrade', source.packageId, '-y'], tool),
      command('uninstall', source.packageId, ['choco', 'uninstall', source.packageId, '-y'], tool)
    ]
  }

  buildDownloads(tool, source, details, versions) {
    return [{
      id: 'default',
      version: versions[0]?.version ?? null,
      platform: 'windows',
      architecture: null,
      type: 'chocolatey-package',
      url: details.downloadUrl ?? source.links?.download ?? tool.links?.download ?? null,
      urlType: details.downloadUrl ? 'direct-installer' : 'package-manager',
      direct: Boolean(details.downloadUrl),
      sha256: details.installerSha256 ?? null,
      sizeBytes: null
    }]
  }
}
