/**
 * Categories for different types of junk files.
 * Used to filter what to scan.
 */
export enum ScanCategory {
  UserCache, // 0: General application caches
  SystemLog, // 1: System and app logs
  AppResidue, // 2: Leftovers from uninstalled apps
  Developer, // 3: Node_modules, Xcode derived data, etc.
  Downloads, // 4: User downloads folder
}

/**
 * Sorting strategies available for scan results.
 * Uses numeric enum for better performance and type safety.
 */
export enum SortStrategy {
  Size, // 0: Sort by file size
  Time, // 1: Sort by modification time
  Name, // 2: Sort alphabetically by name
}

/**
 * Deletion strategy.
 */
export enum DeleteMode {
  Soft, // 0: Move to Trash (Safe)
  Hard, // 1: fs.rm (Permanent)
}

/**
 * Standard result object returned by any scanner.
 */
export interface ScanResult {
  /** Absolute path to the file or directory */
  path: string

  /** Size in bytes */
  size: number

  /** Modification time used for sorting */
  mtime: Date

  /** Human readable name (e.g., "Chrome Cache") */
  name: string

  /** The category this item belongs to */
  category: ScanCategory

  /** ID of the scanner that found this item */
  scannerId: string
}

/**
 * Interface that all modular plugins must implement.
 */
export interface IScanner {
  /** Unique identifier for the scanner module */
  id: string

  /** Human readable name of the scanner */
  name: string

  /** The category this scanner belongs to */
  category: ScanCategory

  /**
   * Main execution method.
   * Should return a list of found junk items.
   */
  scan: () => Promise<ScanResult[]>
}

/**
 * Interface for CLI arguments related to scanning.
 */
export interface ScanOptions {
  scan: boolean
  mode: string

  // CLI inputs are usually strings, we will parse them later
  sort?: string
  reverse?: boolean
}
