import { createHash, randomBytes } from 'crypto'

export type APIKeyScope =
  | 'leads:read'
  | 'leads:write'
  | 'icp:read'
  | 'analytics:read'

export const ALL_SCOPES: APIKeyScope[] = [
  'leads:read',
  'leads:write',
  'icp:read',
  'analytics:read',
]

export const SCOPE_DESCRIPTIONS: Record<APIKeyScope, string> = {
  'leads:read': 'Read leads data',
  'leads:write': 'Create, update, and archive leads',
  'icp:read': 'Read ICP criteria',
  'analytics:read': 'Read analytics data',
}

/**
 * Generates a new API key in the format: sk_live_<32 hex chars>
 * Returns both the full key (to show once) and the hash (to store)
 */
export function generateApiKey(environment: 'live' | 'test' = 'live'): {
  key: string
  keyHash: string
  keyPrefix: string
} {
  // Generate 32 random bytes and convert to hex
  const randomPart = randomBytes(16).toString('hex')
  const key = `sk_${environment}_${randomPart}`

  // Hash the full key for storage
  const keyHash = hashApiKey(key)

  // Store prefix for identification (first 16 chars)
  const keyPrefix = key.slice(0, 16)

  return { key, keyHash, keyPrefix }
}

/**
 * Hash an API key using SHA-256
 */
export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex')
}

/**
 * Verify an API key against a stored hash
 */
export function verifyApiKey(key: string, storedHash: string): boolean {
  const keyHash = hashApiKey(key)
  return keyHash === storedHash
}

/**
 * Parse an API key to extract its components
 */
export function parseApiKey(key: string): {
  isValid: boolean
  environment?: 'live' | 'test'
  prefix?: string
} {
  const pattern = /^sk_(live|test)_[a-f0-9]{32}$/

  if (!pattern.test(key)) {
    return { isValid: false }
  }

  const parts = key.split('_')
  return {
    isValid: true,
    environment: parts[1] as 'live' | 'test',
    prefix: key.slice(0, 16),
  }
}

/**
 * Mask an API key for display (show only prefix)
 * e.g., "sk_live_abc..." or using the stored prefix
 */
export function maskApiKey(keyPrefix: string): string {
  return `${keyPrefix}${'•'.repeat(20)}`
}

/**
 * Check if a scope is included in the list of scopes
 */
export function hasScope(scopes: string[], requiredScope: APIKeyScope): boolean {
  return scopes.includes(requiredScope)
}

/**
 * Check if the API key has any of the required scopes
 */
export function hasAnyScope(scopes: string[], requiredScopes: APIKeyScope[]): boolean {
  return requiredScopes.some(scope => scopes.includes(scope))
}

/**
 * Validate scopes array
 */
export function validateScopes(scopes: string[]): scopes is APIKeyScope[] {
  return scopes.every(scope => ALL_SCOPES.includes(scope as APIKeyScope))
}
