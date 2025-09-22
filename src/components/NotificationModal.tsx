import Modal from './Modal'
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react'

interface NotificationModalProps {
  isOpen: boolean
  onClose: () => void
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
  details?: string[]
  showRetry?: boolean
  onRetry?: () => void
}

export default function NotificationModal({
  isOpen,
  onClose,
  type,
  title,
  message,
  details,
  showRetry = false,
  onRetry
}: NotificationModalProps) {
  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-8 w-8 text-green-600" />
      case 'error':
        return <XCircle className="h-8 w-8 text-red-600" />
      case 'warning':
        return <AlertTriangle className="h-8 w-8 text-yellow-600" />
      case 'info':
        return <Info className="h-8 w-8 text-blue-600" />
    }
  }

  const getColors = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          text: 'text-green-800',
          button: 'bg-green-600 hover:bg-green-700'
        }
      case 'error':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-800',
          button: 'bg-red-600 hover:bg-red-700'
        }
      case 'warning':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          text: 'text-yellow-800',
          button: 'bg-yellow-600 hover:bg-yellow-700'
        }
      case 'info':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          text: 'text-blue-800',
          button: 'bg-blue-600 hover:bg-blue-700'
        }
    }
  }

  const colors = getColors()

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={title}
      className="max-w-lg"
    >
      <div className="p-6">
        <div className={`rounded-lg p-4 ${colors.bg} ${colors.border} border`}>
          <div className="flex items-start">
            <div className="flex-shrink-0">
              {getIcon()}
            </div>
            <div className="ml-3 flex-1">
              <h3 className={`text-lg font-medium ${colors.text}`}>
                {title}
              </h3>
              <div className={`mt-2 text-sm ${colors.text}`}>
                <p>{message}</p>
                
                {details && details.length > 0 && (
                  <div className="mt-3">
                    <p className="font-medium">Details:</p>
                    <ul className="mt-1 list-disc list-inside space-y-1">
                      {details.map((detail, index) => (
                        <li key={index} className="text-xs">
                          {detail}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          {showRetry && onRetry && (
            <button
              onClick={onRetry}
              className={`px-4 py-2 text-sm font-medium text-white rounded-md ${colors.button} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-opacity-50`}
            >
              Retry
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {showRetry ? 'Cancel' : 'Close'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
