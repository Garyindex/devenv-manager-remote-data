# DevEnv Manager Online Data Contract

This is the current and only data contract for the unpublished DevEnv Manager app.

## Files

- `data/catalog-tools.json`: static cross-platform tool catalog.
- `data/identities.json`: stable identity and rename mapping for tools.
- `data/online/install-versions.json`: daily scanned package metadata.
- `data/online/index.json`: compact split-metadata index.
- `data/online/tools/*.json`: per-tool metadata files referenced by `index.json`.
- `data/online/source-policy.json`: platform-specific provider selection policy.
- `data/online/delta.json`: change summary from the previous metadata refresh.
- `data/online/manifest.json`: dataset index with hashes and byte sizes.
- `data/tool-requests.json`: accepted or pending tool-support requests.

## Catalog Shape

```json
{
  "schemaVersion": 1,
  "categories": [{ "id": "javascript", "name": "JavaScript and TypeScript" }],
  "tools": [
    {
      "id": "node_lts",
      "name": "Node.js LTS",
      "categoryId": "javascript",
      "summary": "",
      "aliases": [],
      "tags": [],
      "platforms": ["windows", "macos", "linux"],
      "links": {
        "homepage": "https://nodejs.org/",
        "download": "https://nodejs.org/",
        "releases": null,
        "docs": null
      },
      "detection": {
        "commands": [{ "command": "node", "versionArg": "--version" }]
      },
          "sources": [
        {
          "id": "winget",
          "manager": "winget",
          "packageId": "OpenJS.NodeJS.LTS",
          "platforms": ["windows"],
          "official": true,
          "priority": 10,
          "links": {},
          "capabilities": {
            "versionHistory": true,
            "directDownload": true,
            "installCommand": true,
            "updateCommand": true,
            "uninstallCommand": true
          }
        }
      ],
      "requirements": {
        "required": false,
        "requiresAdmin": false,
        "dependencies": []
      },
      "lifecycle": {
        "status": "active",
        "deprecated": false,
        "replacedBy": null
      }
    }
  ],
  "suites": [
    {
      "id": "frontend",
      "name": "Frontend and web apps",
      "requiredToolIds": ["git", "node_lts", "npm"],
      "optionalToolIds": ["pnpm", "yarn", "bun", "deno", "volta", "vscode"],
      "toolIds": ["git", "node_lts", "npm", "pnpm", "yarn", "bun", "deno", "volta", "vscode"]
    }
  ]
}
```

`suites[].requiredToolIds` is the install-plan source of truth. `tools[].requirements.required` is a compatibility flag derived from whether the tool appears in at least one `requiredToolIds` list. A tool can be required in one suite and optional in another; clients should read the suite lists when building a suite-specific install plan.

## Online Metadata Shape

Clients should prefer the split metadata contract:

1. Read `data/online/index.json`.
2. Select tool entries by platform/category/search.
3. Fetch only the needed `data/online/tools/<toolId>.json` files.
4. Use `data/online/install-versions.json` only as a compatibility fallback.

`index.json` shape:

```json
{
  "schemaVersion": 1,
  "generatedAt": "2026-06-05T00:00:00.000Z",
  "status": "ok",
  "summary": {
    "totalTools": 133,
    "totalPackageSources": 406
  },
  "tools": [
    {
      "id": "git",
      "name": "Git",
      "categoryId": "source-control",
      "platforms": ["windows", "macos", "linux"],
      "sourceCount": 4,
      "bestQualityScore": 100,
      "path": "data/online/tools/git.json",
      "bytes": 12345,
      "sha256": "..."
    }
  ]
}
```

Each per-tool file has:

```json
{
  "schemaVersion": 1,
  "generatedAt": "2026-06-05T00:00:00.000Z",
  "status": "ok",
  "tool": {}
}
```

The compatibility aggregate remains:

