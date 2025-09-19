import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth-store'
import { Wifi, WifiOff, AlertTriangle } from 'lucide-react'

export default function ConnectionStatus() {
  const { session } = useAuthStore()
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting' | 'error'>('connecting')
  const [lastError, setLastError] = useState<string | null>(null)

  useEffect(() => {
    if (!session) {
      setConnectionStatus('disconnected')
      return
    }

    // Monitor realtime connection status
    const channel = supabase.channel('connection-test')
    
    const handleConnectionChange = (status: string, err?: any) => {
      console.log('Connection status changed:', status, err)
      
      switch (status) {
        case 'SUBSCRIBED':
          setConnectionStatus('connected')
          setLastError(null)
          break
        case 'CHANNEL_ERROR':
          setConnectionStatus('error')
          setLastError(err?.message || 'Connection error')
          break
        case 'CLOSED':
          setConnectionStatus('disconnected')
          break
        default:
          setConnectionStatus('connecting')
      }
    }

    // Set up connection monitoring
    channel.subscribe(handleConnectionChange)

    // Cleanup
    return () => {
      supabase.removeChannel(channel)
    }
  }, [session])

  // Don't show anything if connected
  if (connectionStatus === 'connected') {
    return null
  }

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Wifi className="h-4 w-4 text-green-500" />
      case 'connecting':
        return <Wifi className="h-4 w-4 text-yellow-500 animate-pulse" />
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      case 'disconnected':
      default:
        return <WifiOff className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Connected'
      case 'connecting':
        return 'Connecting...'
      case 'error':
        return `Connection Error${lastError ? `: ${lastError}` : ''}`
      case 'disconnected':
      default:
        return 'Disconnected'
    }
  }

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'bg-green-50 border-green-200 text-green-800'
      case 'connecting':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800'
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800'
      case 'disconnected':
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800'
    }
  }

  return (
    <div className={`flex items-center space-x-2 px-3 py-2 rounded-md border text-sm ${getStatusColor()}`}>
      {getStatusIcon()}
      <span>{getStatusText()}</span>
    </div>
  )
}
