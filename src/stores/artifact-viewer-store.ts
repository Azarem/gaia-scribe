import { create } from 'zustand'
import type { Block, BlockArtifact } from '@prisma/client'

export interface ArtifactViewerState {
  // Panel visibility and state
  isOpen: boolean
  isLoading: boolean
  error: string | null

  // Panel dimensions and position
  width: number
  temporaryWidth: number | null // Used during dragging for visual feedback
  minWidth: number
  maxWidth: number

  // Content state
  selectedBlock: Block | null
  artifact: BlockArtifact | null

  // Actions
  openPanel: (block: Block) => void
  closePanel: () => void
  setWidth: (width: number) => void
  setTemporaryWidth: (width: number) => void
  setFinalWidth: (width: number) => void
  clearTemporaryWidth: () => void
  setArtifact: (artifact: BlockArtifact | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void

  // Local storage persistence
  loadFromStorage: () => void
  saveToStorage: () => void
}

// Default panel width and constraints
const DEFAULT_WIDTH = 450
const MIN_WIDTH = 300
const MAX_WIDTH_PERCENTAGE = 0.8

// Local storage key
const STORAGE_KEY = 'artifact-viewer-preferences'

export const useArtifactViewerStore = create<ArtifactViewerState>((set, get) => ({
  // Initial state
  isOpen: false,
  isLoading: false,
  error: null,

  // Panel dimensions
  width: DEFAULT_WIDTH,
  temporaryWidth: null,
  minWidth: MIN_WIDTH,
  maxWidth: Math.floor(window.innerWidth * MAX_WIDTH_PERCENTAGE),

  // Content
  selectedBlock: null,
  artifact: null,
  
  // Actions
  openPanel: (block: Block) => {
    set({
      isOpen: true,
      selectedBlock: block,
      artifact: null,
      error: null,
      isLoading: true
    })
  },
  
  closePanel: () => {
    set({
      isOpen: false,
      selectedBlock: null,
      artifact: null,
      error: null,
      isLoading: false
    })
  },
  
  setWidth: (width: number) => {
    const state = get()
    const constrainedWidth = Math.max(
      state.minWidth,
      Math.min(width, state.maxWidth)
    )
    set({ width: constrainedWidth })

    // Save to localStorage
    get().saveToStorage()
  },

  setTemporaryWidth: (width: number) => {
    const state = get()
    const constrainedWidth = Math.max(
      state.minWidth,
      Math.min(width, state.maxWidth)
    )
    set({ temporaryWidth: constrainedWidth })
  },

  setFinalWidth: (width: number) => {
    const state = get()
    const constrainedWidth = Math.max(
      state.minWidth,
      Math.min(width, state.maxWidth)
    )
    set({
      width: constrainedWidth,
      temporaryWidth: null
    })

    // Save to localStorage only on final width change
    get().saveToStorage()
  },

  clearTemporaryWidth: () => {
    set({ temporaryWidth: null })
  },

  setArtifact: (artifact: BlockArtifact | null) => {
    set({ artifact, isLoading: false })
  },
  
  setLoading: (loading: boolean) => {
    set({ isLoading: loading })
  },
  
  setError: (error: string | null) => {
    set({ error, isLoading: false })
  },
  
  // Local storage persistence
  loadFromStorage: () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const preferences = JSON.parse(stored)
        const maxWidth = Math.floor(window.innerWidth * MAX_WIDTH_PERCENTAGE)
        
        set({
          width: Math.max(MIN_WIDTH, Math.min(preferences.width || DEFAULT_WIDTH, maxWidth)),
          maxWidth
        })
      }
    } catch (error) {
      console.warn('Failed to load artifact viewer preferences from localStorage:', error)
    }
  },
  
  saveToStorage: () => {
    try {
      const state = get()
      const preferences = {
        width: state.width
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
    } catch (error) {
      console.warn('Failed to save artifact viewer preferences to localStorage:', error)
    }
  }
}))

// Initialize from localStorage and handle window resize
if (typeof window !== 'undefined') {
  // Load preferences on initialization
  useArtifactViewerStore.getState().loadFromStorage()
  
  // Update max width on window resize
  const handleResize = () => {
    const state = useArtifactViewerStore.getState()
    const newMaxWidth = Math.floor(window.innerWidth * MAX_WIDTH_PERCENTAGE)
    
    useArtifactViewerStore.setState({
      maxWidth: newMaxWidth,
      width: Math.min(state.width, newMaxWidth)
    })
  }
  
  window.addEventListener('resize', handleResize)
}
