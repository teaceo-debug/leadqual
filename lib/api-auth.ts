import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { hashApiKey, type APIKeyScope } from '@/lib/api-keys'

export interface AuthenticatedRequest {
  organization_id: string
  api_key_id: string
  scopes: APIKeyScope[]
  rate_limit: number
}

export interface AuthError {
  code: string
  message: string
  status: number
}

/**
 * Authenticate an API request using Bearer token
 * Returns the authenticated context or an error
 */
export async function authenticateApiKey(
  request: NextRequest
): Promise<{ auth: AuthenticatedRequest } | { error: AuthError }> {
  // Extract the Bearer token from Authorization header
  const authHeader = request.headers.get('authorization')

  if (!authHeader) {
    return {
      error: {
        code: 'missing_authorization',
        message: 'Authorization header is required',
        status: 401,
      },
    }
  }

  if (!authHeader.startsWith('Bearer ')) {
    return {
      error: {
        code: 'invalid_authorization',
        message: 'Authorization header must use Bearer scheme',
        status: 401,
      },
    }
  }

  const apiKey = authHeader.slice(7) // Remove 'Bearer ' prefix

  // Validate key format
  const keyPattern = /^sk_(live|test)_[a-f0-9]{32}$/
  if (!keyPattern.test(apiKey)) {
    return {
      error: {
        code: 'invalid_api_key',
        message: 'Invalid API key format',
        status: 401,
      },
    }
  }

  // Hash the key to look it up
  const keyHash = hashApiKey(apiKey)

  // Look up the key in the database
  const adminClient = createAdminClient()

  const { data: keyRecord, error } = await adminClient
    .from('api_keys')
    .select('id, organization_id, scopes, rate_limit, is_active, expires_at, revoked_at')
    .eq('key_hash', keyHash)
    .single()

  if (error || !keyRecord) {
    return {
      error: {
        code: 'invalid_api_key',
        message: 'Invalid API key',
        status: 401,
      },
    }
  }

  // Check if key is revoked
  if (keyRecord.revoked_at) {
    return {
      error: {
        code: 'api_key_revoked',
        message: 'This API key has been revoked',
        status: 401,
      },
    }
  }

  // Check if key is active
  if (!keyRecord.is_active) {
    return {
      error: {
        code: 'api_key_inactive',
        message: 'This API key is inactive',
        status: 401,
      },
    }
  }

  // Check if key is expired
  if (keyRecord.expires_at && new Date(keyRecord.expires_at) < new Date()) {
    return {
      error: {
        code: 'api_key_expired',
        message: 'This API key has expired',
        status: 401,
      },
    }
  }

  // Update last_used_at (fire and forget)
  void adminClient
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', keyRecord.id)

  return {
    auth: {
      organization_id: keyRecord.organization_id,
      api_key_id: keyRecord.id,
      scopes: keyRecord.scopes as APIKeyScope[],
      rate_limit: keyRecord.rate_limit,
    },
  }
}

/**
 * Check if the authenticated request has the required scope
 */
export function requireScope(
  auth: AuthenticatedRequest,
  scope: APIKeyScope
): AuthError | null {
  if (!auth.scopes.includes(scope)) {
    return {
      code: 'insufficient_scope',
      message: `This API key does not have the required scope: ${scope}`,
      status: 403,
    }
  }
  return null
}

/**
 * Log API usage to the database
 */
export async function logApiUsage(
  apiKeyId: string,
  organizationId: string,
  endpoint: string,
  method: string,
  statusCode: number,
  responseTimeMs: number,
  request: NextRequest
): Promise<void> {
  const adminClient = createAdminClient()

  const ipAddress =
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    null

  const userAgent = request.headers.get('user-agent') || null

  // Fire and forget - don't block the response
  void adminClient
    .from('api_usage')
    .insert({
      api_key_id: apiKeyId,
      organization_id: organizationId,
      endpoint,
      method,
      status_code: statusCode,
      response_time_ms: responseTimeMs,
      ip_address: ipAddress,
      user_agent: userAgent,
    })
}

/**
 * Helper to create error response
 */
export function createApiError(error: AuthError): {
  error: { code: string; message: string }
} {
  return {
    error: {
      code: error.code,
      message: error.message,
    },
  }
}
