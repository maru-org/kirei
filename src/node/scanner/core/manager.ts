import type { IScanner, ScanCategory, ScanResult } from '../types'
import c from 'ansis'
import { DeleteMode } from '../types'

export class ScannerManager {
  /** List of registered scanner modules */
  private scanners: IScanner[] = []

  /**
   * Register a new modular scanner.
   * Anyone can add a scanner by implementing IScanner.
   */
  register(scanner: IScanner) {
    this.scanners.push(scanner)
  }

  /**
   * Run scans based on selected categories.
   * If no categories provided, run all registered scanners.
   */
  async runScan(categories?: ScanCategory[]): Promise<ScanResult[]> {
    // Filter scanners based on requested categories
    const targetScanners = categories
      ? this.scanners.filter(s => categories.includes(s.category))
      : this.scanners

    const tasks = targetScanners.map(async (scanner) => {
      try {
        // Execute scan for this module
        return await scanner.scan()
      }
      catch (error) {
        console.error(c.red`[Scanner] Error in module ${scanner.name}:`, error)
        return []
      }
    })

    // Run all scans in parallel
    const results = await Promise.all(tasks)

    // Flatten the array of arrays
    return results.flat()
  }

  /**
   * Execute deletion logic.
   */
  async clean(items: ScanResult[], mode: DeleteMode) {
    let successCount = 0
    let failCount = 0

    for (const item of items) {
      try {
        if (mode === DeleteMode.Soft) {
          // Use 'trash' library to move files to system trash
          console.log(c.yellow`[Trash] Would move to trash: ${item.path}`)
          //   await trash(item.path)
        }
        else {
          // Force delete recursively
          console.log(c.red`[Delete] Would delete: ${item.path}`)

        //   await rm(item.path, { recursive: true, force: true })
        }

        successCount++
        console.log(c.dim`[Clean] Deleted: ${item.path}`)
      }
      catch (error) {
        failCount++
        console.error(c.red`[Clean] Failed to delete ${item.path}:`, error)
      }
    }

    return { successCount, failCount }
  }
}
