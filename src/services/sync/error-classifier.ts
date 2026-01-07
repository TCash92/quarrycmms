/**
 * Error classifier for sync operations
 *
 * Classifies errors to determine appropriate retry behavior.
 * Different error types require different handling strategies.
 *
 * @module services/sync/error-classifier
 */

/**
 * Error category types
 */
export type ErrorCategory =
  | 'transient' // Network issues, rate limits - should retry
  | 'auth' // Authentication/authorization - user action needed
  | 'validation' // Invalid data - won't succeed on retry
  | 'permanent' // Server errors, not found - won't succeed
  | 'unknown'; // Cannot classify - conservative retry

/**
 * Classified error with retry metadata
 */
export interface ClassifiedError {
  /** Error category */
  category: ErrorCategory;
  /** Original error object or message */
  originalError: Error | string;
  /** HTTP status code if available */
  httpStatus?: number;
  /** Whether this error should be retried */
  shouldRetry: boolean;
  /** Maximum retry attempts for this error type */
  maxRetries: number;
  /** Whether user action is required to resolve */
  requiresUserAction: boolean;
  /** User-friendly error message */
  userMessage: string;
  /** Technical details for logging */
  technicalMessage: string;
}

/**
 * Error classification matrix
 *
 * | HTTP Status | Category | Retry | Max Retries |
 * |-------------|----------|-------|-------------|
 * | Network timeout | transient | Yes | 10 |
 * | 429 Rate Limit | transient | Yes | 5 |
 * | 503 Service Unavailable | transient | Yes | 10 |
 * | 401/403 | auth | No | 0 |
 * | 400/422 | validation | No | 0 |
 * | 404/500 | permanent | No | 0 |
 */

/**
 * Extract HTTP status code from various error formats
 *
 * @param error - Error object or message
 * @returns HTTP status code or undefined
 */
export function extractHttpStatus(error: unknown): number | undefined {
  if (!error) return undefined;

  // Direct status property
  if (typeof error === 'object' && error !== null) {
    const err = error as Record<string, unknown>;

    // Supabase error format
    if (typeof err.status === 'number') {
      return err.status;
    }

    // Response object
    if (err.response && typeof err.response === 'object') {
      const response = err.response as Record<string, unknown>;
      if (typeof response.status === 'number') {
        return response.status;
      }
    }

    // Nested error
    if (err.error && typeof err.error === 'object') {
      const nested = err.error as Record<string, unknown>;
      if (typeof nested.status === 'number') {
        return nested.status;
      }
    }

    // Code property (Supabase PostgREST)
    if (typeof err.code === 'string') {
      const codeMatch = err.code.match(/^PGRST(\d+)$/);
      if (codeMatch) {
        // PostgREST error codes map to HTTP statuses
        const pgrstCode = parseInt(codeMatch[1], 10);
        if (pgrstCode >= 300 && pgrstCode < 600) {
          return pgrstCode;
        }
      }
    }
  }

  return undefined;
}

/**
 * Check if error is a network-related error
 *
 * @param error - Error object or message
 * @returns true if network error
 */
export function isNetworkError(error: unknown): boolean {
  if (!error) return false;

  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : String(error);

  const networkPatterns = [
    /network\s*(error|failed|unavailable)/i,
    /fetch\s*failed/i,
    /connection\s*(refused|reset|timeout|failed)/i,
    /ECONNREFUSED/i,
    /ENOTFOUND/i,
    /ETIMEDOUT/i,
    /ERR_NETWORK/i,
    /no\s*internet/i,
    /offline/i,
    /network\s*request\s*failed/i,
    /unable\s*to\s*resolve\s*host/i,
  ];

  return networkPatterns.some((pattern) => pattern.test(message));
}

/**
 * Check if error is a rate limit error
 *
 * @param error - Error object or message
 * @returns true if rate limit error
 */
export function isRateLimitError(error: unknown): boolean {
  const status = extractHttpStatus(error);
  if (status === 429) return true;

  if (!error) return false;

  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : String(error);

  const rateLimitPatterns = [
    /rate\s*limit/i,
    /too\s*many\s*requests/i,
    /quota\s*exceeded/i,
    /throttl/i,
  ];

  return rateLimitPatterns.some((pattern) => pattern.test(message));
}

/**
 * Check if error is an authentication error
 *
 * @param error - Error object or message
 * @returns true if auth error
 */
export function isAuthError(error: unknown): boolean {
  const status = extractHttpStatus(error);
  if (status === 401 || status === 403) return true;

  if (!error) return false;

  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : String(error);

  const authPatterns = [
    /unauthorized/i,
    /unauthenticated/i,
    /forbidden/i,
    /invalid\s*(token|credentials|session)/i,
    /expired\s*(token|session)/i,
    /jwt\s*(expired|invalid|malformed)/i,
    /auth.*failed/i,
    /not\s*logged\s*in/i,
  ];

  return authPatterns.some((pattern) => pattern.test(message));
}

/**
 * Check if error is a validation error
 *
 * @param error - Error object or message
 * @returns true if validation error
 */
export function isValidationError(error: unknown): boolean {
  const status = extractHttpStatus(error);
  if (status === 400 || status === 422) return true;

  if (!error) return false;

  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : String(error);

  const validationPatterns = [
    /validation\s*(error|failed)/i,
    /invalid\s*(input|data|field|value)/i,
    /required\s*field/i,
    /constraint\s*violation/i,
    /type\s*mismatch/i,
    /malformed/i,
    /bad\s*request/i,
  ];

  return validationPatterns.some((pattern) => pattern.test(message));
}

