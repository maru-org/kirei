import type { IScanner, ScanResult } from '../types'
import { readdir, stat } from 'node:fs/promises' // Import stat
import { homedir } from 'node:os'
import { join } from 'node:path'
import { ScanCategory } from '../types'
import { getPathSize } from '../utils'

export class UserCacheScanner implements IScanner {
  id = 'mac-user-cache'
  name = 'User Application Caches'
  category = ScanCategory.UserCache

  async scan(): Promise<ScanResult[]> {
    const home = homedir()
    // Target the root Caches directory
    const cacheRoot = join(home, 'Library/Caches')

    try {
      // Read all items in the directory
      const dirents = await readdir(cacheRoot, { withFileTypes: true })

      // Create an async task for each directory found
      const tasks: Promise<ScanResult | null>[] = dirents
        .filter((dirent) => {
          // 1. Must be a directory
          // 2. Exclude hidden folders (starting with .)
          return dirent.isDirectory() && !dirent.name.startsWith('.')
        })
        .map(async (dirent) => {
          const fullPath = join(cacheRoot, dirent.name)

          // Execute size calculation and stat (for time) in parallel
          // 为微信等大型应用设置更低的扫描深度
          const isLargeApp = ['com.tencent.xinWeChat', 'com.tencent.wechat'].includes(dirent.name)
          const scanDepth = isLargeApp ? 1 : 3
          
          const [size, stats] = await Promise.all([
            getPathSize(fullPath, scanDepth),
            stat(fullPath),
          ])

          // Only return valid results with size > 0
          if (size > 0) {
            return {
              path: fullPath,
              size,
              mtime: stats.mtime, // Capture modification time
              name: dirent.name,
              category: this.category,
              scannerId: this.id,
            } as ScanResult
          }
          return null
        })

      // Execute all tasks in parallel
      const results: (ScanResult | null)[] = await Promise.all(tasks)

      // Filter out nulls
      return results.filter((item): item is ScanResult => item !== null)
    }
    catch (error) {
      console.error(`Failed to scan user caches: ${error}`)
      return []
    }
  }
}
