import fs from 'node:fs'
import crypto from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

const failures = []

function readJson(relativePath) {
  const fullPath = path.join(repoRoot, relativePath)
  try {
    return JSON.parse(fs.readFileSync(fullPath, 'utf8'))
  } catch (error) {
    fail(`${relativePath}: ${error.message}`)
    return null
  }
}

function fail(message) {
  failures.push(message)
}

function assert(condition, message) {
  if (!condition) fail(message)
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function assertString(value, label) {
  assert(typeof value === 'string' && value.trim().length > 0, `${label} must be a non-empty string`)
}

function assertBoolean(value, label) {
  assert(typeof value === 'boolean', `${label} must be boolean`)
}

function assertNumber(value, label, { min = null, max = null } = {}) {
  assert(typeof value === 'number' && Number.isFinite(value), `${label} must be a finite number`)
  if (typeof value !== 'number' || !Number.isFinite(value)) return
  if (min !== null) assert(value >= min, `${label} must be >= ${min}`)
  if (max !== null) assert(value <= max, `${label} must be <= ${max}`)
}

function validateQuality(value, label) {
  assert(isObject(value), `${label} must be an object`)
  assert(['high', 'medium', 'low'].includes(value?.confidence), `${label}.confidence must be high, medium, or low`)
  assertNumber(value?.score, `${label}.score`, { min: 0, max: 100 })
}

function validateStringArray(value, label) {
  assert(Array.isArray(value), `${label} must be an array`)
  for (const [index, item] of (value ?? []).entries()) {
    assertString(item, `${label}[${index}]`)
  }
}

function validateDescriptions(value, label) {
  assert(isObject(value), `${label} must be an object`)
  assert(typeof value?.short === 'string' || value?.short === null, `${label}.short must be string or null`)
  assert(typeof value?.long === 'string' || value?.long === null, `${label}.long must be string or null`)
  if (typeof value?.short === 'string') assert(value.short.length <= 280, `${label}.short must be <= 280 characters`)
  if (typeof value?.long === 'string') assert(value.long.length <= 1200, `${label}.long must be <= 1200 characters`)
  assertString(value?.source, `${label}.source`)
  assert(typeof value?.homepage === 'string' || value?.homepage === null, `${label}.homepage must be string or null`)
  assert(typeof value?.lastUpdatedAt === 'string' || value?.lastUpdatedAt === null, `${label}.lastUpdatedAt must be string or null`)
}

function validateUsage(value, label) {
  assert(isObject(value), `${label} must be an object`)
  validateStringArray(value?.primaryUseCases, `${label}.primaryUseCases`)
  validateStringArray(value?.keywords, `${label}.keywords`)
  validateStringArray(value?.relatedTools, `${label}.relatedTools`)
}

function validateNotes(value, label) {
  assert(isObject(value), `${label} must be an object`)
  validateStringArray(value?.install, `${label}.install`)
  validateStringArray(value?.upgrade, `${label}.upgrade`)
  validateStringArray(value?.knownIssues, `${label}.knownIssues`)
}

function assertUnique(items, getId, label) {
  const seen = new Set()
  for (const item of items) {
    const id = getId(item)
    if (seen.has(id)) fail(`${label} id is duplicated: ${id}`)
    seen.add(id)
  }
  return seen
}

function validateSuiteToolRefs(suite, toolIds, label) {
  assert(Array.isArray(suite?.toolIds), `${label}.toolIds must be an array`)
  assert(Array.isArray(suite?.requiredToolIds), `${label}.requiredToolIds must be an array`)
  assert(Array.isArray(suite?.optionalToolIds), `${label}.optionalToolIds must be an array`)
  const declared = new Set(suite?.toolIds ?? [])
  const required = new Set(suite?.requiredToolIds ?? [])
  const optional = new Set(suite?.optionalToolIds ?? [])
  for (const toolId of declared) {
    assert(toolIds.has(toolId), `${label}.toolIds references unknown tool: ${toolId}`)
  }
  for (const toolId of required) {
    assert(toolIds.has(toolId), `${label}.requiredToolIds references unknown tool: ${toolId}`)
    assert(declared.has(toolId), `${label}.requiredToolIds must also appear in toolIds: ${toolId}`)
    assert(!optional.has(toolId), `${label}.${toolId} cannot be both required and optional`)
  }
  for (const toolId of optional) {
    assert(toolIds.has(toolId), `${label}.optionalToolIds references unknown tool: ${toolId}`)
    assert(declared.has(toolId), `${label}.optionalToolIds must also appear in toolIds: ${toolId}`)
  }
}

function validateEnvironmentTools(data) {
  assert(isObject(data), 'environment-tools root must be an object')
  assert(Number.isInteger(data?.schemaVersion) && data.schemaVersion >= 1, 'environment-tools schemaVersion must be a positive integer')
  assert(Array.isArray(data?.tools), 'environment-tools tools must be an array')
  assert(Array.isArray(data?.suites), 'environment-tools suites must be an array')

  const tools = Array.isArray(data?.tools) ? data.tools : []
  const suites = Array.isArray(data?.suites) ? data.suites : []
  const toolIds = assertUnique(tools, (tool) => tool?.id, 'tool')

  for (const tool of tools) {
    assertString(tool?.id, 'tool.id')
    assertString(tool?.name, `${tool?.id}.name`)
    assert(Array.isArray(tool?.commands) && tool.commands.length > 0, `${tool?.id}.commands must be a non-empty array`)
    assert(typeof tool?.wingetId === 'string', `${tool?.id}.wingetId must be a string`)
    assertBoolean(tool?.required, `${tool?.id}.required`)
    assertString(tool?.category, `${tool?.id}.category`)
    assertBoolean(tool?.needsAdmin, `${tool?.id}.needsAdmin`)
    assert(typeof tool?.notes === 'string', `${tool?.id}.notes must be a string`)

    for (const [index, command] of (tool.commands ?? []).entries()) {
      assertString(command?.command, `${tool.id}.commands[${index}].command`)
      assertString(command?.versionArg, `${tool.id}.commands[${index}].versionArg`)
    }

    if (tool.versionOptions !== undefined) {
      assert(Array.isArray(tool.versionOptions), `${tool.id}.versionOptions must be an array when present`)
      assertUnique(tool.versionOptions ?? [], (option) => option?.id, `${tool.id}.versionOptions`)
      for (const option of tool.versionOptions ?? []) {
        assertString(option?.id, `${tool.id}.versionOptions.id`)
        assertString(option?.label, `${tool.id}.versionOptions.label`)
        assertString(option?.wingetId, `${tool.id}.versionOptions.wingetId`)
      }
    }
  }

  assertUnique(suites, (suite) => suite?.id, 'suite')
  for (const suite of suites) {
    assertString(suite?.id, 'suite.id')
    assertString(suite?.name, `${suite?.id}.name`)
    assert(typeof suite?.description === 'string', `${suite?.id}.description must be a string`)
    assert(Array.isArray(suite?.toolIds), `${suite?.id}.toolIds must be an array`)
    for (const toolId of suite?.toolIds ?? []) assert(toolIds.has(toolId), `${suite.id}.toolIds references unknown tool: ${toolId}`)
  }
}

function validateScanRules(data) {
  assert(isObject(data), 'scan-rules root must be an object')
  assert(Number.isInteger(data?.schemaVersion) && data.schemaVersion >= 1, 'scan-rules schemaVersion must be a positive integer')
  assert(isObject(data?.riskModel), 'scan-rules riskModel must be an object')
  assert(isObject(data?.riskModel?.levels), 'scan-rules riskModel.levels must be an object')
  assert(isObject(data?.riskModel?.factors), 'scan-rules riskModel.factors must be an object')
  assert(isObject(data?.semanticGroups), 'scan-rules semanticGroups must be an object')
  assert(Array.isArray(data?.rules), 'scan-rules rules must be an array')

  const factors = new Set(Object.keys(data?.riskModel?.factors ?? {}))
  const rules = Array.isArray(data?.rules) ? data.rules : []
  const ruleIds = assertUnique(rules, (rule) => rule?.id, 'rule')

  for (const rule of rules) {
    assertString(rule?.id, 'rule.id')
    assertString(rule?.nameKey, `${rule?.id}.nameKey`)
    assertString(rule?.category, `${rule?.id}.category`)
    assert(Array.isArray(rule?.semantics), `${rule?.id}.semantics must be an array`)
    assert(Array.isArray(rule?.riskFactors), `${rule?.id}.riskFactors must be an array`)
    assert(isObject(rule?.pathByPlatform) && Object.keys(rule.pathByPlatform).length > 0, `${rule?.id}.pathByPlatform must be a non-empty object`)
    assert(Array.isArray(rule?.dependsOn), `${rule?.id}.dependsOn must be an array`)

    for (const factor of rule?.riskFactors ?? []) {
      assert(factors.has(factor), `${rule.id}.riskFactors references unknown factor: ${factor}`)
    }
    for (const dependency of rule?.dependsOn ?? []) {
      assert(ruleIds.has(dependency), `${rule.id}.dependsOn references unknown rule: ${dependency}`)
    }
  }
}

function validateInstallVersions(data) {
  if (!data) return
  assert(isObject(data), 'install-versions root must be an object')
  assert(Number.isInteger(data?.schemaVersion) && data.schemaVersion >= 1, 'install-versions schemaVersion must be a positive integer')
  assert(typeof data?.generatedAt === 'string', 'install-versions generatedAt must be a string')
  assert(typeof data?.status === 'string', 'install-versions status must be a string')
  assert(isObject(data?.summary), 'install-versions summary must be an object')
  assert(Array.isArray(data?.tools), 'install-versions tools must be an array')
  for (const tool of data?.tools ?? []) {
    assertString(tool?.id, 'install-versions tool.id')
    assertString(tool?.name, `${tool?.id}.name`)
    assertString(tool?.categoryId, `${tool?.id}.categoryId`)
    assert(Array.isArray(tool?.platforms), `${tool?.id}.platforms must be an array`)
    validateDescriptions(tool?.descriptions, `${tool?.id}.descriptions`)
    validateUsage(tool?.usage, `${tool?.id}.usage`)
    validateNotes(tool?.notes, `${tool?.id}.notes`)
    assert(isObject(tool?.detection), `${tool?.id}.detection must be an object`)
    validateVerify(tool?.verify, `${tool?.id}.verify`)
    validateQuality(tool?.quality, `${tool?.id}.quality`)
    assert(Array.isArray(tool?.sources), `${tool?.id}.sources must be an array`)
    for (const source of tool?.sources ?? []) {
      assertString(source?.id, `${tool.id}.sources.id`)
      assertString(source?.manager, `${tool.id}.sources.manager`)
      assertString(source?.packageId, `${tool.id}.sources.packageId`)
      assert(Array.isArray(source?.platforms), `${tool.id}.sources.platforms must be an array`)
      assert(isObject(source?.scan), `${tool.id}.sources.scan must be an object`)
      assert(isObject(source?.package), `${tool.id}.sources.package must be an object`)
      assert(isObject(source?.links), `${tool.id}.sources.links must be an object`)
      validateDescriptions(source?.descriptions, `${tool.id}.sources.${source?.id}.descriptions`)
      validateUsage(source?.usage, `${tool.id}.sources.${source?.id}.usage`)
      validateNotes(source?.notes, `${tool.id}.sources.${source?.id}.notes`)
      assert(Array.isArray(source?.versions), `${tool.id}.sources.versions must be an array`)
      assert(Array.isArray(source?.downloads), `${tool.id}.sources.downloads must be an array`)
      assert(Array.isArray(source?.commands), `${tool.id}.sources.commands must be an array`)
      validateQuality(source?.quality, `${tool.id}.sources.${source?.id}.quality`)
      validateVerify(source?.verify, `${tool.id}.sources.${source?.id}.verify`)
      for (const version of source?.versions ?? []) {
        assertString(version?.version, `${tool.id}.sources.versions.version`)
        assert(typeof version?.latest === 'boolean', `${tool.id}.sources.versions.latest must be boolean`)
      }
      for (const download of source?.downloads ?? []) {
        assertString(download?.id, `${tool.id}.sources.downloads.id`)
        assertString(download?.platform, `${tool.id}.sources.downloads.platform`)
        assert(typeof download?.url === 'string' || download?.url === null, `${tool.id}.sources.downloads.url must be string or null`)
        assertString(download?.urlType, `${tool.id}.sources.downloads.urlType`)
      }
      for (const command of source?.commands ?? []) {
        assertString(command?.action, `${tool.id}.sources.commands.action`)
        assertString(command?.manager, `${tool.id}.sources.commands.manager`)
        assertString(command?.platform, `${tool.id}.sources.commands.platform`)
        assertBoolean(command?.requiresAdmin, `${tool.id}.sources.commands.requiresAdmin`)
        assertBoolean(command?.supportsVersion, `${tool.id}.sources.commands.supportsVersion`)
        assertString(command?.shell, `${tool.id}.sources.commands.shell`)
        assert(Array.isArray(command?.command), `${tool.id}.sources.commands.command must be an array`)
        assert(Array.isArray(command?.template), `${tool.id}.sources.commands.template must be an array`)
        if (command?.supportsVersion) {
          assert(command.template?.includes('{{version}}'), `${tool.id}.sources.commands.template must include {{version}} when supportsVersion is true`)
        }
      }
    }
  }
}

function validateVerify(value, label) {
  assert(isObject(value), `${label} must be an object`)
  assert(Array.isArray(value?.commands), `${label}.commands must be an array`)
  for (const [index, command] of (value?.commands ?? []).entries()) {
    assertString(command?.command, `${label}.commands[${index}].command`)
    assert(Array.isArray(command?.args), `${label}.commands[${index}].args must be an array`)
    assertString(command?.expectedPattern, `${label}.commands[${index}].expectedPattern`)
  }
}

function validateSourcePolicy(data) {
  if (!data) return
  assert(isObject(data), 'source-policy root must be an object')
  assert(Number.isInteger(data?.schemaVersion) && data.schemaVersion >= 1, 'source-policy schemaVersion must be a positive integer')
  assert(typeof data?.generatedAt === 'string', 'source-policy generatedAt must be a string')
  assert(isObject(data?.platforms), 'source-policy platforms must be an object')
  for (const platform of ['windows', 'macos', 'linux']) {
    const policy = data?.platforms?.[platform]
    assert(isObject(policy), `source-policy.platforms.${platform} must be an object`)
    assert(Array.isArray(policy?.managerPriority) && policy.managerPriority.length > 0, `source-policy.platforms.${platform}.managerPriority must be a non-empty array`)
    assertNumber(policy?.minimumQualityScore, `source-policy.platforms.${platform}.minimumQualityScore`, { min: 0, max: 100 })
  }
  assert(isObject(data?.selection), 'source-policy selection must be an object')
  assert(isObject(data?.commandHandling), 'source-policy commandHandling must be an object')
}

function validateDelta(data) {
  if (!data) return
  assert(isObject(data), 'delta root must be an object')
  assert(Number.isInteger(data?.schemaVersion) && data.schemaVersion >= 1, 'delta schemaVersion must be a positive integer')
  assert(typeof data?.generatedAt === 'string', 'delta generatedAt must be a string')
  assert(isObject(data?.summary), 'delta summary must be an object')
  assert(isObject(data?.changes), 'delta changes must be an object')
  for (const key of ['addedTools', 'removedTools', 'changedTools', 'addedSources', 'removedSources', 'versionChanges', 'qualityChanges']) {
    assert(Array.isArray(data?.changes?.[key]), `delta.changes.${key} must be an array`)
  }
}

function validateIdentities(data, catalog) {
  if (!data) return
  assert(isObject(data), 'identities root must be an object')
  assert(Number.isInteger(data?.schemaVersion) && data.schemaVersion >= 1, 'identities schemaVersion must be a positive integer')
  assert(Array.isArray(data?.identities), 'identities.identities must be an array')
  const identityIds = assertUnique(data?.identities ?? [], (identity) => identity?.stableId, 'identity')
  for (const tool of catalog?.tools ?? []) {
    assert(identityIds.has(tool.id), `identities missing catalog tool: ${tool.id}`)
  }
  for (const identity of data?.identities ?? []) {
    assertString(identity?.stableId, 'identity.stableId')
    assertString(identity?.currentId, `${identity?.stableId}.currentId`)
    assertString(identity?.currentName, `${identity?.stableId}.currentName`)
    assert(Array.isArray(identity?.previousIds), `${identity?.stableId}.previousIds must be an array`)
    assert(Array.isArray(identity?.previousNames), `${identity?.stableId}.previousNames must be an array`)
    assert(isObject(identity?.packageAliases), `${identity?.stableId}.packageAliases must be an object`)
    assert(isObject(identity?.lifecycle), `${identity?.stableId}.lifecycle must be an object`)
    assertString(identity?.identityConfidence, `${identity?.stableId}.identityConfidence`)
  }
}

function sha256(content) {
  return crypto.createHash('sha256').update(content).digest('hex')
}

function validateSplitMetadata(index, installVersions) {
  if (!index) return
  assert(isObject(index), 'online index root must be an object')
  assert(Number.isInteger(index?.schemaVersion) && index.schemaVersion >= 1, 'online index schemaVersion must be a positive integer')
  assert(Array.isArray(index?.tools), 'online index tools must be an array')
  const toolIds = new Set((installVersions?.tools ?? []).map((tool) => tool.id))
  const indexIds = assertUnique(index?.tools ?? [], (tool) => tool?.id, 'online index tool')
  for (const toolId of toolIds) {
    assert(indexIds.has(toolId), `online index missing tool: ${toolId}`)
  }
  for (const entry of index?.tools ?? []) {
    assertString(entry?.id, 'online index tool.id')
    assertString(entry?.path, `${entry?.id}.path`)
    const fullPath = path.join(repoRoot, entry.path)
    assert(fs.existsSync(fullPath), `${entry.id}.path does not exist: ${entry.path}`)
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath)
      assert(content.length === entry.bytes, `${entry.id}.bytes does not match file size`)
      assert(sha256(content) === entry.sha256, `${entry.id}.sha256 does not match file content`)
      const toolFile = JSON.parse(content.toString('utf8'))
      assert(toolFile?.tool?.id === entry.id, `${entry.id}.tool file id mismatch`)
    }
  }
}

