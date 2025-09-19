/**
 * JWT Utilities with proper base64url decoding
 * 
 * JWT tokens use base64url encoding, not standard base64.
 * This utility provides cross-platform JWT decoding without relying on atob().
 */

/**
 * Decode base64url string to regular string
 * JWT tokens use base64url encoding which is different from standard base64:
 * - Uses '-' instead of '+'
 * - Uses '_' instead of '/'
 * - No padding ('=')
 */
function base64urlDecode(str: string): string {
  // Convert base64url to standard base64
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  
  // Add padding if needed
  const padding = base64.length % 4
  if (padding) {
    base64 += '='.repeat(4 - padding)
  }
  
  // Use built-in base64 decoding
  try {
    // Try browser atob first
    if (typeof atob !== 'undefined') {
      return atob(base64)
    }
    
    // Fallback for Node.js or other environments
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(base64, 'base64').toString('utf-8')
    }
    
    // Manual base64 decoding as last resort
    return manualBase64Decode(base64)
  } catch (error) {
    throw new Error(`Failed to decode base64url string: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Manual base64 decoding implementation for environments without atob/Buffer
 */
function manualBase64Decode(base64: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  let result = ''
  let i = 0
  
  // Remove padding
  base64 = base64.replace(/=+$/, '')
  
  while (i < base64.length) {
    const encoded1 = chars.indexOf(base64[i++])
    const encoded2 = chars.indexOf(base64[i++])
    const encoded3 = chars.indexOf(base64[i++])
    const encoded4 = chars.indexOf(base64[i++])
    
    const bitmap = (encoded1 << 18) | (encoded2 << 12) | (encoded3 << 6) | encoded4
    
    result += String.fromCharCode((bitmap >> 16) & 255)
    if (encoded3 !== 64) result += String.fromCharCode((bitmap >> 8) & 255)
    if (encoded4 !== 64) result += String.fromCharCode(bitmap & 255)
  }
  
  return result
}

/**
 * Decode JWT token and return header and payload
 */
export function decodeJWT(token: string): {
  header: any
  payload: any
  signature: string
  raw: {
    header: string
    payload: string
    signature: string
  }
} {
  if (!token || typeof token !== 'string') {
    throw new Error('Invalid JWT token: must be a non-empty string')
  }
  
  const parts = token.split('.')
  if (parts.length !== 3) {
    throw new Error(`Invalid JWT token: expected 3 parts, got ${parts.length}`)
  }
  
  const [headerPart, payloadPart, signaturePart] = parts
  
  try {
    // Decode header
    const headerJson = base64urlDecode(headerPart)
    const header = JSON.parse(headerJson)
    
    // Decode payload
    const payloadJson = base64urlDecode(payloadPart)
    const payload = JSON.parse(payloadJson)
    
    return {
      header,
      payload,
      signature: signaturePart,
      raw: {
        header: headerPart,
        payload: payloadPart,
        signature: signaturePart
      }
    }
  } catch (error) {
    throw new Error(`Failed to decode JWT token: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Extract user information from JWT payload
 */
export function extractUserFromJWT(token: string): {
  userId: string
  email: string
  role: string
  exp: number
  iat: number
  aud: string
  iss: string
} {
  const { payload } = decodeJWT(token)
  
  return {
    userId: payload.sub || payload.user_id,
    email: payload.email,
    role: payload.role,
    exp: payload.exp,
    iat: payload.iat,
    aud: payload.aud,
    iss: payload.iss,
  }
}

/**
 * Check if JWT token is expired
 */
export function isJWTExpired(token: string): boolean {
  try {
    const { payload } = decodeJWT(token)
    const now = Math.floor(Date.now() / 1000)
    return payload.exp < now
  } catch {
    return true // If we can't decode it, consider it expired
  }
}

/**
 * Validate JWT token structure and basic claims
 */
export function validateJWT(token: string): {
  valid: boolean
  errors: string[]
  claims?: any
} {
  const errors: string[] = []
  
  try {
    const { header, payload } = decodeJWT(token)
    
    // Check required header fields
    if (!header.alg) errors.push('Missing algorithm in header')
    if (!header.typ || header.typ !== 'JWT') errors.push('Invalid or missing token type')
    
    // Check required payload fields
    if (!payload.sub) errors.push('Missing subject (sub) claim')
    if (!payload.aud) errors.push('Missing audience (aud) claim')
    if (!payload.iss) errors.push('Missing issuer (iss) claim')
    if (!payload.exp) errors.push('Missing expiration (exp) claim')
    if (!payload.iat) errors.push('Missing issued at (iat) claim')
    
    // Check if token is expired
    if (isJWTExpired(token)) errors.push('Token is expired')
    
    return {
      valid: errors.length === 0,
      errors,
      claims: { header, payload }
    }
  } catch (error) {
    errors.push(`Failed to decode token: ${error instanceof Error ? error.message : String(error)}`)
    return {
      valid: false,
      errors
    }
  }
}
