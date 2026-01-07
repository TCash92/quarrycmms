/**
 * Tests for error-classifier.ts
 *
 * Tests error classification for sync operations including:
 * - HTTP status extraction from various error formats
 * - Network, rate limit, auth, validation, timeout detection
 * - Full error classification with retry metadata
 */

import {
  extractHttpStatus,
  isNetworkError,
  isRateLimitError,
  isAuthError,
  isValidationError,
  isTimeoutError,
  classifyError,
  isRetryableError,
  getMaxRetries,
} from '@/services/sync/error-classifier';

describe('error-classifier', () => {
  describe('extractHttpStatus', () => {
    it('returns undefined for null/undefined', () => {
      expect(extractHttpStatus(null)).toBeUndefined();
      expect(extractHttpStatus(undefined)).toBeUndefined();
    });

    it('extracts status from direct status property', () => {
      expect(extractHttpStatus({ status: 404 })).toBe(404);
      expect(extractHttpStatus({ status: 500 })).toBe(500);
    });

    it('extracts status from response.status (axios-style)', () => {
      expect(extractHttpStatus({ response: { status: 401 } })).toBe(401);
      expect(extractHttpStatus({ response: { status: 503 } })).toBe(503);
    });

    it('extracts status from nested error.status', () => {
      expect(extractHttpStatus({ error: { status: 422 } })).toBe(422);
    });

    it('extracts status from PostgREST error codes', () => {
      expect(extractHttpStatus({ code: 'PGRST400' })).toBe(400);
      expect(extractHttpStatus({ code: 'PGRST404' })).toBe(404);
      expect(extractHttpStatus({ code: 'PGRST500' })).toBe(500);
    });

    it('ignores invalid PostgREST codes', () => {
      expect(extractHttpStatus({ code: 'PGRST200' })).toBeUndefined(); // < 300
      expect(extractHttpStatus({ code: 'PGRST100' })).toBeUndefined();
      expect(extractHttpStatus({ code: 'INVALID' })).toBeUndefined();
    });

    it('returns undefined for non-object types', () => {
      expect(extractHttpStatus('error string')).toBeUndefined();
      expect(extractHttpStatus(123)).toBeUndefined();
    });
  });

  describe('isNetworkError', () => {
    it('returns false for null/undefined', () => {
      expect(isNetworkError(null)).toBe(false);
      expect(isNetworkError(undefined)).toBe(false);
    });

    it('detects "network error" pattern', () => {
      expect(isNetworkError(new Error('Network error'))).toBe(true);
      expect(isNetworkError('Network failed')).toBe(true);
      expect(isNetworkError('Network unavailable')).toBe(true);
    });

    it('detects "fetch failed" pattern', () => {
      expect(isNetworkError(new Error('fetch failed'))).toBe(true);
      expect(isNetworkError('Fetch Failed: unable to connect')).toBe(true);
    });

    it('detects connection errors', () => {
      expect(isNetworkError('connection refused')).toBe(true);
      expect(isNetworkError('connection reset')).toBe(true);
      expect(isNetworkError('connection timeout')).toBe(true);
      expect(isNetworkError('connection failed')).toBe(true);
    });

    it('detects Node.js error codes', () => {
      expect(isNetworkError(new Error('ECONNREFUSED'))).toBe(true);
      expect(isNetworkError(new Error('ENOTFOUND'))).toBe(true);
      expect(isNetworkError(new Error('ETIMEDOUT'))).toBe(true);
      expect(isNetworkError('ERR_NETWORK')).toBe(true);
    });

    it('detects "no internet" and "offline" patterns', () => {
      expect(isNetworkError('no internet connection')).toBe(true);
      expect(isNetworkError('device is offline')).toBe(true);
    });

    it('detects "network request failed"', () => {
      expect(isNetworkError('Network request failed')).toBe(true);
    });

    it('detects DNS resolution failures', () => {
      expect(isNetworkError('unable to resolve host')).toBe(true);
    });

    it('returns false for unrelated errors', () => {
      expect(isNetworkError('user not found')).toBe(false);
      expect(isNetworkError(new Error('validation failed'))).toBe(false);
    });
  });

  describe('isRateLimitError', () => {
    it('returns false for null/undefined', () => {
      expect(isRateLimitError(null)).toBe(false);
      expect(isRateLimitError(undefined)).toBe(false);
    });

    it('detects HTTP 429 status', () => {
      expect(isRateLimitError({ status: 429 })).toBe(true);
      expect(isRateLimitError({ response: { status: 429 } })).toBe(true);
    });

    it('detects "rate limit" pattern', () => {
      expect(isRateLimitError('rate limit exceeded')).toBe(true);
      expect(isRateLimitError(new Error('Rate Limit'))).toBe(true);
    });

    it('detects "too many requests" pattern', () => {
      expect(isRateLimitError('Too many requests')).toBe(true);
    });

    it('detects "quota exceeded" pattern', () => {
      expect(isRateLimitError('quota exceeded')).toBe(true);
      expect(isRateLimitError('API Quota Exceeded')).toBe(true);
    });

    it('detects "throttle" pattern', () => {
      expect(isRateLimitError('request throttled')).toBe(true);
      expect(isRateLimitError('throttling in effect')).toBe(true);
    });

    it('returns false for unrelated errors', () => {
      expect(isRateLimitError('server error')).toBe(false);
      expect(isRateLimitError({ status: 500 })).toBe(false);
    });
  });

  describe('isAuthError', () => {
    it('returns false for null/undefined', () => {
      expect(isAuthError(null)).toBe(false);
      expect(isAuthError(undefined)).toBe(false);
    });

    it('detects HTTP 401 status', () => {
      expect(isAuthError({ status: 401 })).toBe(true);
      expect(isAuthError({ response: { status: 401 } })).toBe(true);
    });

    it('detects HTTP 403 status', () => {
      expect(isAuthError({ status: 403 })).toBe(true);
    });

    it('detects "unauthorized" pattern', () => {
      expect(isAuthError('Unauthorized')).toBe(true);
      expect(isAuthError(new Error('unauthorized access'))).toBe(true);
    });

    it('detects "unauthenticated" pattern', () => {
      expect(isAuthError('unauthenticated')).toBe(true);
    });

    it('detects "forbidden" pattern', () => {
      expect(isAuthError('Forbidden')).toBe(true);
    });

    it('detects invalid token/credentials/session patterns', () => {
      expect(isAuthError('invalid token')).toBe(true);
      expect(isAuthError('invalid credentials')).toBe(true);
      expect(isAuthError('invalid session')).toBe(true);
    });

    it('detects expired token/session patterns', () => {
      expect(isAuthError('expired token')).toBe(true);
      expect(isAuthError('expired session')).toBe(true);
    });

    it('detects JWT errors', () => {
      expect(isAuthError('JWT expired')).toBe(true);
      expect(isAuthError('JWT invalid')).toBe(true);
      expect(isAuthError('jwt malformed')).toBe(true);
    });

    it('detects "auth failed" pattern', () => {
      expect(isAuthError('authentication failed')).toBe(true);
      expect(isAuthError('auth check failed')).toBe(true);
    });

    it('detects "not logged in" pattern', () => {
      expect(isAuthError('not logged in')).toBe(true);
    });

    it('returns false for unrelated errors', () => {
      expect(isAuthError('network error')).toBe(false);
      expect(isAuthError({ status: 500 })).toBe(false);
    });
  });

  describe('isValidationError', () => {
    it('returns false for null/undefined', () => {
      expect(isValidationError(null)).toBe(false);
      expect(isValidationError(undefined)).toBe(false);
    });

    it('detects HTTP 400 status', () => {
      expect(isValidationError({ status: 400 })).toBe(true);
    });

    it('detects HTTP 422 status', () => {
      expect(isValidationError({ status: 422 })).toBe(true);
    });

    it('detects "validation error/failed" patterns', () => {
      expect(isValidationError('validation error')).toBe(true);
      expect(isValidationError('validation failed')).toBe(true);
    });

    it('detects "invalid input/data/field/value" patterns', () => {
      expect(isValidationError('invalid input')).toBe(true);
      expect(isValidationError('invalid data provided')).toBe(true);
      expect(isValidationError('invalid field value')).toBe(true);
      expect(isValidationError('invalid value for name')).toBe(true);
    });

    it('detects "required field" pattern', () => {
      expect(isValidationError('required field missing')).toBe(true);
    });

    it('detects "constraint violation" pattern', () => {
      expect(isValidationError('constraint violation')).toBe(true);
    });

    it('detects "type mismatch" pattern', () => {
      expect(isValidationError('type mismatch')).toBe(true);
    });

    it('detects "malformed" pattern', () => {
      expect(isValidationError('malformed request')).toBe(true);
    });

    it('detects "bad request" pattern', () => {
      expect(isValidationError('Bad Request')).toBe(true);
    });

    it('returns false for unrelated errors', () => {
      expect(isValidationError('server error')).toBe(false);
      expect(isValidationError({ status: 500 })).toBe(false);
    });
  });

  describe('isTimeoutError', () => {
    it('returns false for null/undefined', () => {
      expect(isTimeoutError(null)).toBe(false);
      expect(isTimeoutError(undefined)).toBe(false);
    });

    it('detects HTTP 408 status (Request Timeout)', () => {
      expect(isTimeoutError({ status: 408 })).toBe(true);
    });

    it('detects HTTP 504 status (Gateway Timeout)', () => {
      expect(isTimeoutError({ status: 504 })).toBe(true);
    });

    it('detects "timeout" pattern', () => {
      expect(isTimeoutError('timeout')).toBe(true);
      expect(isTimeoutError(new Error('Request timeout'))).toBe(true);
    });

    it('detects "timed out" pattern', () => {
      expect(isTimeoutError('connection timed out')).toBe(true);
    });

    it('detects "ETIMEDOUT" pattern', () => {
      expect(isTimeoutError('ETIMEDOUT')).toBe(true);
    });

    it('returns false for unrelated errors', () => {
      expect(isTimeoutError('server error')).toBe(false);
      expect(isTimeoutError({ status: 500 })).toBe(false);
    });
  });

  describe('classifyError', () => {
    describe('transient errors (shouldRetry: true)', () => {
      it('classifies network errors as transient with 10 max retries', () => {
        const result = classifyError(new Error('Network error'));
        expect(result.category).toBe('transient');
        expect(result.shouldRetry).toBe(true);
        expect(result.maxRetries).toBe(10);
        expect(result.requiresUserAction).toBe(false);
        expect(result.userMessage).toContain('Network');
      });

      it('classifies timeout errors as transient with 10 max retries', () => {
        const result = classifyError({ status: 504 });
        expect(result.category).toBe('transient');
        expect(result.shouldRetry).toBe(true);
        expect(result.maxRetries).toBe(10);
        expect(result.httpStatus).toBe(504);
      });

      it('classifies rate limit errors as transient with 5 max retries', () => {
        const result = classifyError({ status: 429 });
        expect(result.category).toBe('transient');
        expect(result.shouldRetry).toBe(true);
        expect(result.maxRetries).toBe(5);
        expect(result.httpStatus).toBe(429);
        expect(result.userMessage).toContain('busy');
      });

      it('classifies 503 Service Unavailable as transient', () => {
        const result = classifyError({ status: 503 });
        expect(result.category).toBe('transient');
        expect(result.shouldRetry).toBe(true);
        expect(result.maxRetries).toBe(10);
        expect(result.httpStatus).toBe(503);
        expect(result.userMessage).toContain('temporarily unavailable');
      });
    });

    describe('auth errors (requiresUserAction: true)', () => {
      it('classifies 401 as auth error requiring user action', () => {
        const result = classifyError({ status: 401 });
        expect(result.category).toBe('auth');
        expect(result.shouldRetry).toBe(false);
        expect(result.maxRetries).toBe(0);
        expect(result.requiresUserAction).toBe(true);
        expect(result.userMessage).toContain('sign in');
      });

      it('classifies 403 as auth error', () => {
        const result = classifyError({ status: 403 });
        expect(result.category).toBe('auth');
        expect(result.shouldRetry).toBe(false);
        expect(result.requiresUserAction).toBe(true);
      });

      it('classifies expired token as auth error', () => {
        const result = classifyError(new Error('JWT expired'));
        expect(result.category).toBe('auth');
        expect(result.shouldRetry).toBe(false);
        expect(result.requiresUserAction).toBe(true);
      });

      it('sets default httpStatus to 401 for pattern-matched auth errors', () => {
        const result = classifyError(new Error('unauthorized'));
        expect(result.httpStatus).toBe(401);
      });
    });

    describe('validation errors (no retry)', () => {
      it('classifies 400 as validation error', () => {
        const result = classifyError({ status: 400 });
        expect(result.category).toBe('validation');
        expect(result.shouldRetry).toBe(false);
        expect(result.maxRetries).toBe(0);
        expect(result.requiresUserAction).toBe(false);
        expect(result.userMessage).toContain('validation');
      });

      it('classifies 422 as validation error', () => {
        const result = classifyError({ status: 422 });
        expect(result.category).toBe('validation');
        expect(result.shouldRetry).toBe(false);
      });

      it('sets default httpStatus to 400 for pattern-matched validation errors', () => {
        const result = classifyError(new Error('invalid input'));
        expect(result.httpStatus).toBe(400);
      });
    });

    describe('permanent errors (no retry)', () => {
      it('classifies 404 as permanent error', () => {
        const result = classifyError({ status: 404 });
        expect(result.category).toBe('permanent');
        expect(result.shouldRetry).toBe(false);
        expect(result.maxRetries).toBe(0);
        expect(result.userMessage).toContain('not found');
      });

      it('classifies 500 as permanent error', () => {
        const result = classifyError({ status: 500 });
        expect(result.category).toBe('permanent');
        expect(result.shouldRetry).toBe(false);
        expect(result.userMessage).toContain('Server error');
      });

      it('classifies 502 as permanent error', () => {
        const result = classifyError({ status: 502 });
        expect(result.category).toBe('permanent');
        expect(result.shouldRetry).toBe(false);
      });
    });

    describe('unknown errors (conservative retry)', () => {
      it('classifies unrecognized errors as unknown with 3 max retries', () => {
        const result = classifyError(new Error('Something went wrong'));
        expect(result.category).toBe('unknown');
        expect(result.shouldRetry).toBe(true);
        expect(result.maxRetries).toBe(3);
        expect(result.requiresUserAction).toBe(false);
        expect(result.userMessage).toContain('unexpected error');
      });

      it('classifies empty error objects as unknown', () => {
        const result = classifyError({});
        expect(result.category).toBe('unknown');
        expect(result.shouldRetry).toBe(true);
      });
    });

    describe('originalError preservation', () => {
      it('preserves Error instance in originalError', () => {
        const error = new Error('test error');
        const result = classifyError(error);
        expect(result.originalError).toBe(error);
      });

      it('converts non-Error to string in originalError', () => {
        const result = classifyError({ status: 500, message: 'server error' });
        expect(result.originalError).toBe('server error');
      });
    });

    describe('technicalMessage extraction', () => {
      it('extracts message from Error instance', () => {
        const result = classifyError(new Error('detailed error'));
        expect(result.technicalMessage).toBe('detailed error');
      });

      it('uses string directly as technicalMessage', () => {
        const result = classifyError('error string');
        expect(result.technicalMessage).toBe('error string');
      });

      it('extracts message from object.message', () => {
        const result = classifyError({ message: 'object message' });
        expect(result.technicalMessage).toBe('object message');
      });

      it('extracts message from nested error.message', () => {
        const result = classifyError({ error: { message: 'nested message' } });
        expect(result.technicalMessage).toBe('nested message');
      });

      it('converts to string for unknown objects', () => {
        const result = classifyError({ some: 'data' });
        expect(result.technicalMessage).toBe('[object Object]');
      });

      it('returns "Unknown error" for null/undefined', () => {
        const result = classifyError(null);
        expect(result.technicalMessage).toBe('Unknown error');
      });
    });

    describe('priority of classification', () => {
      it('network error pattern takes priority when using Error instance', () => {
        // Network error via Error message - should be transient
        const error = new Error('Network error occurred');
        const result = classifyError(error);
        expect(result.category).toBe('transient');
      });

      it('HTTP status is used when object message is not accessible', () => {
        // Object with status 500 - isNetworkError won't detect message
        // because it uses String(error) not error.message for objects
        const error = { status: 500, message: 'Network error' };
        const result = classifyError(error);
        // Falls through to HTTP status classification
        expect(result.category).toBe('permanent');
        expect(result.httpStatus).toBe(500);
      });

      it('timeout takes priority over validation patterns', () => {
        const result = classifyError(new Error('request timeout with invalid data'));
        expect(result.category).toBe('transient');
      });

      it('rate limit detection uses message when status unavailable', () => {
        const result = classifyError(new Error('rate limit exceeded'));
        expect(result.category).toBe('transient');
        expect(result.httpStatus).toBe(429);
      });
    });
  });

  describe('isRetryableError', () => {
    it('returns true for transient errors', () => {
      expect(isRetryableError(new Error('Network error'))).toBe(true);
      expect(isRetryableError({ status: 429 })).toBe(true);
      expect(isRetryableError({ status: 503 })).toBe(true);
    });

    it('returns true for unknown errors', () => {
      expect(isRetryableError(new Error('Something happened'))).toBe(true);
    });

    it('returns false for auth errors', () => {
      expect(isRetryableError({ status: 401 })).toBe(false);
      expect(isRetryableError({ status: 403 })).toBe(false);
    });

    it('returns false for validation errors', () => {
      expect(isRetryableError({ status: 400 })).toBe(false);
      expect(isRetryableError({ status: 422 })).toBe(false);
    });

    it('returns false for permanent errors', () => {
      expect(isRetryableError({ status: 404 })).toBe(false);
      expect(isRetryableError({ status: 500 })).toBe(false);
    });
  });

  describe('getMaxRetries', () => {
    it('returns 10 for network/timeout errors', () => {
      expect(getMaxRetries(new Error('Network error'))).toBe(10);
      expect(getMaxRetries({ status: 504 })).toBe(10);
      expect(getMaxRetries({ status: 503 })).toBe(10);
    });

    it('returns 5 for rate limit errors', () => {
      expect(getMaxRetries({ status: 429 })).toBe(5);
    });

    it('returns 3 for unknown errors', () => {
      expect(getMaxRetries(new Error('Something'))).toBe(3);
    });

    it('returns 0 for non-retryable errors', () => {
      expect(getMaxRetries({ status: 401 })).toBe(0);
      expect(getMaxRetries({ status: 400 })).toBe(0);
      expect(getMaxRetries({ status: 404 })).toBe(0);
      expect(getMaxRetries({ status: 500 })).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('handles Error subclasses', () => {
      class CustomError extends Error {
        status = 429;
      }
      const error = new CustomError('rate limited');
      const result = classifyError(error);
      expect(result.category).toBe('transient');
    });

    it('handles Supabase error format', () => {
      const supabaseError = {
        message: 'JWT expired',
        status: 401,
        error: { message: 'Authentication required' },
      };
      const result = classifyError(supabaseError);
      expect(result.category).toBe('auth');
      expect(result.httpStatus).toBe(401);
    });

    it('handles PostgREST error format', () => {
      const postgrestError = {
        code: 'PGRST404',
        message: 'Row not found',
      };
      const result = classifyError(postgrestError);
      expect(result.category).toBe('permanent');
      expect(result.httpStatus).toBe(404);
    });

    it('handles axios-style error format', () => {
      const axiosError = {
        response: {
          status: 503,
          data: { message: 'Service unavailable' },
        },
        message: 'Request failed with status code 503',
      };
      const result = classifyError(axiosError);
      expect(result.category).toBe('transient');
      expect(result.httpStatus).toBe(503);
    });
  });
});
