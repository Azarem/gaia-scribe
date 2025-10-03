#!/usr/bin/env node

/**
 * Build-time validation script to ensure security settings are correct
 * This script should be run before production builds to catch configuration errors
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function validateBuildConfiguration() {
  console.log('🔍 Validating build configuration...')

  // Check if .env file exists and read it
  const envPath = path.join(process.cwd(), '.env')
  let envContent = ''
  
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8')
  }

  // Check for anonymous mode in environment variables
  const hasAnonymousMode = envContent.includes('VITE_ENABLE_ANONYMOUS_MODE=true') ||
                          process.env.VITE_ENABLE_ANONYMOUS_MODE === 'true'

  // Check if this is a production build
  const isProduction = process.env.NODE_ENV === 'production' || 
                      process.env.VITE_MODE === 'production' ||
                      process.argv.includes('--mode=production')

  if (isProduction && hasAnonymousMode) {
    console.error('🚨 CRITICAL SECURITY ERROR 🚨')
    console.error('Anonymous mode is enabled for a production build!')
    console.error('This would bypass all authentication in production.')
    console.error('')
    console.error('To fix this:')
    console.error('1. Set VITE_ENABLE_ANONYMOUS_MODE=false in .env')
    console.error('2. Or remove VITE_ENABLE_ANONYMOUS_MODE entirely')
    console.error('3. Or ensure NODE_ENV is not set to production for development builds')
    console.error('')
    process.exit(1)
  }

  if (hasAnonymousMode) {
    console.warn('⚠️  Anonymous mode is enabled (development only)')
    console.warn('   This should NEVER be used in production')
  }

  // Check for required environment variables
  const requiredVars = [
    'VITE_PUBLIC_SUPABASE_URL',
    'VITE_PUBLIC_SUPABASE_ANON_KEY'
  ]

  const missingVars = requiredVars.filter(varName => {
    const hasInEnv = envContent.includes(`${varName}=`)
    const hasInProcess = process.env[varName]
    return !hasInEnv && !hasInProcess
  })

  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:')
    missingVars.forEach(varName => {
      console.error(`   - ${varName}`)
    })
    console.error('')
    console.error('Please add these variables to your .env file')
    process.exit(1)
  }

  console.log('✅ Build configuration validation passed')
  
  if (isProduction) {
    console.log('🔒 Production build: Authentication will be required')
  } else {
    console.log('🛠️  Development build: Check authentication settings')
  }
}

// Run validation
try {
  validateBuildConfiguration()
} catch (error) {
  console.error('❌ Build validation failed:', error.message)
  process.exit(1)
}
