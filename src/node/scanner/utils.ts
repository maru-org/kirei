import { readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'

/**
 * Recursively calculates the size of a directory or file.
 * Returns 0 if access is denied or path does not exist.
 */
export async function getPathSize(path: string, maxDepth = 3, currentDepth = 0): Promise<number> {
  try {
    const stats = await stat(path)

    if (!stats.isDirectory()) {
      return stats.size
    }
    
    // 如果达到最大深度，只计算目录本身的大小，不再递归
    if (currentDepth >= maxDepth) {
      return stats.size
    }

    const files = await readdir(path)
    const sizes = await Promise.all(
      files.map(file => getPathSize(join(path, file), maxDepth, currentDepth + 1)),
    )

    return sizes.reduce((acc, curr) => acc + curr, 0)
  }
  catch {
    // Return 0 for permission errors or non-existent files
    return 0
  }
}
