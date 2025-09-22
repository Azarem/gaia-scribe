import { useState, useEffect } from 'react'
import Modal from './Modal'
import { Code, AlertCircle, Loader } from 'lucide-react'
import { db } from '../lib/supabase'
import type { Block, BlockArtifact } from '@prisma/client'

interface BlockArtifactModalProps {
  isOpen: boolean
  onClose: () => void
  block: Block | null
}

export default function BlockArtifactModal({
  isOpen,
  onClose,
  block
}: BlockArtifactModalProps) {
  const [artifact, setArtifact] = useState<BlockArtifact | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load artifact when modal opens and block changes
  useEffect(() => {
    if (isOpen && block) {
      loadArtifact()
    } else {
      setArtifact(null)
      setError(null)
    }
  }, [isOpen, block])

  const loadArtifact = async () => {
    if (!block) return

    setLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await db.blockArtifacts.getByBlock(block.id)
      
      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          // No artifact found
          setArtifact(null)
        } else {
          throw fetchError
        }
      } else {
        setArtifact(data)
      }
    } catch (err) {
      console.error('Error loading block artifact:', err)
      setError(err instanceof Error ? err.message : 'Failed to load artifact')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setArtifact(null)
    setError(null)
    onClose()
  }

  if (!block) return null

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose} 
      title={`Block: ${block.name}`}
      className="max-w-4xl"
    >
      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader className="h-6 w-6 animate-spin text-blue-600 mr-2" />
            <span className="text-gray-600">Loading artifact...</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-8">
            <AlertCircle className="h-6 w-6 text-red-600 mr-2" />
            <span className="text-red-600">Error: {error}</span>
          </div>
        ) : artifact ? (
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Code className="h-4 w-4" />
              <span>Generated Assembly Code</span>
              <span className="text-gray-400">•</span>
              <span>Created: {new Date(artifact.createdAt).toLocaleString()}</span>
              {artifact.updatedAt && artifact.updatedAt !== artifact.createdAt && (
                <>
                  <span className="text-gray-400">•</span>
                  <span>Updated: {new Date(artifact.updatedAt).toLocaleString()}</span>
                </>
              )}
            </div>
            
            <div className="bg-gray-900 rounded-lg p-4 overflow-auto max-h-96">
              <pre className="text-green-400 font-mono text-sm whitespace-pre-wrap">
                {artifact.content}
              </pre>
            </div>
            
            <div className="flex justify-between items-center text-xs text-gray-500">
              <span>{artifact.content.split('\n').length} lines</span>
              <span>{artifact.content.length} characters</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Build Artifact Available
            </h3>
            <p className="text-gray-600 mb-4">
              This block hasn't been built yet. Please build the project first to generate assembly code.
            </p>
            <div className="text-sm text-gray-500">
              Click the "Build" button in the blocks section to generate artifacts for all blocks.
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
