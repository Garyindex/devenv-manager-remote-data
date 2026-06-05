export function buildSourceMetadata({ tool, source, provider, details, versions, downloads, commands, scan }) {
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
    sources
  }
}

