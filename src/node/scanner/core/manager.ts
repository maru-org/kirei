import type { IScanner, ScanCategory, ScanResult } from '../types'
import { rm } from 'node:fs/promises'
import c from 'ansis'
import trash from 'trash'
import { DeleteMode } from '../types'

export class ScannerManager {
  private scanners: IScanner[] = []

  /**
   * Register a scanner module.
   */
  register(scanner: IScanner) {
    this.scanners.push(scanner)
  }

  /**
   * Public getter to access registered scanners (used as root nodes in TUI).
   */
  getScanners(): IScanner[] {
    return this.scanners
  }

  /**
   * Run scan for a SPECIFIC scanner instance.
   * Used for lazy loading in the interactive browser.
   */
  async runSpecificScan(scanner: IScanner): Promise<ScanResult[]> {
    try {
      return await scanner.scan()
    }
    catch (error) {
      console.error(c.red`Error scanning ${scanner.name}:`, error)
      return []
    }
  }

  /**
   * Batch run scans (Original logic, kept for non-interactive mode).
   */
  async runScan(categories?: ScanCategory[]): Promise<ScanResult[]> {
    const targetScanners = categories
      ? this.scanners.filter(s => categories.includes(s.category))
      : this.scanners

    const tasks = targetScanners.map(s => this.runSpecificScan(s))
    const results = await Promise.all(tasks)
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
          await trash(item.path)
        }
        else {
          await rm(item.path, { recursive: true, force: true })
        }
        successCount++
      }
      catch {
        failCount++
      }
    }

    return { successCount, failCount }
  }
}
