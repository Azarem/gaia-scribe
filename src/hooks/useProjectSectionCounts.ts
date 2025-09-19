import { useState, useEffect } from 'react'
import { db } from '../lib/supabase'

export interface SectionCounts {
  files: number
  blocks: number
  cops: number
  strings: number
  structs: number
  labels: number
  rewrites: number
  mnemonics: number
  overrides: number
}

export function useProjectSectionCounts(projectId: string | undefined) {
  const [counts, setCounts] = useState<SectionCounts>({
    files: 0,
    blocks: 0,
    cops: 0,
    strings: 0,
    structs: 0,
    labels: 0,
    rewrites: 0,
    mnemonics: 0,
    overrides: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!projectId) {
      setLoading(false)
      return
    }

    const fetchCounts = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch counts for all sections in parallel
        const [
          filesResult,
          blocksResult,
          copsResult,
          stringsResult,
          structsResult,
          labelsResult,
          rewritesResult,
          mnemonicsResult,
          overridesResult,
        ] = await Promise.all([
          db.files.getByProject(projectId),
          db.blocks.getByProject(projectId),
          db.cops.getByProject(projectId),
          db.strings.getByProject(projectId),
          db.structs.getByProject(projectId),
          db.labels.getByProject(projectId),
          db.rewrites.getByProject(projectId),
          db.mnemonics.getByProject(projectId),
          db.overrides.getByProject(projectId),
        ])

        // Check for errors
        const results = [
          { name: 'files', result: filesResult },
          { name: 'blocks', result: blocksResult },
          { name: 'cops', result: copsResult },
          { name: 'strings', result: stringsResult },
          { name: 'structs', result: structsResult },
          { name: 'labels', result: labelsResult },
          { name: 'rewrites', result: rewritesResult },
          { name: 'mnemonics', result: mnemonicsResult },
          { name: 'overrides', result: overridesResult },
        ]

        const errorResult = results.find(r => r.result.error)
        if (errorResult) {
          throw new Error(`Failed to fetch ${errorResult.name}: ${errorResult.result.error.message}`)
        }

        // Update counts
        setCounts({
          files: filesResult.data?.length || 0,
          blocks: blocksResult.data?.length || 0,
          cops: copsResult.data?.length || 0,
          strings: stringsResult.data?.length || 0,
          structs: structsResult.data?.length || 0,
          labels: labelsResult.data?.length || 0,
          rewrites: rewritesResult.data?.length || 0,
          mnemonics: mnemonicsResult.data?.length || 0,
          overrides: overridesResult.data?.length || 0,
        })
      } catch (err) {
        console.error('Error fetching section counts:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch section counts')
      } finally {
        setLoading(false)
      }
    }

    fetchCounts()
  }, [projectId])

  return { counts, loading, error }
}
