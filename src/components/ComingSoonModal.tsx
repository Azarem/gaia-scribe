import Modal from './Modal'
import { Construction, Clock } from 'lucide-react'

interface ComingSoonModalProps {
  isOpen: boolean
  onClose: () => void
  feature?: string
}

export default function ComingSoonModal({
  isOpen,
  onClose,
  feature = 'This feature',
}: ComingSoonModalProps) {
  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Coming Soon!" 
      className="max-w-sm"
    >
      <div className="p-6 text-center">
        <div className="mb-4">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <Construction className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          We're Working on It!
        </h3>
        
        <p className="text-gray-600 mb-6">
          {feature} is currently under development and will be available soon. 
          Stay tuned for updates!
        </p>
        
        <div className="flex items-center justify-center text-sm text-gray-500 mb-6">
          <Clock className="h-4 w-4 mr-2" />
          <span>Expected in a future release</span>
        </div>
        
        <button
          onClick={onClose}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          Got it
        </button>
      </div>
    </Modal>
  )
}

