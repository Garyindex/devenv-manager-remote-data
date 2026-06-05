function byId(items) {
  return new Map((items ?? []).map((item) => [item.id, item]))
}

function latestVersion(source) {
  return source?.versions?.find((version) => version.latest)?.version ?? source?.versions?.[0]?.version ?? null
}

function sourceKey(toolId, sourceId) {
  return `${toolId}/${sourceId}`
}

export function buildMetadataDelta(previous, current) {
  const previousTools = byId(previous?.tools)
  const currentTools = byId(current?.tools)
  const addedTools = []
  const removedTools = []
  const changedTools = []
  const addedSources = []
  const removedSources = []
  const versionChanges = []
  const qualityChanges = []

  for (const [toolId, tool] of currentTools) {
    const oldTool = previousTools.get(toolId)
    if (!oldTool) {
      addedTools.push(toolId)
      continue
    }

    const oldSources = byId(oldTool.sources)
    const newSources = byId(tool.sources)
    let changed = false

    for (const [sourceId, source] of newSources) {
      const oldSource = oldSources.get(sourceId)
      if (!oldSource) {
        addedSources.push(sourceKey(toolId, sourceId))
        changed = true
        continue
      }

      const oldLatest = latestVersion(oldSource)
      const newLatest = latestVersion(source)
      if (oldLatest !== newLatest) {
        versionChanges.push({
          toolId,
          sourceId,
          manager: source.manager,
          from: oldLatest,
          to: newLatest
        })
        changed = true
      }

      const oldScore = oldSource.quality?.score ?? null
      const newScore = source.quality?.score ?? null
      if (oldScore !== newScore) {
        qualityChanges.push({
          toolId,
          sourceId,
          manager: source.manager,
          from: oldScore,
          to: newScore
        })
        changed = true
      }
    }

    for (const sourceId of oldSources.keys()) {
      if (!newSources.has(sourceId)) {
        removedSources.push(sourceKey(toolId, sourceId))
        changed = true
      }
    }

    if (changed) changedTools.push(toolId)
  }

  for (const toolId of previousTools.keys()) {
    if (!currentTools.has(toolId)) removedTools.push(toolId)
  }

  return {
    schemaVersion: 1,
    generatedAt: current.generatedAt,
    fromGeneratedAt: previous?.generatedAt ?? null,
    toGeneratedAt: current.generatedAt,
    status: current.status,
    summary: {
      addedTools: addedTools.length,
      removedTools: removedTools.length,
      changedTools: changedTools.length,
      addedSources: addedSources.length,
      removedSources: removedSources.length,
      versionChanges: versionChanges.length,
      qualityChanges: qualityChanges.length
    },
    changes: {
      addedTools,
      removedTools,
      changedTools: [...new Set(changedTools)],
      addedSources,
      removedSources,
      versionChanges,
      qualityChanges
    }
  }
}