function validateCatalog(data) {
  assert(isObject(data), 'catalog root must be an object')
  assert(Number.isInteger(data?.schemaVersion) && data.schemaVersion >= 1, 'catalog schemaVersion must be a positive integer')
  assert(Array.isArray(data?.categories), 'catalog categories must be an array')
  assert(Array.isArray(data?.tools), 'catalog tools must be an array')
  assert(Array.isArray(data?.suites), 'catalog suites must be an array')
  const categoryIds = assertUnique(data?.categories ?? [], (category) => category?.id, 'catalog category')
  const toolIds = assertUnique(data?.tools ?? [], (tool) => tool?.id, 'catalog tool')
  for (const category of data?.categories ?? []) {
    assertString(category?.id, 'catalog category.id')
    assertString(category?.name, `${category?.id}.name`)
  }
  for (const tool of data?.tools ?? []) {
    assertString(tool?.id, 'catalog tool.id')
    assertString(tool?.name, `${tool?.id}.name`)
    assert(categoryIds.has(tool?.categoryId), `${tool?.id}.categoryId references unknown category`)
    assert(Array.isArray(tool?.platforms), `${tool?.id}.platforms must be an array`)
    assert(isObject(tool?.links), `${tool?.id}.links must be an object`)
    assert(isObject(tool?.detection), `${tool?.id}.detection must be an object`)
    assert(Array.isArray(tool?.sources), `${tool?.id}.sources must be an array`)
    assertUnique(tool?.sources ?? [], (source) => source?.id, `${tool?.id}.sources`)
    for (const source of tool?.sources ?? []) {
      assertString(source?.id, `${tool.id}.sources.id`)
      assertString(source?.manager, `${tool.id}.sources.manager`)
      assert(Array.isArray(source?.platforms), `${tool.id}.sources.platforms must be an array`)
      assertBoolean(source?.official, `${tool.id}.sources.official`)
      assert(Number.isInteger(source?.priority), `${tool.id}.sources.priority must be an integer`)
      assert(isObject(source?.capabilities), `${tool.id}.sources.capabilities must be an object`)
    }
  }
  for (const suite of data?.suites ?? []) {
    assertString(suite?.id, 'catalog suite.id')
    assertString(suite?.name, `${suite?.id}.name`)
    validateSuiteToolRefs(suite, toolIds, `catalog suite ${suite?.id}`)
  }
}

