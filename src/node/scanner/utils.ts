import { readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'

/**
 * Recursively calculates the size of a directory or file.
 * Returns 0 if access is denied or path does not exist.
 */
export async function getPathSize(path: string): Promise<number> {
  try {
    const stats = await stat(path)

    if (!stats.isDirectory()) {
      return stats.size
    }

    const files = await readdir(path)
    const sizes = await Promise.all(
      files.map(file => getPathSize(join(path, file))),
    )

    return sizes.reduce((acc, curr) => acc + curr, 0)
  }
  catch {
    // Return 0 for permission errors or non-existent files
    return 0
  }
}
