import process from 'node:process'

export async function fetchText(url, { headers = {}, timeoutMs = 20_000 } = {}) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { headers, signal: controller.signal })
    const text = await response.text()
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}: ${text.slice(0, 220)}`)
    }
    return text
  } finally {
    clearTimeout(timeout)
  }
}

export async function fetchJson(url, options = {}) {
  const text = await fetchText(url, options)
  try {
    return JSON.parse(text)
  } catch (error) {
    throw new Error(`Invalid JSON from ${url}: ${error.message}`)
  }
}

export function githubHeaders() {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN
  return {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  }
}
