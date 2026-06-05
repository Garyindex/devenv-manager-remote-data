import fs from 'node:fs'
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

function assertUnique(items, getId, label) {
  const seen = new Set()
  for (const item of items) {
    const id = getId(item)
    if (seen.has(id)) fail(`${label} id is duplicated: ${id}`)
    seen.add(id)
  }
  return seen
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
    for (const toolId of suite?.toolIds ?? []) {
      assert(toolIds.has(toolId), `${suite.id}.toolIds references unknown tool: ${toolId}`)
    }
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
  assert(typeof data?.source === 'string', 'install-versions source must be a string')
  assert(typeof data?.status === 'string', 'install-versions status must be a string')
  assert(Array.isArray(data?.tools), 'install-versions tools must be an array')
  for (const tool of data?.tools ?? []) {
    assertString(tool?.toolId, 'install-versions toolId')
    assertString(tool?.name, `${tool?.toolId}.name`)
    assertString(tool?.packageId, `${tool?.toolId}.packageId`)
    assert(Array.isArray(tool?.availableVersions), `${tool?.toolId}.availableVersions must be an array`)
    assert(Array.isArray(tool?.installCommands), `${tool?.toolId}.installCommands must be an array`)
  }
}

validateEnvironmentTools(readJson('data/environment-tools.json'))
validateScanRules(readJson('data/scan-rules.json'))

const installVersionsPath = path.join(repoRoot, 'data/online/install-versions.json')
if (fs.existsSync(installVersionsPath)) {
  validateInstallVersions(readJson('data/online/install-versions.json'))
}

if (failures.length > 0) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'))
  process.exit(1)
}

console.log('Data validation passed.')

