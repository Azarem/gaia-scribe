import { useState, useEffect } from 'react'
import { db } from '../lib/supabase'

interface PlatformSectionCounts {
  addressingModes: number
  instructionSet: number
  vectors: number
  projects: number
}

export function usePlatformSectionCounts(platformId: string | undefined) {
  const [counts, setCounts] = useState<PlatformSectionCounts>({
    addressingModes: 0,
    instructionSet: 0,
    vectors: 0,
    projects: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!platformId) {
      setLoading(false)
      return
    }

    const loadCounts = async () => {
      try {
        setLoading(true)

        // Get platform data to extract counts from meta
        const { data: platform, error: platformError } = await db.platforms.getById(platformId)

        if (platformError || !platform) {
          console.error('Error loading platform for counts:', platformError)
          return
        }

        // Extract counts from platform meta data
        let addressingModesCount = 0
        let instructionSetCount = 0
        let vectorsCount = 0

        if (platform.meta) {
          // Count addressing modes
          if (Array.isArray(platform.meta.addressingModes)) {
            addressingModesCount = platform.meta.addressingModes.length
          }

          // Count instruction set items
          if (Array.isArray(platform.meta.instructionSet)) {
            instructionSetCount = platform.meta.instructionSet.length
          }

          // Count vectors
          if (Array.isArray(platform.meta.vectors)) {
            vectorsCount = platform.meta.vectors.length
          }
        }

        // Count projects that use this platform
        const { data: projects } = await db.projects.getAll()
        const projectsCount = projects?.filter(p => p.meta?.platformId === platformId).length || 0

        setCounts({
          addressingModes: addressingModesCount,
          instructionSet: instructionSetCount,
          vectors: vectorsCount,
          projects: projectsCount
        })

      } catch (error) {
        console.error('Error loading platform section counts:', error)
        // Keep default counts on error
      } finally {
        setLoading(false)
      }
    }

    loadCounts()
  }, [platformId])

  return { counts, loading }
}
