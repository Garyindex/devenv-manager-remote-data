function qualityFor({ source, details, versions, downloads, scan }) {
  const hasVersion = versions.length > 0
  const hasDownload = downloads.some((download) => download.url)
  const hasDirectDownload = downloads.some((download) => download.direct)
  const score = [
    source.official ? 25 : 10,
    details.homepage ? 15 : 0,
    hasVersion ? 25 : 0,
    hasDownload ? 15 : 0,
    hasDirectDownload ? 10 : 0,
    scan.status === 'ok' ? 10 : 0
  ].reduce((sum, value) => sum + value, 0)

  return {
    confidence: score >= 75 ? 'high' : score >= 45 ? 'medium' : 'low',
    score,
    official: Boolean(source.official),
    lastSuccessfulScanAt: scan.status === 'ok' ? scan.scannedAt : null,
    failureCount: scan.errors.length,
    staleAfterDays: source.manager === 'github' ? 3 : 7
  }
}

export function buildSourceMetadata({ tool, source, provider, details, versions, downloads, commands, scan }) {
  const quality = qualityFor({ source, details, versions, downloads, scan })
  return {
    id: source.id,
    manager: provider.id,
    packageId: source.packageId ?? null,
    platforms: source.platforms ?? [],
    official: Boolean(source.official),
    priority: source.priority ?? 100,
    scan,
    package: {
      name: details.name ?? tool.name,
      publisher: details.publisher ?? null,
      author: details.author ?? null,
      description: details.description ?? tool.description ?? null,
      license: details.license ?? null,
      licenseUrl: details.licenseUrl ?? null,
      tags: [...new Set([...(tool.tags ?? []), ...(details.tags ?? [])])]
    },
    links: {
      homepage: details.homepage ?? source.links?.homepage ?? tool.links?.homepage ?? null,
      download: details.downloadUrl ?? source.links?.download ?? tool.links?.download ?? null,
      releases: details.releaseNotesUrl ?? source.links?.releases ?? tool.links?.releases ?? null,
      docs: source.links?.docs ?? tool.links?.docs ?? null
    },
    versions,
    downloads,
    commands,
    quality,
    dependencies: {
      dependsOn: tool.requirements?.dependencies ?? [],
      optionalDependencies: tool.requirements?.optionalDependencies ?? []
    },
    detection: tool.detection ?? { commands: [] },
    risk: {
      requiresAdmin: Boolean(tool.requirements?.requiresAdmin),
      portable: Boolean(tool.requirements?.portable),
      systemCritical: Boolean(tool.requirements?.systemCritical)
    }
  }
}

export function buildToolMetadata(tool, sources) {
  const bestScore = sources.reduce((score, source) => Math.max(score, source.quality?.score ?? 0), 0)
  return {
    id: tool.id,
    name: tool.name,
    categoryId: tool.categoryId,
    aliases: tool.aliases ?? [],
    tags: tool.tags ?? [],
    platforms: tool.platforms ?? [],
    lifecycle: tool.lifecycle ?? {},
    links: tool.links ?? {},
    detection: tool.detection ?? { commands: [] },
    dependencies: {
      dependsOn: tool.requirements?.dependencies ?? [],
      optionalDependencies: tool.requirements?.optionalDependencies ?? []
    },
    risk: {
      requiresAdmin: Boolean(tool.requirements?.requiresAdmin),
      portable: Boolean(tool.requirements?.portable),
      systemCritical: Boolean(tool.requirements?.systemCritical)
    },
    quality: {
      confidence: bestScore >= 75 ? 'high' : bestScore >= 45 ? 'medium' : 'low',
      score: bestScore
    },
    sources
  }
}
