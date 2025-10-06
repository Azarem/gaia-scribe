/**
 * Graphics Viewer Modal Component
 * 
 * Displays extracted SNES graphics files as rendered images on a canvas.
 * Supports zoom, pan, and export functionality.
 */

import { useEffect, useRef, useState } from 'react'
import Modal from './Modal'
import { Download, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'
import type { File as PrismaFile } from '@prisma/client'

interface GraphicsViewerModalProps {
  isOpen: boolean
  onClose: () => void
  file: PrismaFile | null
  imageData: ImageData | null
}

export default function GraphicsViewerModal({
  isOpen,
  onClose,
  file,
  imageData
}: GraphicsViewerModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [zoom, setZoom] = useState(2) // Default 2x zoom
  const [error, setError] = useState<string | null>(null)

  // Render image data to canvas
  useEffect(() => {
    if (!canvasRef.current || !imageData) return

    try {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        setError('Failed to get canvas context')
        return
      }

      // Set canvas size to match image data
      canvas.width = imageData.width
      canvas.height = imageData.height

      // Draw image data to canvas
      ctx.putImageData(imageData, 0, 0)

      setError(null)
    } catch (err) {
      console.error('Error rendering graphics:', err)
      setError(err instanceof Error ? err.message : 'Failed to render graphics')
    }
  }, [imageData])

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.5, 8))
  }

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.5, 0.5))
  }

  const handleResetZoom = () => {
    setZoom(2)
  }

  const handleExport = () => {
    if (!canvasRef.current) return

    try {
      // Convert canvas to blob and download
      canvasRef.current.toBlob((blob) => {
        if (!blob) {
          setError('Failed to export image')
          return
        }

        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `${file?.name || 'bitmap'}.png`
        link.click()
        URL.revokeObjectURL(url)
      })
    } catch (err) {
      console.error('Error exporting graphics:', err)
      setError(err instanceof Error ? err.message : 'Failed to export image')
    }
  }

  if (!file || !imageData) {
    return null
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Graphics Viewer - ${file.name}`}
      movable={true}
      resizable={true}
      transparentBackdrop={true}
      closeOnBackdropClick={false}
      initialSize={{ width: 600, height: 700 }}
    >
      <div className="p-6 space-y-4">
        {/* Error Display */}
        {error && (
          <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* File Information */}
        <div className="text-sm text-gray-600 space-y-1">
          <div><strong>File:</strong> {file.name}</div>
          <div><strong>Type:</strong> {file.type}</div>
          <div><strong>Location:</strong> 0x{file.location?.toString(16).toUpperCase().padStart(6, '0')}</div>
          <div><strong>Size:</strong> 0x{file.size?.toString(16).toUpperCase().padStart(4, '0')} ({file.size} bytes)</div>
          {file.compressed && <div className="text-orange-600"><strong>Compressed:</strong> Yes</div>}
          {file.group && <div><strong>Group:</strong> {file.group}</div>}
          {file.scene && <div><strong>Scene:</strong> {file.scene}</div>}
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between border-t border-b border-gray-200 py-2">
          <div className="flex items-center space-x-2">
            <button
              onClick={handleZoomOut}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
              title="Zoom Out"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium text-gray-700 min-w-[60px] text-center">
              {(zoom * 100).toFixed(0)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
              title="Zoom In"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <button
              onClick={handleResetZoom}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
              title="Reset Zoom"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>

          <button
            onClick={handleExport}
            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded"
          >
            <Download className="h-4 w-4 mr-1.5" />
            Export PNG
          </button>
        </div>

        {/* Canvas Container */}
        <div className="border border-gray-300 rounded bg-gray-100 overflow-auto" style={{ maxHeight: '500px' }}>
          <div className="p-4 inline-block">
            <canvas
              ref={canvasRef}
              className="border border-gray-400 bg-white"
              style={{
                imageRendering: 'pixelated',
                transform: `scale(${zoom})`,
                transformOrigin: 'top left',
                width: imageData.width,
                height: imageData.height
              }}
            />
          </div>
        </div>

        {/* Image Information */}
        <div className="text-xs text-gray-500 space-y-1">
          <div><strong>Image Size:</strong> {imageData.width} × {imageData.height} pixels</div>
          <div><strong>Format:</strong> SNES 4bpp (16 colors)</div>
          <div><strong>Tile Layout:</strong> 16 × 32 tiles (8×8 pixels each)</div>
        </div>
      </div>
    </Modal>
  )
}

