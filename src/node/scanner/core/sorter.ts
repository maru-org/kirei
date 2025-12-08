import type { ScanResult } from '../types'
import { SortStrategy } from '../types'

/**
 * Type definition for a comparison function.
 */
type Comparator = (a: ScanResult, b: ScanResult) => number

/**
 * Strategy Registry.
 * To add a new strategy, just add the Enum in types.ts and the logic here.
 */
const strategies: Record<SortStrategy, Comparator> = {
  // Sort by Size (Largest first by default usually, but logic here is standard ascending/descending base)
  [SortStrategy.Size]: (a, b) => a.size - b.size,

  // Sort by Time (Oldest first: smaller timestamp -> larger timestamp)
  [SortStrategy.Time]: (a, b) => a.mtime.getTime() - b.mtime.getTime(),

  // Sort by Name (Alphabetical)
  [SortStrategy.Name]: (a, b) => a.name.localeCompare(b.name),
}

/**
 * Helper map to convert CLI string arguments to Enum.
 */
export const SortStrategyMap: Record<string, SortStrategy> = {
  size: SortStrategy.Size,
  time: SortStrategy.Time,
  name: SortStrategy.Name,
}

/**
 * Applies the selected sorting strategy to the results.
 *
 * @param results The array of ScanResult to sort
 * @param strategy The enum value of the strategy
 * @param reverse Whether to reverse the default order
 */
export function applySort(
  results: ScanResult[],
  strategy: SortStrategy,
  reverse: boolean = false,
): ScanResult[] {
  const comparator = strategies[strategy]

  if (!comparator) {
    console.warn(`Unknown sort strategy: ${strategy}, falling back to Size.`)
    return applySort(results, SortStrategy.Size, reverse)
  }

  // Create a shallow copy to avoid mutating the original array unexpectedly
  const sorted = [...results].sort(comparator)

  return reverse ? sorted.reverse() : sorted
}
