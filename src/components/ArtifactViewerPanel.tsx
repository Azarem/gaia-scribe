import { useEffect, useCallback, useRef, useState } from 'react'
import { X, Code, AlertCircle, Loader, GripVertical } from 'lucide-react'
import clsx from 'clsx'
import { useArtifactViewerStore } from '../stores/artifact-viewer-store'
import { db } from '../lib/supabase'

export default function ArtifactViewerPanel() {
  const {
    isOpen,
    isLoading,
    error,
    width,
    temporaryWidth,
    minWidth,
    maxWidth,
    selectedBlock,
    artifact,
    closePanel,
    setTemporaryWidth,
    setFinalWidth,
    clearTemporaryWidth,
    setArtifact,
    setLoading,
    setError
  } = useArtifactViewerStore()

  const panelRef = useRef<HTMLDivElement>(null)
  const resizeHandleRef = useRef<HTMLDivElement>(null)
  const [isResizing, setIsResizing] = useState(false)
  const [dragIndicatorPosition, setDragIndicatorPosition] = useState<number | null>(null)

  // Load artifact when block is selected
  useEffect(() => {
    if (!selectedBlock || !isOpen) return

    const loadArtifact = async () => {
      try {
        setLoading(true)
        setError(null)

        const { data, error: fetchError } = await db.blockArtifacts.getByBlock(selectedBlock.id)

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
        console.error('Error loading artifact:', err)
        setError(err instanceof Error ? err.message : 'Failed to load artifact')
        setArtifact(null)
      }
    }

    loadArtifact()
  }, [selectedBlock, isOpen, setLoading, setError, setArtifact])

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        closePanel()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, closePanel])

  // Resize functionality with optimized performance
  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    event.preventDefault()
    setIsResizing(true)

    const startX = event.clientX
    const startWidth = width

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = startX - e.clientX // Inverted because we're resizing from the left
      const newWidth = startWidth + deltaX

      // Constrain the width within bounds for visual feedback
      const constrainedWidth = Math.max(
        minWidth,
        Math.min(newWidth, maxWidth)
      )

      // Use temporary width for smooth visual feedback without localStorage writes
      setTemporaryWidth(constrainedWidth)
      setDragIndicatorPosition(constrainedWidth)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      setDragIndicatorPosition(null)

      // Calculate final width
      const deltaX = startX - event.clientX
      const finalWidth = startWidth + deltaX

      // Set final width (this will save to localStorage)
      setFinalWidth(finalWidth)
      clearTemporaryWidth()

      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [width, minWidth, maxWidth, setTemporaryWidth, setFinalWidth, clearTemporaryWidth])

  // Calculate the current display width (use temporary width during dragging)
  const displayWidth = temporaryWidth !== null ? temporaryWidth : width

  return (
    <>
      {/* Visual drag indicator */}
      {isResizing && dragIndicatorPosition !== null && (
        <div
          className="fixed top-0 bottom-0 w-0.5 bg-blue-500 z-50 pointer-events-none"
          style={{
            right: `${dragIndicatorPosition}px`,
            opacity: 0.8
          }}
        />
      )}

      <div
        ref={panelRef}
        className={clsx(
          'h-screen bg-white shadow-2xl border-l border-gray-200',
          'flex-shrink-0 relative',
          // Only apply transition when not resizing for smooth performance
          !isResizing && 'transition-all duration-300 ease-in-out',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        style={{
          width: isOpen ? `${displayWidth}px` : '0px',
          overflow: isOpen ? 'auto' : 'hidden'
        }}
        role="complementary"
        aria-labelledby="artifact-viewer-title"
        aria-hidden={!isOpen}
      >
      {isOpen && (
        <>
          {/* Resize Handle */}
          <div
            ref={resizeHandleRef}
            className={clsx(
              'absolute left-0 top-0 w-1 h-full cursor-col-resize z-10',
              'hover:bg-blue-500 transition-colors duration-200',
              'group flex items-center justify-center',
              isResizing ? 'bg-blue-500' : 'bg-transparent hover:bg-blue-500/20'
            )}
            onMouseDown={handleMouseDown}
            title="Drag to resize panel"
          >
            <div className={clsx(
              'w-1 h-8 bg-gray-300 rounded-full opacity-0 group-hover:opacity-100 transition-opacity',
              isResizing ? 'opacity-100 bg-blue-500' : ''
            )} />
            <GripVertical className={clsx(
              'absolute w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity',
              isResizing ? 'opacity-100 text-blue-500' : ''
            )} />
          </div>

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-2">
            <Code className="h-5 w-5 text-gray-600" />
            <h2 id="artifact-viewer-title" className="text-lg font-semibold text-gray-900">
              {selectedBlock ? `Block: ${selectedBlock.name}` : 'Artifact Viewer'}
            </h2>
          </div>
          <button
            onClick={closePanel}
            className="p-1 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md"
            aria-label="Close artifact viewer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Loader className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
                <p className="text-gray-600">Loading artifact...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center p-6">
                <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Artifact</h3>
                <p className="text-red-600 mb-4">{error}</p>
                <button
                  onClick={() => {
                    if (selectedBlock) {
                      setError(null)
                      setLoading(true)
                      // Trigger reload by re-setting the selected block
                      const block = selectedBlock
                      useArtifactViewerStore.setState({ selectedBlock: null })
                      setTimeout(() => useArtifactViewerStore.setState({ selectedBlock: block }), 0)
                    }
                  }}
                  className="btn-primary"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : artifact ? (
            <div className="h-full overflow-auto p-4">
              <div className="space-y-4">
                {/* Artifact metadata */}
                <div className="flex items-center space-x-2 text-sm text-gray-600 pb-2 border-b border-gray-100">
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
                
                {/* Code content */}
                <div className="bg-gray-900 rounded-lg p-4 overflow-auto">
                  <pre className="text-green-400 font-mono text-sm whitespace-pre-wrap">
                    {artifact.content}
                  </pre>
                </div>
                
                {/* Statistics */}
                <div className="flex justify-between items-center text-xs text-gray-500 pt-2 border-t border-gray-100">
                  <span>{artifact.content.split('\n').length} lines</span>
                  <span>{artifact.content.length} characters</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center p-6">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
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
            </div>
          )}
        </div>
        </>
      )}
    </div>
    </>
  )
}