/**
 * Check if error is a timeout error
 *
 * @param error - Error object or message
 * @returns true if timeout error
 */
export function isTimeoutError(error: unknown): boolean {
  const status = extractHttpStatus(error);
  if (status === 408 || status === 504) return true;

  if (!error) return false;

  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : String(error);

  const timeoutPatterns = [/timeout/i, /timed\s*out/i, /ETIMEDOUT/i];

  return timeoutPatterns.some((pattern) => pattern.test(message));
}

/**
 * Get error message from various error formats
 *
 * @param error - Error object or message
 * @returns Error message string
 */
function getErrorMessage(error: unknown): string {
  if (!error) return 'Unknown error';

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (typeof error === 'object') {
    const err = error as Record<string, unknown>;
    if (typeof err.message === 'string') {
      return err.message;
    }
    if (typeof err.error === 'string') {
      return err.error;
    }
    if (
      typeof err.error === 'object' &&
      err.error &&
      typeof (err.error as Record<string, unknown>).message === 'string'
    ) {
      return (err.error as Record<string, unknown>).message as string;
    }
  }

  return String(error);
}

/**
 * Classify an error and determine retry behavior
 *
 * @param error - Error to classify
 * @returns Classified error with retry metadata
 *
 * @example
 * ```typescript
 * try {
 *   await syncRecord(record);
 * } catch (error) {
 *   const classified = classifyError(error);
 *   if (classified.shouldRetry) {
 *     await enqueueForRetry(record, classified.maxRetries);
 *   } else if (classified.requiresUserAction) {
 *     showErrorToUser(classified.userMessage);
 *   }
 * }
 * ```
 */
export function classifyError(error: unknown): ClassifiedError {
  const technicalMessage = getErrorMessage(error);
  const httpStatus = extractHttpStatus(error);

  // Network errors - transient, should retry
  if (isNetworkError(error) || isTimeoutError(error)) {
    return {
      category: 'transient',
      originalError: error instanceof Error ? error : technicalMessage,
      httpStatus,
      shouldRetry: true,
      maxRetries: 10,
      requiresUserAction: false,
      userMessage: 'Network connection issue. Will retry automatically.',
      technicalMessage,
    };
  }

  // Rate limit - transient, should retry with backoff
  if (isRateLimitError(error)) {
    return {
      category: 'transient',
      originalError: error instanceof Error ? error : technicalMessage,
      httpStatus: httpStatus ?? 429,
      shouldRetry: true,
      maxRetries: 5,
      requiresUserAction: false,
      userMessage: 'Server is busy. Will retry automatically.',
      technicalMessage,
    };
  }

  // Auth errors - user action required
  if (isAuthError(error)) {
    return {
      category: 'auth',
      originalError: error instanceof Error ? error : technicalMessage,
      httpStatus: httpStatus ?? 401,
      shouldRetry: false,
      maxRetries: 0,
      requiresUserAction: true,
      userMessage: 'Please sign in again to continue syncing.',
      technicalMessage,
    };
  }

  // Validation errors - won't succeed on retry
  if (isValidationError(error)) {
    return {
      category: 'validation',
      originalError: error instanceof Error ? error : technicalMessage,
      httpStatus: httpStatus ?? 400,
      shouldRetry: false,
      maxRetries: 0,
      requiresUserAction: false,
      userMessage: 'Data validation failed. This record cannot be synced.',
      technicalMessage,
    };
  }

  // HTTP status based classification
  if (httpStatus) {
    // 5xx server errors
    if (httpStatus >= 500 && httpStatus < 600) {
      // 503 is transient (service unavailable)
      if (httpStatus === 503) {
        return {
          category: 'transient',
          originalError: error instanceof Error ? error : technicalMessage,
          httpStatus,
          shouldRetry: true,
          maxRetries: 10,
          requiresUserAction: false,
          userMessage: 'Server temporarily unavailable. Will retry automatically.',
          technicalMessage,
        };
      }

      // Other 5xx are permanent
      return {
        category: 'permanent',
        originalError: error instanceof Error ? error : technicalMessage,
        httpStatus,
        shouldRetry: false,
        maxRetries: 0,
        requiresUserAction: false,
        userMessage: 'Server error. Please contact support if this persists.',
        technicalMessage,
      };
    }

    // 404 not found
    if (httpStatus === 404) {
      return {
        category: 'permanent',
        originalError: error instanceof Error ? error : technicalMessage,
        httpStatus,
        shouldRetry: false,
        maxRetries: 0,
        requiresUserAction: false,
        userMessage: 'Resource not found on server.',
        technicalMessage,
      };
    }
  }

  // Unknown error - conservative approach with limited retries
  return {
    category: 'unknown',
    originalError: error instanceof Error ? error : technicalMessage,
    httpStatus,
    shouldRetry: true,
    maxRetries: 3,
    requiresUserAction: false,
    userMessage: 'An unexpected error occurred. Will retry automatically.',
    technicalMessage,
  };
}

/**
 * Check if an error is retryable
 *
 * @param error - Error to check
 * @returns true if error should be retried
 */
export function isRetryableError(error: unknown): boolean {
  return classifyError(error).shouldRetry;
}

/**
 * Get the maximum retry count for an error
 *
 * @param error - Error to check
 * @returns Maximum number of retries
 */
export function getMaxRetries(error: unknown): number {
  return classifyError(error).maxRetries;
}
