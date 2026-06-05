export class ChocoProvider {
  id = 'choco'

  supports(_tool, source) {
    return source?.manager === 'choco' && Boolean(source.packageId)
  }

  async getPackageDetails() {
    throw new Error('choco provider is defined but not yet enabled in catalog sources')
  }

  async getVersions() {
    return []
  }

  buildCommands(tool, source) {
    return [
      {
        action: 'install',
        manager: 'choco',
        platform: 'windows',
        requiresAdmin: Boolean(tool.requirements?.requiresAdmin),
        supportsVersion: true,
        shell: 'argv',
        command: ['choco', 'install', source.packageId, '-y']
      }
    ]
  }
}