function validateToolRequests(data) {
  assert(isObject(data), 'tool-requests root must be an object')
  assert(Number.isInteger(data?.schemaVersion) && data.schemaVersion >= 1, 'tool-requests schemaVersion must be a positive integer')
  assert(Array.isArray(data?.requests), 'tool-requests requests must be an array')
}

validateEnvironmentTools(readJson('data/environment-tools.json'))
const catalogData = readJson('data/catalog-tools.json')
validateCatalog(catalogData)
validateIdentities(readJson('data/identities.json'), catalogData)
validateScanRules(readJson('data/scan-rules.json'))
validateToolRequests(readJson('data/tool-requests.json'))

const installVersionsPath = path.join(repoRoot, 'data/online/install-versions.json')
let installVersionsData = null
if (fs.existsSync(installVersionsPath)) {
  installVersionsData = readJson('data/online/install-versions.json')
  validateInstallVersions(installVersionsData)
}

const splitIndexPath = path.join(repoRoot, 'data/online/index.json')
if (fs.existsSync(splitIndexPath)) {
  validateSplitMetadata(readJson('data/online/index.json'), installVersionsData)
}

const sourcePolicyPath = path.join(repoRoot, 'data/online/source-policy.json')
if (fs.existsSync(sourcePolicyPath)) {
  validateSourcePolicy(readJson('data/online/source-policy.json'))
}

const deltaPath = path.join(repoRoot, 'data/online/delta.json')
if (fs.existsSync(deltaPath)) {
  validateDelta(readJson('data/online/delta.json'))
}

if (failures.length > 0) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'))
  process.exit(1)
}

console.log('Data validation passed.')
