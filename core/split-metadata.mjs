import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

function hashContent(content) {
  return crypto.createHash('sha256').update(content).digest('hex')
}

function safeToolFile(toolId) {
  return `${toolId.replace(/[^a-z0-9_.-]+/gi, '-')}.json`
}

export function writeSplitMetadata(output, { onlineDir }) {
  const toolsDir = path.join(onlineDir, 'tools')
  fs.mkdirSync(toolsDir, { recursive: true })

  const currentFiles = new Set()
  const toolEntries = output.tools.map((tool) => {
    const fileName = safeToolFile(tool.id)
    const relativePath = `data/online/tools/${fileName}`
    const fullPath = path.join(toolsDir, fileName)
    const content = `${JSON.stringify({
      schemaVersion: output.schemaVersion,
      generatedAt: output.generatedAt,
      status: output.status,
      tool
    }, null, 2)}\n`
    fs.writeFileSync(fullPath, content)
    currentFiles.add(fileName)

    return {
      id: tool.id,
      name: tool.name,
      categoryId: tool.categoryId,
      platforms: tool.platforms,
      sourceCount: tool.sources.length,
      bestQualityScore: tool.quality?.score ?? 0,
      path: relativePath,
      bytes: Buffer.byteLength(content),
      sha256: hashContent(content)
    }
  })

  for (const file of fs.readdirSync(toolsDir)) {
    if (file.endsWith('.json') && !currentFiles.has(file)) {
      fs.unlinkSync(path.join(toolsDir, file))
    }
  }

  const index = {
    schemaVersion: 1,
    generatedAt: output.generatedAt,
    status: output.status,
    purpose: 'Split online tool metadata index for DevEnv Manager.',
    summary: {
      totalTools: toolEntries.length,
      totalPackageSources: output.summary.totalPackageSources,
      totalScannedSources: output.summary.totalScannedSources
    },
    tools: toolEntries
  }
  const indexPath = path.join(onlineDir, 'index.json')
  fs.writeFileSync(indexPath, `${JSON.stringify(index, null, 2)}\n`)
  return index
}
