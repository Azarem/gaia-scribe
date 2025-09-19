import { useAuthStore } from '../stores/auth-store'
import { AlertCircle, RefreshCw } from 'lucide-react'

export default function UserSyncStatus() {
  const { syncError, retryUserSync } = useAuthStore()

  if (!syncError) {
    return null
  }

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <AlertCircle className="h-5 w-5 text-yellow-400" />
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-yellow-800">
            User Sync Issue
          </h3>
          <div className="mt-2 text-sm text-yellow-700">
            <p>
              There was an issue syncing your user profile to the database. 
              Some features may not work correctly until this is resolved.
            </p>
            <p className="mt-1 text-xs text-yellow-600">
              Error: {syncError}
            </p>
          </div>
          <div className="mt-4">
            <button
              type="button"
              onClick={retryUserSync}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-yellow-800 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry Sync
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
