import type { ScanOptions, ScanResult } from './types'
import process from 'node:process'
import * as p from '@clack/prompts' // Interactive UI library
import c from 'ansis'
import { applySort, SortStrategyMap } from './core/sorter'
import { scannerManager } from './index'
import { DeleteMode, ScanCategory, SortStrategy } from './types'

/**
 * Helper to format bytes to MB/GB
 */
function formatSize(bytes: number): string {
  const mb = bytes / 1024 / 1024
  if (mb > 1024) {
    return `${(mb / 1024).toFixed(2)} GB`
  }
  return `${mb.toFixed(2)} MB`
}

/**
 * Helper to format date to a readable string
 */
function formatTime(date: Date): string {
  return date.toLocaleDateString()
}

/**
 * Handles the scanning and cleaning workflow based on CLI options.
 * Returns true if the process should exit after scanning.
 */
export async function runScannerAction(options: ScanOptions): Promise<void> {
  if (!options.scan) {
    return
  }

  // Start the interactive CLI session
  p.intro(c.cyan`🔍 System Scanner`)

  // Define what to scan (could be dynamic based on options in the future)
  const categoriesToScan = [
    ScanCategory.UserCache,
    ScanCategory.SystemLog,
  ]

  const spinner = p.spinner()
  spinner.start('Scanning directories...')

  // Execute the scan
  const rawResults = await scannerManager.runScan(categoriesToScan)

  spinner.stop(`Scan complete. Found ${rawResults.length} items.`)

  if (rawResults.length === 0) {
    p.note(c.green`✔ Your system is clean!`)
    return
  }

  // ---------------------------------------------------------
  // 1. Sort Logic (Strategy Pattern)
  // ---------------------------------------------------------

  // Parse sort strategy from CLI args (default to 'size')
  const sortInput = options.sort?.toLowerCase() || 'size'
  const strategy = SortStrategyMap[sortInput] ?? SortStrategy.Size

  // Determine if we should reverse the sort
  // Default behavior: Size -> Descending (Big first), Time -> Ascending (Old first)
  let reverse = options.reverse || false

  // If sorting by size and user didn't specify reverse, we force reverse (Big first)
  if (strategy === SortStrategy.Size && !options.reverse) {
    reverse = true
  }

  const results = applySort(rawResults, strategy, reverse)

  // ---------------------------------------------------------
  // 2. Display Results
  // ---------------------------------------------------------
  const totalSize = results.reduce((acc, r) => acc + r.size, 0)

  p.note(
    `Total Junk: ${c.yellow(formatSize(totalSize))}\n`
    + `Sorted By: ${c.bold(sortInput)}`,
  )

  // Show top 10 items for quick preview
  console.log(c.dim`Top items found:`)
  const previewLimit = 10
  results.slice(0, previewLimit).forEach((r, i) => {
    console.log(
      ` ${c.gray(`${i + 1}.`)} `
      + `${c.bold(r.name.padEnd(30))} `
      + `| ${c.cyan(formatSize(r.size).padEnd(10))} `
      + `| ${c.dim(formatTime(r.mtime))}`,
    )
  })

  if (results.length > previewLimit) {
    console.log(c.dim`...and ${results.length - previewLimit} more items.`)
  }
  console.log('') // Spacer

  // ---------------------------------------------------------
  // 3. Clean Logic (Interactive)
  // ---------------------------------------------------------
  if (options.clean) {
    const deleteMode = options.mode === 'hard' ? DeleteMode.Hard : DeleteMode.Soft

    // Interactive Multi-Select
    const selectedPaths = await p.multiselect({
      message: `Select items to delete (${deleteMode} mode):`,
      options: results.map(r => ({
        value: r,
        label: `${r.name} (${formatSize(r.size)})`,
        hint: `${formatTime(r.mtime)} - ${r.path}`,
      })),
      required: false,
    }) as ScanResult[] | symbol

    // Handle cancellation (Ctrl+C)
    if (p.isCancel(selectedPaths)) {
      p.cancel('Operation cancelled.')
      process.exit(0)
    }

    const itemsToDelete = Array.isArray(selectedPaths) ? selectedPaths : []

    if (itemsToDelete.length > 0) {
      const deleteTotal = itemsToDelete.reduce((acc, i) => acc + i.size, 0)

      const confirm = await p.confirm({
        message: `Confirm deleting ${itemsToDelete.length} items (${formatSize(deleteTotal)})?`,
      })

      if (confirm && !p.isCancel(confirm)) {
        p.log.message(c.magenta`\n🧹 Cleaning...`)

        const { successCount, failCount } = await scannerManager.clean(itemsToDelete, deleteMode)

        p.outro(c.green`✔ Cleanup complete: ${successCount} removed, ${failCount} failed.`)
      }
      else {
        p.outro(c.yellow`Cleanup cancelled.`)
      }
    }
    else {
      p.outro(c.yellow`No items selected.`)
    }

    process.exit(0)
  }
  p.outro(c.green`✔ Scan complete. No cleanup executed.`)
}
