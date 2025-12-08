import type { IScanner } from '../types'
import { LogScanner } from './logs'
import { UserCacheScanner } from './user-cache'

export * from './logs'
export * from './user-cache'

/**
 * A list of all available scanner classes.
 * Used for auto-registration in the manager.
 */
export const AllScanners: (new () => IScanner)[] = [
  UserCacheScanner,
  LogScanner,
]
