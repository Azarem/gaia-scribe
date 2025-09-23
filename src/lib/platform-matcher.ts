/**
 * Platform Matcher - Service for finding platforms based on platformBranchId
 *
 * This service enforces strict platform relationships where each GameRomBranch
 * can only be imported using its corresponding pre-imported Platform.
 */

import { db } from './supabase'
import { logger } from './logger'
import type { Platform } from '@prisma/client'

/**
 * Platform matching result
 */
export interface PlatformMatchResult {
  success: boolean
  platform?: Platform
  error?: string
}

/**
 * Find all platforms by platformBranchId (returns all matching platforms)
 *
 * @param platformBranchId - Platform branch ID from external GameRomBranch
 * @returns Promise<{ success: boolean; platforms: Platform[]; error?: string }>
 */
export async function findAllPlatformsByBranchId(
  platformBranchId: string
): Promise<{ success: boolean; platforms: Platform[]; error?: string }> {
  try {
    logger.platform.loading('Finding all platforms by platformBranchId', {
      platformBranchId
    })

    // Find all platforms with matching platformBranchId
    const { data: platforms, error: searchError } = await db.platforms.getAll()

    if (searchError) {
      logger.platform.error('searching platforms by platformBranchId', searchError)
      return {
        success: false,
        platforms: [],
        error: 'Failed to search platforms'
      }
    }

    // Look for all platforms that have the matching platformBranchId
    const matchingPlatforms = platforms?.filter(platform =>
      platform.platformBranchId === platformBranchId
    ) || []

    // Sort by most recently updated/created first
    matchingPlatforms.sort((a, b) => {
      const aDate = new Date(a.updatedAt || a.createdAt)
      const bDate = new Date(b.updatedAt || b.createdAt)
      return bDate.getTime() - aDate.getTime()
    })

    logger.platform.loading('Found platforms by platformBranchId', {
      count: matchingPlatforms.length,
      platformNames: matchingPlatforms.map(p => p.name)
    })

    return {
      success: true,
      platforms: matchingPlatforms
    }
  } catch (err) {
    logger.platform.error('finding platforms by platformBranchId', err)
    return {
      success: false,
      platforms: [],
      error: 'Failed to find platforms'
    }
  }
}

/**
 * Find a platform by platformBranchId (strict matching - returns first match for backward compatibility)
 *
 * @param platformBranchId - Platform branch ID from external GameRomBranch
 * @returns Promise<PlatformMatchResult>
 */
export async function findPlatformByBranchId(
  platformBranchId: string
): Promise<PlatformMatchResult> {
  try {
    const result = await findAllPlatformsByBranchId(platformBranchId)

    if (!result.success) {
      return {
        success: false,
        error: result.error
      }
    }

    const matchingPlatform = result.platforms[0] // Get the most recent one

    if (matchingPlatform) {
      logger.platform.loading('Found platform by platformBranchId', {
        platformId: matchingPlatform.id,
        platformName: matchingPlatform.name
      })
      return {
        success: true,
        platform: matchingPlatform
      }
    }

    // No matching platform found
    logger.platform.error('No platform found for platformBranchId', { platformBranchId })
    return {
      success: false,
      error: `No platform found with platformBranchId: ${platformBranchId}. The required platform must be imported first.`
    }

  } catch (error) {
    logger.platform.error('finding platform by platformBranchId', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Get available platforms for selection, optionally filtered by platformBranchId
 *
 * @param userId - User ID to get user's platforms
 * @param requiredPlatformBranchId - Optional platformBranchId to filter by
 * @returns Promise with platforms list
 */
export async function getAvailablePlatforms(userId: string, requiredPlatformBranchId?: string) {
  try {
    // Get user's platforms and public platforms
    const [userPlatforms, publicPlatforms] = await Promise.all([
      db.platforms.getByUser(userId),
      db.platforms.getPublic()
    ])

    if (userPlatforms.error) {
      logger.platform.error('getting user platforms', userPlatforms.error)
      return { data: [], error: userPlatforms.error }
    }

    if (publicPlatforms.error) {
      logger.platform.error('getting public platforms', publicPlatforms.error)
      return { data: userPlatforms.data || [], error: null }
    }

    // Combine and deduplicate platforms
    const allPlatforms = [
      ...(userPlatforms.data || []),
      ...(publicPlatforms.data || [])
    ]

    // Remove duplicates by ID
    let uniquePlatforms = allPlatforms.filter((platform, index, array) =>
      array.findIndex(p => p.id === platform.id) === index
    )

    // Filter by platformBranchId if required
    if (requiredPlatformBranchId) {
      uniquePlatforms = uniquePlatforms.filter(platform =>
        platform.platformBranchId === requiredPlatformBranchId
      )
    }

    return { data: uniquePlatforms, error: null }

  } catch (error) {
    logger.platform.error('getting available platforms', error)
    return { 
      data: [], 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}


