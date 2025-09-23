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
 * Find a platform by platformBranchId (strict matching)
 *
 * @param platformBranchId - Platform branch ID from external GameRomBranch
 * @returns Promise<PlatformMatchResult>
 */
export async function findPlatformByBranchId(
  platformBranchId: string
): Promise<PlatformMatchResult> {
  try {
    logger.platform.loading('Finding platform by platformBranchId', {
      platformBranchId
    })

    // Find platform with matching platformBranchId
    const { data: platforms, error: searchError } = await db.platforms.getAll()

    if (searchError) {
      logger.platform.error('searching platforms by platformBranchId', searchError)
      return {
        success: false,
        error: 'Failed to search platforms'
      }
    }

    // Look for a platform that has the matching platformBranchId
    const matchingPlatform = platforms?.find(platform =>
      platform.platformBranchId === platformBranchId
    )

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


