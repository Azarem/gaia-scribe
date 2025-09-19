import { AlertTriangle, ExternalLink } from 'lucide-react'

interface ConfigurationErrorProps {
  title?: string
  message?: string
  showEnvironmentInfo?: boolean
}

export default function ConfigurationError({ 
  title = "Configuration Error",
  message = "The application is not properly configured.",
  showEnvironmentInfo = true
}: ConfigurationErrorProps) {
  const supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL
  const hasAnonKey = !!import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY
  
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center mb-4">
          <AlertTriangle className="h-8 w-8 text-red-500 mr-3" />
          <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
        </div>
        
        <p className="text-gray-600 mb-6">{message}</p>
        
        {showEnvironmentInfo && (
          <div className="bg-gray-50 rounded-md p-4 mb-6">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Environment Status:</h3>
            <ul className="text-sm space-y-1">
              <li className="flex items-center">
                <span className={`inline-block w-2 h-2 rounded-full mr-2 ${supabaseUrl ? 'bg-green-500' : 'bg-red-500'}`}></span>
                Supabase URL: {supabaseUrl ? 'Configured' : 'Missing'}
              </li>
              <li className="flex items-center">
                <span className={`inline-block w-2 h-2 rounded-full mr-2 ${hasAnonKey ? 'bg-green-500' : 'bg-red-500'}`}></span>
                Supabase Key: {hasAnonKey ? 'Configured' : 'Missing'}
              </li>
            </ul>
          </div>
        )}
        
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            This usually means the Supabase environment variables are not set correctly.
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <p className="text-sm text-blue-800 font-medium mb-1">For Developers:</p>
            <p className="text-xs text-blue-700">
              Ensure <code>VITE_PUBLIC_SUPABASE_URL</code> and <code>VITE_PUBLIC_SUPABASE_ANON_KEY</code> are set in your environment.
            </p>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
            <p className="text-sm text-yellow-800 font-medium mb-1">For Production:</p>
            <p className="text-xs text-yellow-700">
              Check that Repository Variables are configured in GitHub Settings.
            </p>
          </div>
          
          <a 
            href="https://github.com/Azarem/gaia-scribe/blob/main/docs/DEPLOYMENT.md"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
          >
            View Deployment Documentation
            <ExternalLink className="h-3 w-3 ml-1" />
          </a>
        </div>
      </div>
    </div>
  )
}
