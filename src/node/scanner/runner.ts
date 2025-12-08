import type { ScanOptions } from './types'
import process from 'node:process'
import * as p from '@clack/prompts'
import c from 'ansis'
import { scannerManager } from './index'
import { ScannerBrowser } from './tui'
import { DeleteMode } from './types'

function formatSize(bytes: number): string {
  const mb = bytes / 1024 / 1024
  if (mb > 1024)
    return `${(mb / 1024).toFixed(2)} GB`
  return `${mb.toFixed(2)} MB`
}

export async function runScannerAction(options: ScanOptions): Promise<void> {
  if (!options.scan)
    return

  p.intro(c.cyan`🔍 System Scanner`)

  const browser = new ScannerBrowser(scannerManager)

  p.log.message(c.dim`Entering interactive browser...`)
  await new Promise(r => setTimeout(r, 500))

  const itemsToDelete: any[] = [] // Define outside loop

  // Loop until user confirms deletion or exits
  while (true) {
    // 1. Enter TUI Mode
    // The process will wait here until user presses 's'
    const itemsToDelete = await browser.start()

    // 2. TUI Exited -> Clack Mode
    console.clear() // Remove TUI artifacts
    p.intro(c.cyan`🗑️ Cleanup Confirmation`)

    if (itemsToDelete.length === 0) {
      p.outro(c.yellow`No items selected. Exiting.`)
      process.exit(0)
    }

    // 3. Show Summary
    const totalSize = itemsToDelete.reduce((acc, i) => acc + i.size, 0)
    const listStr = itemsToDelete
      .map(i => `${c.red('×')} ${i.name} ${c.dim(formatSize(i.size))}`)
      .join('\n')

    p.note(listStr, `Selected ${itemsToDelete.length} items (${formatSize(totalSize)})`)

    // 4. Confirm Logic
    const confirm = await p.confirm({
      message: c.bold`Permanently delete these items?`,
      initialValue: false,
    })

    if (p.isCancel(confirm)) {
      p.outro(c.yellow`Operation cancelled.`)
      process.exit(0)
    }

    if (confirm) {
      // User Confirmed: Execute Delete and Break Loop
      const spinner = p.spinner()
      spinner.start('Cleaning...')

      const deleteMode = options.mode === 'hard' ? DeleteMode.Hard : DeleteMode.Soft
      const { successCount, failCount } = await scannerManager.clean(itemsToDelete, deleteMode)

      spinner.stop('Done.')

      p.outro(c.green`✔ Cleanup complete: ${successCount} removed, ${failCount} failed.`)
      process.exit(0)
    }
    else {
      // User Selected "No": Loop back to TUI
      p.log.info(c.cyan`Returning to selection...`)
      // Small delay for UX
      await new Promise(r => setTimeout(r, 800))
    }
  }
}
