export class GitHubProvider {
  id = 'github'

  supports(_tool, source) {
    return source?.manager === 'github' && Boolean(source.packageId)
  }

  async getPackageDetails() {
    throw new Error('github provider is defined but not yet enabled in catalog sources')
  }

  async getVersions() {
    return []
  }

  buildCommands() {
    return []
  }
}

