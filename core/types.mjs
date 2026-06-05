/**
 * @typedef {'windows' | 'macos' | 'linux'} Platform
 * @typedef {'install' | 'update' | 'uninstall'} CommandAction
 *
 * @typedef {object} ProviderCommand
 * @property {CommandAction} action
 * @property {string} manager
 * @property {Platform | string} platform
 * @property {boolean} requiresAdmin
 * @property {boolean} supportsVersion
 * @property {'argv'} shell
 * @property {string[]} command
 * @property {string[]} template
 *
 * @typedef {object} ProviderVersion
 * @property {string} version
 * @property {string} channel
 * @property {boolean} latest
 * @property {boolean} prerelease
 * @property {boolean | null} lts
 * @property {string | null} releaseDate
 * @property {string | null} eolDate
 * @property {string | null} changelogUrl
 *
 * @typedef {object} ProviderDownload
 * @property {string} id
 * @property {string | null} version
 * @property {Platform | string} platform
 * @property {string | null} architecture
 * @property {string} type
 * @property {string | null} url
 * @property {'direct-installer' | 'download-page' | 'package-manager'} urlType
 * @property {boolean} direct
 * @property {string | null} sha256
 * @property {number | null} sizeBytes
 *
 * @typedef {object} QualityMetadata
 * @property {'high' | 'medium' | 'low'} confidence
 * @property {number} score
 * @property {boolean=} official
 * @property {string | null=} lastSuccessfulScanAt
 * @property {number=} failureCount
 * @property {number=} staleAfterDays
 *
 * @typedef {object} DescriptionMetadata
 * @property {string | null} short
 * @property {string | null} long
 * @property {string} source
 * @property {string | null} homepage
 * @property {string | null} lastUpdatedAt
 *
 * @typedef {object} UsageMetadata
 * @property {string[]} primaryUseCases
 * @property {string[]} keywords
 * @property {string[]} relatedTools
 *
 * @typedef {object} NotesMetadata
 * @property {string[]} install
 * @property {string[]} upgrade
 * @property {string[]} knownIssues
 *
 * @typedef {object} PackageDetails
 * @property {string=} name
 * @property {string | null=} publisher
 * @property {string | null=} author
 * @property {string | null=} summary
 * @property {string | null=} description
 * @property {string | null=} longDescription
 * @property {string | null=} descriptionSource
 * @property {string | null=} homepage
 * @property {string | null=} downloadUrl
 * @property {string | null=} releaseNotesUrl
 * @property {string | null=} license
 * @property {string | null=} licenseUrl
 * @property {string[]=} tags
 * @property {NotesMetadata=} notes
 *
 * @typedef {object} ToolProvider
 * @property {string} id
 * @property {(tool: object, source?: object) => boolean} supports
 * @property {(tool: object, source: object) => Promise<PackageDetails>} getPackageDetails
 * @property {(tool: object, source: object) => Promise<ProviderVersion[]>} getVersions
 * @property {(tool: object, source: object) => ProviderCommand[]} buildCommands
 * @property {(tool: object, source: object, details: PackageDetails, versions: ProviderVersion[]) => ProviderDownload[]=} buildDownloads
 */

export {}
