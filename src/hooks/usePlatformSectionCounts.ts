import { useState, useEffect, useCallback } from 'react'
import { db, supabase } from '../lib/supabase'

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
  const [error, setError] = useState<string | null>(null)

  const fetchCounts = useCallback(async () => {
    if (!platformId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Fetch counts for all sections in parallel
      const [
        addressingModesResult,
        instructionGroupsResult,
        vectorsResult,
        projectsResult,
      ] = await Promise.all([
        db.addressingModes.getByPlatform(platformId),
        db.instructionGroups.getByPlatform(platformId),
        db.vectors.getByPlatform(platformId),
        db.projects.getAll(),
      ])

      // Check for errors
      const results = [
        { name: 'addressingModes', result: addressingModesResult },
        { name: 'instructionGroups', result: instructionGroupsResult },
        { name: 'vectors', result: vectorsResult },
        { name: 'projects', result: projectsResult },
      ]

      const errorResult = results.find(r => r.result.error)
      if (errorResult) {
        throw new Error(`Failed to fetch ${errorResult.name}: ${errorResult.result.error?.message || 'Unknown error'}`)
      }

      // Count projects that use this platform
      const projectsCount = projectsResult.data?.filter(p => p.platformId === platformId).length || 0

      // Update counts
      setCounts({
        addressingModes: addressingModesResult.data?.length || 0,
        instructionSet: instructionGroupsResult.data?.length || 0,
        vectors: vectorsResult.data?.length || 0,
        projects: projectsCount,
      })
    } catch (err) {
      console.error('Error fetching platform section counts:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch platform section counts')
    } finally {
      setLoading(false)
    }
  }, [platformId])

  // Initial fetch
  useEffect(() => {
    fetchCounts()
  }, [fetchCounts])

  // Real-time subscriptions for platform-related tables
  useEffect(() => {
    if (!platformId) return

    const addressingModesChannel = supabase
      .channel(`addressing-modes-counts-${platformId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'AddressingMode',
          filter: `platformId=eq.${platformId}`
        },
        () => {
          // Refetch counts when addressing modes change
          fetchCounts()
        }
      )
      .subscribe()

    const instructionGroupsChannel = supabase
      .channel(`instruction-groups-counts-${platformId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'InstructionGroup',
          filter: `platformId=eq.${platformId}`
        },
        () => {
          // Refetch counts when instruction groups change
          fetchCounts()
        }
      )
      .subscribe()

    const vectorsChannel = supabase
      .channel(`vectors-counts-${platformId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'Vector',
          filter: `platformId=eq.${platformId}`
        },
        () => {
          // Refetch counts when vectors change
          fetchCounts()
        }
      )
      .subscribe()

    const projectsChannel = supabase
      .channel(`projects-counts-${platformId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ScribeProject',
          filter: `platformId=eq.${platformId}`
        },
        () => {
          // Refetch counts when projects change
          fetchCounts()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(addressingModesChannel)
      supabase.removeChannel(instructionGroupsChannel)
      supabase.removeChannel(vectorsChannel)
      supabase.removeChannel(projectsChannel)
    }
  }, [platformId, fetchCounts])

  return { counts, loading, error }
}
