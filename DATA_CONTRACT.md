# DevEnv Manager Online Data Contract

This is the current and only data contract for the unpublished DevEnv Manager app.

## Files

- `data/catalog-tools.json`: static cross-platform tool catalog.
- `data/online/install-versions.json`: daily scanned package metadata.
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
  "suites": [{ "id": "frontend", "name": "Frontend and web apps", "toolIds": ["node_lts"] }]
}
```

## Online Metadata Shape

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
- Missing runtime data must remain `null` or an empty array. Do not fabricate versions, URLs, hashes, dates, or EOL status.

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
