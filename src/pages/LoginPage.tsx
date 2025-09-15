import { useState } from 'react'
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { signInWithEmail, signInWithGitHub } from '../lib/supabase'
import { Github, Mail, Lock } from 'lucide-react'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button 
      type="submit" 
      disabled={pending}
      className="btn-primary w-full"
    >
      {pending ? 'Signing in...' : 'Sign in with Email'}
    </button>
  )
}

export default function LoginPage() {
  const [emailError, setEmailError] = useState<string | null>(null)

  const [error, submitAction] = useActionState(
    async (_previousState: string | null, formData: FormData) => {
      const email = formData.get('email') as string
      const password = formData.get('password') as string
      
      if (!email || !password) {
        return 'Please fill in all fields'
      }

      const { error } = await signInWithEmail(email, password)
      if (error) {
        return error.message
      }
      
      return null
    },
    null,
  )

  const handleGitHubSignIn = async () => {
    const { error } = await signInWithGitHub()
    if (error) {
      setEmailError(error.message)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Welcome to Scribe
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Collaborative game database editor
          </p>
        </div>
        
        <div className="bg-white py-8 px-6 shadow rounded-lg sm:px-10">
          <div className="space-y-6">
            {/* GitHub Login */}
            <div>
              <button
                onClick={handleGitHubSignIn}
                className="w-full flex justify-center items-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Github className="h-5 w-5 mr-2" />
                Continue with GitHub
              </button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with email</span>
              </div>
            </div>

            {/* Email Login Form */}
            <form action={submitAction} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <div className="mt-1 relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="input pl-10"
                    placeholder="Enter your email"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <div className="mt-1 relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    className="input pl-10"
                    placeholder="Enter your password"
                  />
                </div>
              </div>

              {(error || emailError) && (
                <div className="rounded-md bg-red-50 p-4">
                  <div className="text-sm text-red-700">
                    {error || emailError}
                  </div>
                </div>
              )}

              <div>
                <SubmitButton />
              </div>
            </form>

            <div className="text-xs text-gray-500 text-center">
              Don't have an account? Just sign in - accounts are created automatically!
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
