# DevEnv Manager Remote Data

Remote data repository for DevEnv Manager.

This repository is intentionally separate from the application repository. It stores online JSON data that the application can consume later without requiring the app source repository to be uploaded here.

## Data Files

- `data/environment-tools.json`: development tool definitions, command probes, winget package IDs, install suites, and one-click install metadata.
- `data/scan-rules.json`: developer environment scan rules, path templates, risk factors, and dependency graph metadata.
- `data/online/install-versions.json`: generated online package-version metadata for one-click installs.
- `data/online/manifest.json`: generated manifest with dataset paths and SHA-256 hashes.

## Public URLs

After this repository is published to GitHub, the app can read:

```text
https://raw.githubusercontent.com/<owner>/devenv-manager-remote-data/main/data/online/manifest.json
https://raw.githubusercontent.com/<owner>/devenv-manager-remote-data/main/data/environment-tools.json
https://raw.githubusercontent.com/<owner>/devenv-manager-remote-data/main/data/scan-rules.json
https://raw.githubusercontent.com/<owner>/devenv-manager-remote-data/main/data/online/install-versions.json
```

## Local Commands

```bash
npm run validate
npm run manifest
npm run refresh:winget
node scripts/sync-from-project.mjs --source "C:\\path\\to\\devenv-manager"
```

`sync-from-project` only reads the application project and writes into this data repository.

## Automation Contract

The Codex automation should periodically:

1. Read the application project's `src-tauri/environment-tools.json` and `src-tauri/scan-rules.json`.
2. Sync matching data into this repository.
3. If the source structure changes, update this repository's schemas, validators, and online data shape to match.
4. Refresh package-version metadata where real package manager data is available.
5. Validate the result before publishing or reporting completion.

