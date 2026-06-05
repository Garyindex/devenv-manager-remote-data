export function isPrerelease(version) {
  return /(?:alpha|beta|rc|preview|nightly|canary|dev)/i.test(version)
}

export function normalizeVersion(version, index, overrides = {}) {
  return {
    version,
    channel: overrides.channel ?? (isPrerelease(version) ? 'prerelease' : 'stable'),
    latest: overrides.latest ?? index === 0,
    prerelease: overrides.prerelease ?? isPrerelease(version),
    lts: overrides.lts ?? null,
    releaseDate: overrides.releaseDate ?? null,
    eolDate: overrides.eolDate ?? null,
    changelogUrl: overrides.changelogUrl ?? null
  }
}

export function normalizeVersionList(versions) {
  return [...new Set(versions.filter(Boolean))].map((version, index) => normalizeVersion(version, index))
}

