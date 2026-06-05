# DevEnv Manager Remote Data

Online data source for DevEnv Manager.

This repository does only one thing: provide online JSON data for the DevEnv Manager app. It does not store, build, deploy, or publish the application source code.

## Data Files

- `DATA_CONTRACT.md`: current software-facing data contract.
- `data/environment-tools.json`: configured tool definitions read from the app's data structure.
- `data/identities.json`: stable tool identity, rename, alias, and package-name mapping.
- `data/scan-rules.json`: configured environment scan rules read from the app's data structure.
- `data/tool-requests.json`: accepted requests for new developer tools to support.
- `data/online/install-versions.json`: generated online package metadata for one-click installs, including versions, install command templates, download links, homepages, release-note links, publisher, license, structured descriptions, usage keywords, install notes, quality scoring, and scan status.
- `data/online/source-policy.json`: provider selection policy for choosing the best install source per platform.
- `data/online/delta.json`: generated change summary between the previous and latest online metadata refresh.
- `data/online/index.json`: compact index for split per-tool metadata.
- `data/online/tools/*.json`: split per-tool metadata files for on-demand loading.
- `data/catalog-tools.json`: full-category online developer tool catalog used by the scanner.
- `data/online/manifest.json`: generated manifest with dataset paths, byte sizes, and SHA-256 hashes.

Suite install plans use `suites[].requiredToolIds` and `suites[].optionalToolIds`. Tool-level `requirements.required` is a derived compatibility flag.

## Public URLs

After this repository is published to GitHub, the app can read:

```text
https://raw.githubusercontent.com/<owner>/devenv-manager-remote-data/main/data/online/manifest.json
https://raw.githubusercontent.com/<owner>/devenv-manager-remote-data/main/data/environment-tools.json
https://raw.githubusercontent.com/<owner>/devenv-manager-remote-data/main/data/catalog-tools.json
https://raw.githubusercontent.com/<owner>/devenv-manager-remote-data/main/data/identities.json
https://raw.githubusercontent.com/<owner>/devenv-manager-remote-data/main/data/scan-rules.json
https://raw.githubusercontent.com/<owner>/devenv-manager-remote-data/main/data/tool-requests.json
https://raw.githubusercontent.com/<owner>/devenv-manager-remote-data/main/data/online/install-versions.json
https://raw.githubusercontent.com/<owner>/devenv-manager-remote-data/main/data/online/source-policy.json
https://raw.githubusercontent.com/<owner>/devenv-manager-remote-data/main/data/online/delta.json
https://raw.githubusercontent.com/<owner>/devenv-manager-remote-data/main/data/online/index.json
https://raw.githubusercontent.com/<owner>/devenv-manager-remote-data/main/data/online/tools/git.json
```

## Local Commands

```bash
npm run validate
npm run manifest
npm run catalog
npm run identities
npm run policy
npm run refresh:metadata
node scripts/sync-from-project.mjs --source "C:\\path\\to\\devenv-manager"
```

`sync-from-project` only reads the application project and writes into this data repository.

## Scheduled Refresh Contract

The scheduled refresh job should periodically:

1. Read the application project's `src-tauri/environment-tools.json` and `src-tauri/scan-rules.json` without modifying that project.
2. Keep this repository's online-data schema compatible with the app's current data structure.
3. Refresh detailed tool metadata from real sources where available, including `winget`, `scoop`, `choco`, `homebrew`, and GitHub releases.
4. Preserve install commands and download links as honest runtime data; do not invent versions, links, or package IDs.
5. Check GitHub issues labeled `tool-request` when GitHub access is available, then add accepted tools to this data repository only.
6. Validate the result before publishing or reporting completion.
