import type { IScanner, ScanResult } from '../types'
import { stat } from 'node:fs/promises' // Import stat
import { homedir } from 'node:os'
import { join } from 'node:path'
import { ScanCategory } from '../types'
import { getPathSize } from '../utils'

export class LogScanner implements IScanner {
  id = 'user-log-scanner'
  name = 'User Logs'
  category = ScanCategory.SystemLog

  async scan(): Promise<ScanResult[]> {
    const logDir = join(homedir(), 'Library/Logs')
    try {
      // Parallel fetch size and stats
      const [size, stats] = await Promise.all([
        getPathSize(logDir),
        stat(logDir),
      ])

      if (size === 0)
        return []

      return [{
        path: logDir,
        size,
        mtime: stats.mtime, // Capture modification time
        name: 'User Logs Directory',
        scannerId: this.id,
        category: this.category,
      }]
    }
    catch {
      return []
    }
  }
}
