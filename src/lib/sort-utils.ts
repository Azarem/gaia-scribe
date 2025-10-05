/**
 * Sorting utilities for game data structures
 */

import type { BlockPart } from '@prisma/client'

/**
 * Sort BlockParts by index (primary) and location (secondary)
 * 
 * Sorting logic:
 * - Primary sort: by `index` field (defaults to 0 if null/undefined)
 * - Secondary sort: by `location` field (when index values are equal)
 * 
 * @param parts - Array of BlockPart objects to sort
 * @returns Sorted array (does not mutate original)
 * 
 * @example
 * const sorted = sortBlockParts(parts)
 * 
 * @example
 * // In-place sorting
 * parts.sort(blockPartComparator)
 */
export function sortBlockParts(parts: BlockPart[]): BlockPart[] {
  return [...parts].sort(blockPartComparator)
}

/**
 * Comparator function for sorting BlockParts
 * Can be used directly with Array.sort()
 * 
 * @param a - First BlockPart to compare
 * @param b - Second BlockPart to compare
 * @returns Negative if a < b, positive if a > b, zero if equal
 * 
 * @example
 * parts.sort(blockPartComparator)
 */
export function blockPartComparator(a: BlockPart, b: BlockPart): number {
  const orderA = a.index ?? 0
  const orderB = b.index ?? 0
  if (orderA !== orderB) {
    return orderA - orderB
  }
  return a.location - b.location
}

/**
 * Sort an array of BlockParts in-place
 * Mutates the original array
 * 
 * @param parts - Array of BlockPart objects to sort in-place
 * @returns The same array (sorted)
 * 
 * @example
 * sortBlockPartsInPlace(parts)
 */
export function sortBlockPartsInPlace(parts: BlockPart[]): BlockPart[] {
  return parts.sort(blockPartComparator)
}

