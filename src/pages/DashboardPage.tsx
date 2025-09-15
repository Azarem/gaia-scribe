import { useAuthStore } from '../stores/auth-store'
import { signOut } from '../lib/supabase'
import { LogOut, User, Folder, Settings } from 'lucide-react'

export default function DashboardPage() {
  const { user } = useAuthStore()

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-3xl font-bold text-gray-900">Scribe</h1>
              <span className="ml-3 text-sm text-gray-500">Game Database Editor</span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5 text-gray-400" />
                <span className="text-sm text-gray-700">
                  {user?.email || user?.user_metadata?.full_name || 'User'}
                </span>
              </div>
              <button
                onClick={handleSignOut}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-500 bg-white hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="border-4 border-dashed border-gray-200 rounded-lg p-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Welcome to Scribe!
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                Your collaborative game database editor is ready to use.
              </p>
              
              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
                <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer">
                  <Folder className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Projects</h3>
                  <p className="text-sm text-gray-500">
                    Create and manage your game database projects
                  </p>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer">
                  <User className="h-12 w-12 text-green-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Collaboration</h3>
                  <p className="text-sm text-gray-500">
                    Work together with your team in real-time
                  </p>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer">
                  <Settings className="h-12 w-12 text-purple-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Settings</h3>
                  <p className="text-sm text-gray-500">
                    Configure your workspace and preferences
                  </p>
                </div>
              </div>
              
              <div className="mt-8">
                <p className="text-sm text-gray-500">
                  Ready to start? The roadmap for full functionality is documented in the README.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

