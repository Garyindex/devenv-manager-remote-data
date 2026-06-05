import { runPool } from './concurrency.mjs'
import { buildSourceMetadata, buildToolMetadata } from './metadata-builder.mjs'

export class ProviderManager {
  constructor(providers, { maxConcurrency = 8 } = {}) {
    this.providers = providers
    this.maxConcurrency = maxConcurrency
  }

  createJobs(tools) {
    return tools.flatMap((tool) =>
      (tool.sources ?? [])
        .map((source) => {
          const provider = this.providers.find((item) => item.supports(tool, source))
          return provider ? { tool, source, provider } : null
        })
        .filter(Boolean)
    )
  }

  async scan(tools, { limit = null } = {}) {
    const jobs = this.createJobs(tools)
    const selectedJobs = Number.isInteger(limit) && limit > 0 ? jobs.slice(0, limit) : jobs
    const settled = await runPool(selectedJobs, (job) => this.scanJob(job), {
      maxConcurrency: this.maxConcurrency
    })
    const byTool = new Map()
    const errors = []

    for (const item of settled) {
      if (item.status === 'rejected') {
        errors.push(item.reason?.message ?? String(item.reason))
        continue
      }
      const { tool, sourceMetadata } = item.value
      const existing = byTool.get(tool.id) ?? { tool, sources: [] }
      existing.sources.push(sourceMetadata)
      byTool.set(tool.id, existing)
      if (sourceMetadata.scan.errors.length > 0) {
        errors.push(...sourceMetadata.scan.errors.map((error) => `${tool.id}/${sourceMetadata.id}: ${error}`))
      }
    }

    return {
      jobs,
      selectedJobs,
      tools: [...byTool.values()].map(({ tool, sources }) => buildToolMetadata(tool, sources)),
      errors
    }
  }

  async scanJob({ tool, source, provider }) {
    const scannedAt = new Date().toISOString()
    const errors = []
    let details = {}
    let versions = []
    let commands = []
    let status = 'ok'

    try {
      details = await provider.getPackageDetails(tool, source)
    } catch (error) {
      status = 'partial'
      errors.push(`details: ${error.message ?? String(error)}`)
    }

    try {
      versions = await provider.getVersions(tool, source)
    } catch (error) {
      status = 'partial'
      errors.push(`versions: ${error.message ?? String(error)}`)
    }

    try {
      commands = provider.buildCommands(tool, source)
    } catch (error) {
      status = 'partial'
      errors.push(`commands: ${error.message ?? String(error)}`)
    }

    const downloads = provider.buildDownloads
      ? provider.buildDownloads(tool, source, details, versions)
      : []

    return {
      tool,
      sourceMetadata: buildSourceMetadata({
        tool,
        source,
        provider,
        details,
        versions,
        downloads,
        commands,
        scan: { status, scannedAt, errors }
      })
    }
  }
}

