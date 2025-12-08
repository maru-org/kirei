import { ScannerManager } from './core'
import { AllScanners } from './modules'

export const scannerManager = new ScannerManager()

/**
 * Automatically register all scanners exported in the modules index.
 */
AllScanners.forEach((ScannerClass) => {
  scannerManager.register(new ScannerClass())
})

export * from './runner'
export * from './types'
