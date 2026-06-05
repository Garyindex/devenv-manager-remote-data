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

function truncateText(value, maxLength) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 3).trim()}...` : value
}

function cleanText(value, maxLength = 1200) {
  if (typeof value !== 'string') return null
  const text = value
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[`*_#>]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!text) return null
  return truncateText(text, maxLength)
}

function cleanDescription(value, source, maxLength) {
  let text = cleanText(value, 10_000)
  if (!text) return null
  if (source === 'choco') {
    text = text
      .replace(/\s(?:Package parameters|Package Parameters|Maintainer's Note|Install Directory Override)\b[\s\S]*$/i, '')
      .trim()
  }
  return text ? truncateText(text, maxLength) : null
}

function uniqueStrings(values) {
  return [...new Set(values.filter((value) => typeof value === 'string' && value.trim().length > 0).map((value) => value.trim()))]
}

function buildDescriptions({ tool, source, providerId = 'catalog', details = {}, scan = null }) {
  const sourceName = details.descriptionSource ?? providerId
  const short = cleanDescription(
    details.shortDescription ?? details.summary ?? tool.summary ?? details.description ?? tool.description,
    sourceName,
    280
  )
  const long = cleanText(
    details.longDescription ?? details.description ?? tool.description ?? details.summary ?? tool.summary,
    1200
  )
  const cleanLong = cleanDescription(
    details.longDescription ?? details.description ?? tool.description ?? details.summary ?? tool.summary,
    sourceName,
    1200
  )
  const resolvedLong = cleanLong ?? (sourceName === 'choco' ? null : long)
  const resolvedShort = short && short.toLowerCase() === String(tool.name ?? '').toLowerCase() && resolvedLong
    ? cleanText(resolvedLong, 280)
    : short
  return {
    short: resolvedShort ?? (resolvedLong ? cleanText(resolvedLong, 280) : null),
    long: resolvedLong ?? resolvedShort ?? null,
    source: sourceName,
    homepage: details.homepage ?? source?.links?.homepage ?? tool.links?.homepage ?? null,
    lastUpdatedAt: scan?.scannedAt ?? null
  }
}

function buildUsage({ tool, sourceMetadata = null }) {
  const commandNames = (tool.detection?.commands ?? []).map((command) => command.command)
  const sourceManagers = sourceMetadata
    ? [sourceMetadata.manager]
    : (tool.sources ?? []).map((source) => source.manager)
  const sourceTags = sourceMetadata?.package?.tags ?? []
  return {
    primaryUseCases: uniqueStrings([
      tool.categoryId,
      ...(tool.tags ?? []),
      ...(tool.usage?.primaryUseCases ?? [])
    ]).slice(0, 8),
    keywords: uniqueStrings([
      tool.id,
      tool.name,
      ...(tool.aliases ?? []),
      ...(tool.tags ?? []),
      ...commandNames,
      ...sourceManagers,
      ...sourceTags,
      ...(tool.usage?.keywords ?? [])
    ]).slice(0, 24),
    relatedTools: uniqueStrings(tool.usage?.relatedTools ?? []).slice(0, 24)
  }
}

function buildNotes({ tool, details = {} }) {
  const install = uniqueStrings([
    tool.summary,
    details.installNotes,
    ...(tool.notes?.install ?? []),
    ...(details.notes?.install ?? [])
  ]).slice(0, 12)
  return {
    install,
    upgrade: uniqueStrings([
      ...(tool.notes?.upgrade ?? []),
      ...(details.notes?.upgrade ?? [])
    ]).slice(0, 12),
    knownIssues: uniqueStrings([
      ...(tool.notes?.knownIssues ?? []),
      ...(details.notes?.knownIssues ?? [])
    ]).slice(0, 12)
  }
}

function descriptionScore(source, bestQualityScore) {
  const qualityScore = source.quality?.score ?? 0
  if (qualityScore < Math.max(0, bestQualityScore - 25)) return -1
  const length = Math.max(source.descriptions?.short?.length ?? 0, source.descriptions?.long?.length ?? 0)
  const detailScore = Math.min(25, Math.floor(length / 48))
  return qualityScore + detailScore
}

function verifyFor(tool) {
  return {
    commands: (tool.detection?.commands ?? []).map((item) => ({
      command: item.command,
      args: item.versionArg ? [item.versionArg] : [],
      expectedPattern: item.expectedPattern ?? '.+'
    }))
  }
}

export function buildSourceMetadata({ tool, source, provider, details, versions, downloads, commands, scan }) {
  const quality = qualityFor({ source, details, versions, downloads, scan })
  const descriptions = buildDescriptions({ tool, source, providerId: provider.id, details, scan })
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
    descriptions,
    usage: buildUsage({ tool, sourceMetadata: {
      manager: provider.id,
      package: {
        tags: [...new Set([...(tool.tags ?? []), ...(details.tags ?? [])])]
      }
    } }),
    notes: buildNotes({ tool, details }),
    versions,
    downloads,
    commands,
    quality,
    dependencies: {
      required: Boolean(tool.requirements?.required),
      requiredBySuites: tool.requirements?.requiredBySuites ?? [],
      dependsOn: tool.requirements?.dependencies ?? [],
      optionalDependencies: tool.requirements?.optionalDependencies ?? []
    },
    detection: tool.detection ?? { commands: [] },
    verify: verifyFor(tool),
    risk: {
      requiresAdmin: Boolean(tool.requirements?.requiresAdmin),
      portable: Boolean(tool.requirements?.portable),
      systemCritical: Boolean(tool.requirements?.systemCritical)
    }
  }
}

export function buildToolMetadata(tool, sources) {
  const bestScore = sources.reduce((score, source) => Math.max(score, source.quality?.score ?? 0), 0)
  const bestDescriptionSource = [...sources]
    .filter((source) => source.descriptions?.short || source.descriptions?.long)
    .sort((a, b) => descriptionScore(b, bestScore) - descriptionScore(a, bestScore))[0]
  const descriptions = bestDescriptionSource?.descriptions ?? buildDescriptions({ tool })
  return {
    id: tool.id,
    name: tool.name,
    categoryId: tool.categoryId,
    aliases: tool.aliases ?? [],
    tags: tool.tags ?? [],
    platforms: tool.platforms ?? [],
    lifecycle: tool.lifecycle ?? {},
    links: tool.links ?? {},
    descriptions,
    usage: buildUsage({ tool }),
    notes: buildNotes({ tool }),
    detection: tool.detection ?? { commands: [] },
    verify: verifyFor(tool),
    dependencies: {
      required: Boolean(tool.requirements?.required),
      requiredBySuites: tool.requirements?.requiredBySuites ?? [],
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
