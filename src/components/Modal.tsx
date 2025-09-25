import { ReactNode, useEffect, useState, useRef, useCallback } from 'react'
import { X } from 'lucide-react'
import clsx from 'clsx'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
  className?: string
  showCloseButton?: boolean
  closeOnBackdropClick?: boolean
  // Enhanced functionality props
  movable?: boolean
  resizable?: boolean
  transparentBackdrop?: boolean
  initialPosition?: { x: number; y: number }
  initialSize?: { width: number; height: number }
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  className,
  showCloseButton = true,
  closeOnBackdropClick = true,
  movable = false,
  resizable = false,
  transparentBackdrop = false,
  initialPosition,
  initialSize,
}: ModalProps) {
  // State for position and size
  const [position, setPosition] = useState(() => {
    if (initialPosition) return initialPosition
    // Default to center of screen
    return { x: window.innerWidth / 2 - 300, y: window.innerHeight / 2 - 200 }
  })

  const [size, setSize] = useState(() => {
    if (initialSize) return initialSize
    return { width: 600, height: 400 }
  })

  // Drag and resize state
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [resizeHandle, setResizeHandle] = useState<string | null>(null)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [initialMousePos, setInitialMousePos] = useState({ x: 0, y: 0 })
  const [resizeAnchor, setResizeAnchor] = useState({ x: 0, y: 0, width: 0, height: 0 })

  // Refs
  const modalRef = useRef<HTMLDivElement>(null)

  // Drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!movable) return
    e.preventDefault()
    setIsDragging(true)
    setDragStart({ x: position.x, y: position.y })
    setInitialMousePos({ x: e.clientX, y: e.clientY })
  }, [movable, position])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging && movable) {
      const deltaX = e.clientX - initialMousePos.x
      const deltaY = e.clientY - initialMousePos.y
      const newX = Math.max(0, Math.min(window.innerWidth - size.width, dragStart.x + deltaX))
      const newY = Math.max(0, Math.min(window.innerHeight - size.height, dragStart.y + deltaY))
      setPosition({ x: newX, y: newY })
    } else if (isResizing && resizable && resizeHandle) {
      // Calculate new dimensions based on mouse position relative to anchor point
      const mouseX = e.clientX
      const mouseY = e.clientY

      let newWidth = resizeAnchor.width
      let newHeight = resizeAnchor.height
      let newX = resizeAnchor.x
      let newY = resizeAnchor.y

      // Calculate new dimensions based on resize handle and anchor point
      if (resizeHandle.includes('e')) {
        // Right edge: anchor is left edge, width grows/shrinks based on mouse X
        newWidth = Math.max(200, mouseX - resizeAnchor.x)
      }
      if (resizeHandle.includes('w')) {
        // Left edge: anchor is right edge, position and width change
        const rightEdge = resizeAnchor.x + resizeAnchor.width
        newX = Math.min(mouseX, rightEdge - 200) // Don't let it go past min width
        newWidth = Math.max(200, rightEdge - newX)
      }
      if (resizeHandle.includes('s')) {
        // Bottom edge: anchor is top edge, height grows/shrinks based on mouse Y
        newHeight = Math.max(150, mouseY - resizeAnchor.y)
      }
      if (resizeHandle.includes('n')) {
        // Top edge: anchor is bottom edge, position and height change
        const bottomEdge = resizeAnchor.y + resizeAnchor.height
        newY = Math.min(mouseY, bottomEdge - 150) // Don't let it go past min height
        newHeight = Math.max(150, bottomEdge - newY)
      }

      // Ensure modal stays within viewport bounds
      newX = Math.max(0, Math.min(window.innerWidth - newWidth, newX))
      newY = Math.max(0, Math.min(window.innerHeight - newHeight, newY))

      setSize({ width: newWidth, height: newHeight })
      setPosition({ x: newX, y: newY })
    }
  }, [isDragging, isResizing, movable, resizable, resizeHandle, initialMousePos, dragStart, size, position, resizeAnchor])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    setIsResizing(false)
    setResizeHandle(null)
  }, [])

  // Resize handlers
  const handleResizeMouseDown = useCallback((e: React.MouseEvent, handle: string) => {
    if (!resizable) return
    e.preventDefault()
    e.stopPropagation()
    setIsResizing(true)
    setResizeHandle(handle)
    setInitialMousePos({ x: e.clientX, y: e.clientY })

    // Set anchor point based on resize handle - opposite corner/edge remains fixed
    let anchorX = position.x
    let anchorY = position.y

    // For handles that include 'e' (east/right), anchor to the left edge
    if (handle.includes('e')) {
      anchorX = position.x // Left edge stays fixed
    }
    // For handles that include 'w' (west/left), anchor to the right edge
    if (handle.includes('w')) {
      anchorX = position.x + size.width // Right edge stays fixed
    }
    // For handles that include 's' (south/bottom), anchor to the top edge
    if (handle.includes('s')) {
      anchorY = position.y // Top edge stays fixed
    }
    // For handles that include 'n' (north/top), anchor to the bottom edge
    if (handle.includes('n')) {
      anchorY = position.y + size.height // Bottom edge stays fixed
    }

    setResizeAnchor({
      x: anchorX,
      y: anchorY,
      width: size.width,
      height: size.height
    })
  }, [resizable, position, size])

  // Handle escape key press
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // Mouse event listeners for drag and resize
  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)

      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp])

  // Prevent body scroll when modal is open (only for non-transparent backdrop)
  useEffect(() => {
    if (isOpen && !transparentBackdrop) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, transparentBackdrop])

  if (!isOpen) return null

  const handleBackdropClick = (event: React.MouseEvent) => {
    // Disable backdrop click when transparent backdrop is enabled
    if (closeOnBackdropClick && !transparentBackdrop && event.target === event.currentTarget) {
      onClose()
    }
  }

  // Resize handles component
  const ResizeHandles = () => {
    if (!resizable) return null

    const handles = [
      { name: 'nw', cursor: 'nw-resize', className: 'top-0 left-0 -translate-x-1/2 -translate-y-1/2' },
      { name: 'n', cursor: 'n-resize', className: 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2' },
      { name: 'ne', cursor: 'ne-resize', className: 'top-0 right-0 translate-x-1/2 -translate-y-1/2' },
      { name: 'e', cursor: 'e-resize', className: 'top-1/2 right-0 translate-x-1/2 -translate-y-1/2' },
      { name: 'se', cursor: 'se-resize', className: 'bottom-0 right-0 translate-x-1/2 translate-y-1/2' },
      { name: 's', cursor: 's-resize', className: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2' },
      { name: 'sw', cursor: 'sw-resize', className: 'bottom-0 left-0 -translate-x-1/2 translate-y-1/2' },
      { name: 'w', cursor: 'w-resize', className: 'top-1/2 left-0 -translate-x-1/2 -translate-y-1/2' },
    ]

    return (
      <>
        {handles.map((handle) => (
          <div
            key={handle.name}
            className={clsx(
              'absolute w-3 h-3 bg-blue-500 border border-white rounded-sm opacity-0 hover:opacity-100 transition-opacity z-10',
              handle.className
            )}
            style={{ cursor: handle.cursor }}
            onMouseDown={(e) => handleResizeMouseDown(e, handle.name)}
          />
        ))}
      </>
    )
  }

  return (
    <div
      className={clsx(
        'fixed inset-0 z-50',
        transparentBackdrop ? 'pointer-events-none' : 'flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm'
      )}
      onClick={handleBackdropClick}
      style={transparentBackdrop ? { pointerEvents: 'none' } : undefined}
    >
      <div
        ref={modalRef}
        className={clsx(
          'relative bg-white rounded-lg shadow-xl overflow-hidden',
          movable || resizable ? 'absolute' : 'w-full max-w-lg max-h-[95vh]',
          transparentBackdrop ? 'pointer-events-auto' : '',
          className
        )}
        style={
          movable || resizable
            ? {
                left: position.x,
                top: position.y,
                width: size.width,
                height: size.height,
                maxHeight: '95vh',
                ...(transparentBackdrop ? { pointerEvents: 'auto' } : {})
              }
            : transparentBackdrop ? { pointerEvents: 'auto' } : undefined
        }
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Resize handles */}
        <ResizeHandles />

        {/* Header */}
        <div
          className={clsx(
            'flex items-center justify-between p-6 border-b border-gray-200',
            movable ? 'cursor-move' : ''
          )}
          onMouseDown={handleMouseDown}
        >
          <h2
            id="modal-title"
            className="text-lg font-semibold text-gray-900 select-none"
          >
            {title}
          </h2>
          {showCloseButton && (
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md"
              aria-label="Close modal"
              onMouseDown={(e) => e.stopPropagation()} // Prevent drag when clicking close button
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div
          className={clsx(
            'overflow-y-auto',
            movable || resizable
              ? 'h-[calc(100%-theme(spacing.24))]'
              : 'max-h-[calc(95vh-theme(spacing.24))]'
          )}
        >
          {children}
        </div>
      </div>
    </div>
  )
}

// Pre-styled modal variants for common use cases
export function AlertModal({
  isOpen,
  onClose,
  title,
  message,
  confirmLabel = 'OK',
  showCancel = false,
  cancelLabel = 'Cancel',
  onConfirm,
  variant = 'info',
}: {
  isOpen: boolean
  onClose: () => void
  title: string
  message: string
  confirmLabel?: string
  showCancel?: boolean
  cancelLabel?: string
  onConfirm?: () => void
  variant?: 'info' | 'warning' | 'error' | 'success'
}) {

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} className="max-w-sm">
      <div className="p-6">
        <p className="text-gray-600 mb-6">{message}</p>
        <div className="flex space-x-3 justify-end">
          {showCancel && (
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {cancelLabel}
            </button>
          )}
          <button
            onClick={onConfirm || onClose}
            className={clsx(
              'px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2',
              variant === 'error' ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  )
}
