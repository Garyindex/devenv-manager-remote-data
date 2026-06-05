export class ScoopProvider {
  id = 'scoop'

  supports(_tool, source) {
    return source?.manager === 'scoop' && Boolean(source.packageId)
  }

  async getPackageDetails() {
    throw new Error('scoop provider is defined but not yet enabled in catalog sources')
  }

  async getVersions() {
    return []
  }

  buildCommands(tool, source) {
    return [
      {
        action: 'install',
        manager: 'scoop',
        platform: 'windows',
        requiresAdmin: false,
        supportsVersion: false,
        shell: 'argv',
        command: ['scoop', 'install', source.packageId]
      }
    ]
  }
}