```json
{
  "schemaVersion": 1,
  "generatedAt": "2026-06-05T00:00:00.000Z",
  "status": "ok",
  "summary": {
    "totalConfiguredTools": 133,
    "totalPackageSources": 130,
    "totalScannedSources": 130,
    "managers": {
      "winget": { "available": true, "configuredSources": 130, "scannedSources": 130 }
    }
  },
  "tools": [
    {
      "id": "node_lts",
      "name": "Node.js LTS",
      "categoryId": "javascript",
      "platforms": ["windows", "macos", "linux"],
      "detection": {},
      "verify": {
        "commands": [
          { "command": "node", "args": ["--version"], "expectedPattern": ".+" }
        ]
      },
      "sources": [
        {
          "id": "winget",
          "manager": "winget",
          "packageId": "OpenJS.NodeJS.LTS",
          "platforms": ["windows"],
          "scan": { "status": "ok", "scannedAt": "2026-06-05T00:00:00.000Z", "errors": [] },
          "package": {
            "name": "Node.js LTS",
            "publisher": "OpenJS Foundation",
            "license": null,
            "tags": []
          },
          "links": {
            "homepage": "https://nodejs.org/",
            "download": "https://nodejs.org/",
            "releases": null,
            "docs": null
          },
          "versions": [
            {
              "version": "24.16.0",
              "channel": "stable",
              "latest": true,
              "prerelease": false,
              "lts": null,
              "releaseDate": null,
              "eolDate": null,
              "changelogUrl": null
            }
          ],
          "downloads": [
            {
              "id": "default",
              "version": "24.16.0",
              "platform": "windows",
              "architecture": null,
              "type": "msi",
              "url": "https://...",
              "urlType": "direct-installer",
              "direct": true,
              "sha256": null,
              "sizeBytes": null
            }
          ],
          "commands": [
            {
              "action": "install",
              "manager": "winget",
              "platform": "windows",
              "version": null,
              "requiresAdmin": false,
              "supportsVersion": true,
              "shell": "argv",
              "command": ["winget", "install", "--id", "OpenJS.NodeJS.LTS", "--exact"],
              "template": ["winget", "install", "--id", "OpenJS.NodeJS.LTS", "--exact", "--version", "{{version}}"]
            }
          ],
          "quality": {
            "confidence": "high",
            "score": 90,
            "official": true,
            "lastSuccessfulScanAt": "2026-06-05T00:00:00.000Z",
            "failureCount": 0,
            "staleAfterDays": 7
          },
          "verify": {
            "commands": [
              { "command": "node", "args": ["--version"], "expectedPattern": ".+" }
            ]
          }
        }
      ],
      "quality": { "confidence": "high", "score": 90 }
    }
  ],
  "errors": []
}
```

## Platform And Manager Rules

- `platforms` values are `windows`, `macos`, `linux`, or a narrower OS label if needed.
- `commands[].shell = "argv"` means the app should execute the command as an argv array, not through shell string interpolation.
- `commands[].command` is the latest/default command.
- `commands[].template` is the provider-specific argv template. When `supportsVersion = true`, replace the literal `{{version}}` item with the selected version. The data source does not pre-generate one command per historical version.
- `downloads[].urlType = "direct-installer"` means the app can download the installer directly.
- `downloads[].urlType = "download-page"` means the app should open the page or ask the user before downloading.
- `quality.score` is a 0-100 source confidence score based on official source status, successful scan, version history, download availability, and direct download confidence.
- Prefer higher `quality.score`, lower `priority`, and platform match when choosing a source for one-click install.
- `verify.commands` gives post-install argv checks. The app should run these after install/update when possible and treat failure as an installation verification failure, not as proof the package source is invalid.
- Missing runtime data must remain `null` or an empty array. Do not fabricate versions, URLs, hashes, dates, or EOL status.

## Source Policy

`data/online/source-policy.json` tells the app how to rank package sources:

- Windows defaults to `winget`, then `scoop`, then `choco`, then GitHub release downloads.
- macOS and Linux default to `homebrew`, then GitHub release downloads.
- Reject sources below `minimumQualityScore` unless the user explicitly chooses a fallback.
- Always inject versions through `commands[].template` by replacing the literal `{{version}}` argv item.

## Delta Shape

`data/online/delta.json` is generated whenever metadata refresh runs:

```json
{
  "schemaVersion": 1,
  "fromGeneratedAt": "2026-06-05T00:00:00.000Z",
  "toGeneratedAt": "2026-06-05T06:00:00.000Z",
  "summary": {
    "versionChanges": 12,
    "qualityChanges": 2
  },
  "changes": {
    "versionChanges": [
      { "toolId": "node_lts", "sourceId": "winget", "manager": "winget", "from": "22.0.0", "to": "22.1.0" }
    ]
  }
}
```

## Identity Mapping

`data/identities.json` preserves stable IDs across rename/package changes:

```json
{
  "schemaVersion": 1,
  "identities": [
    {
      "stableId": "vscode",
      "currentId": "vscode",
      "currentName": "Visual Studio Code",
      "previousIds": [],
      "previousNames": [],
      "aliases": [],
      "packageAliases": {
        "winget": ["Microsoft.VisualStudioCode"],
        "homebrew": ["visual-studio-code"]
      },
      "lifecycle": {
        "status": "active",
        "deprecated": false,
        "renamedFrom": null,
        "renamedTo": null,
        "replacedBy": null
      },
      "identityConfidence": "high"
    }
  ]
}
```

The app should store user state by `stableId`, not display name or package manager ID.

## Provider Architecture

Runtime metadata is refreshed through Provider modules:

- `providers/winget-provider.mjs`
- `providers/scoop-provider.mjs`
- `providers/choco-provider.mjs`
- `providers/homebrew-provider.mjs`
- `providers/github-provider.mjs`

The common interface is:

```ts
interface ToolProvider {
  id: string
  supports(tool: Tool, source: Source): boolean
  getPackageDetails(tool: Tool, source: Source): Promise<PackageDetails>
  getVersions(tool: Tool, source: Source): Promise<Version[]>
  buildCommands(tool: Tool, source: Source): Command[]
  buildDownloads?(tool: Tool, source: Source, details: PackageDetails, versions: Version[]): Download[]
}
```

`core/provider-manager.mjs` runs providers through a bounded concurrency pool. Default concurrency is 8. Provider failures are recorded per source and do not fail the whole refresh unless validation fails.
