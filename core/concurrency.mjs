export async function runPool(items, worker, { maxConcurrency = 8 } = {}) {
  const results = new Array(items.length)
  let nextIndex = 0

  async function runWorker() {
    while (nextIndex < items.length) {
      const index = nextIndex
      nextIndex += 1
      try {
        results[index] = { status: 'fulfilled', value: await worker(items[index], index) }
      } catch (error) {
        results[index] = { status: 'rejected', reason: error }
      }
    }
  }

  const workers = Array.from({ length: Math.min(maxConcurrency, items.length) }, () => runWorker())
  await Promise.allSettled(workers)
  return results
}

